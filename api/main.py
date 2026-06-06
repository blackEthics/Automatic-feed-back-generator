"""
api/main.py
-----------
FastAPI essay scoring service.

Run from the project root:
  uvicorn api.main:app --reload

Endpoints:
  POST /score   – score an essay
  GET  /health  – liveness check
"""

import datetime
import io
import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional

import pypdf
import docx
from dotenv import load_dotenv
from fastapi import Cookie, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from api.auth import (
    create_jwt_token,
    exchange_code_for_token,
    get_google_auth_url,
    get_google_user_info,
    verify_jwt_token,
)
from api.database import EssayHistory, User, get_db, init_db
from utils.feedback import generate_feedback
from utils.improver import improve_essay
from utils.scoring import RUBRIC, score_essay

load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ── Validation limits ─────────────────────────────────────────────────────────
MIN_WORDS = 20
MAX_WORDS = 2000

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Essay Scoring API",
    description="Automated essay scoring using rubric-based NLP analysis.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_db()


# ── Request / Response schemas ────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    essay_text: str
    prompt_name: Optional[str] = None

    @validator("essay_text")
    def essay_text_must_not_be_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("essay_text cannot be empty or whitespace.")
        return v


class ImproveRequest(BaseModel):
    essay_text: str
    prompt_name: Optional[str] = "General"
    score_result: Optional[Dict[str, Any]] = None

    @validator("essay_text")
    def essay_text_must_not_be_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("essay_text cannot be empty or whitespace.")
        return v


class HistorySaveRequest(BaseModel):
    essay_text: str
    topic: str = ""
    score_data: Dict[str, Any] = {}
    improvement_data: Optional[Dict[str, Any]] = None


class DimensionScore(BaseModel):
    score: float
    max: int


class FeedbackResult(BaseModel):
    overall: str
    priority: str
    specific_tips: List[str]


class ScoreResponse(BaseModel):
    overall_score: float
    asap_score: float
    dimensions: Dict[str, DimensionScore]
    feedback: FeedbackResult
    word_count: int
    processing_time_ms: float


# ── Auth helpers ──────────────────────────────────────────────────────────────

def get_current_user(token: str = Cookie(None, alias="essayai_token")) -> dict | None:
    if not token:
        return None
    return verify_jwt_token(token)


# ── Core endpoints ────────────────────────────────────────────────────────────

@app.get("/health", summary="Liveness check")
def health():
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse, summary="Score an essay")
def score(request: ScoreRequest):
    """
    Score an essay across five rubric dimensions and return actionable feedback.

    - **essay_text**: the student's essay (20–2000 words)
    - **prompt_name**: optional prompt topic used to compute relevance
    """
    text = request.essay_text.strip()
    words = text.split()
    word_count = len(words)

    if word_count < MIN_WORDS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Essay is too short: {word_count} word(s) submitted, "
                f"minimum is {MIN_WORDS}."
            ),
        )
    if word_count > MAX_WORDS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Essay is too long: {word_count} words submitted, "
                f"maximum is {MAX_WORDS}."
            ),
        )

    t0 = time.perf_counter()
    score_result = score_essay(text, prompt_name=request.prompt_name)
    feedback_result = generate_feedback(score_result)
    processing_time_ms = round((time.perf_counter() - t0) * 1000, 2)

    dimensions = {
        dim: DimensionScore(score=score_result[dim], max=info["max"])
        for dim, info in RUBRIC.items()
    }

    return ScoreResponse(
        overall_score=score_result["total_score"],
        asap_score=score_result["normalized_score"],
        dimensions=dimensions,
        feedback=FeedbackResult(
            overall=feedback_result["overall"],
            priority=feedback_result["priority"],
            specific_tips=feedback_result["specific_tips"],
        ),
        word_count=word_count,
        processing_time_ms=processing_time_ms,
    )


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.get("/auth/login")
def auth_login():
    return {"url": get_google_auth_url()}


@app.get("/auth/callback")
async def auth_callback(code: str, db: Session = Depends(get_db)):
    token_data = await exchange_code_for_token(code)
    access_token = token_data.get("access_token")
    user_info = await get_google_user_info(access_token)

    google_id = user_info.get("id")
    user = db.query(User).filter(User.id == google_id).first()

    if not user:
        user = User(
            id=google_id,
            email=user_info.get("email"),
            name=user_info.get("name"),
            picture=user_info.get("picture"),
        )
        db.add(user)
    else:
        user.last_login = datetime.datetime.utcnow()
    db.commit()

    jwt_token = create_jwt_token({
        "id": google_id,
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "picture": user_info.get("picture", ""),
    })

    response = RedirectResponse(url=f"{FRONTEND_URL}?login=success")
    response.set_cookie(
        "essayai_token",
        jwt_token,
        httponly=False,
        max_age=7 * 24 * 3600,
        samesite="lax",
    )
    return response


@app.get("/auth/me")
def auth_me(
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user),
):
    if not current_user:
        return {"user": None}
    user = db.query(User).filter(User.id == current_user["sub"]).first()
    if not user:
        return {"user": None}
    return {"user": {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "total_essays": user.total_essays,
    }}


@app.post("/auth/logout")
def auth_logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("essayai_token")
    return response


# ── History endpoints ─────────────────────────────────────────────────────────

@app.post("/history/save")
def history_save(
    body: HistorySaveRequest,
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    imp = body.improvement_data
    entry = EssayHistory(
        id=str(uuid.uuid4()),
        user_id=current_user["sub"],
        topic=body.topic,
        essay_preview=body.essay_text[:150],
        word_count=len(body.essay_text.split()),
        overall_score=body.score_data.get("overall_score", 0),
        asap_grade=body.score_data.get("asap_score", 0),
        dimensions=json.dumps(body.score_data.get("dimensions", {})),
        feedback=json.dumps(body.score_data.get("feedback", {})),
        has_improvement=imp is not None,
        improvement_summary=json.dumps(imp.get("summary")) if imp else None,
        score_before=imp.get("score_before", {}).get("overall_score") if imp else None,
        score_after=imp.get("score_after", {}).get("overall_score") if imp else None,
    )
    db.add(entry)

    user = db.query(User).filter(User.id == current_user["sub"]).first()
    if user:
        user.total_essays = (user.total_essays or 0) + 1

    db.commit()
    return {"id": entry.id}


@app.get("/history/list")
def history_list(
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    entries = (
        db.query(EssayHistory)
        .filter(EssayHistory.user_id == current_user["sub"])
        .order_by(EssayHistory.date.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "date": e.date.isoformat(),
            "topic": e.topic,
            "essay_preview": e.essay_preview,
            "word_count": e.word_count,
            "overall_score": e.overall_score,
            "asap_grade": e.asap_grade,
            "dimensions": json.loads(e.dimensions) if e.dimensions else {},
            "feedback": json.loads(e.feedback) if e.feedback else {},
            "has_improvement": e.has_improvement,
            "improvement_summary": json.loads(e.improvement_summary) if e.improvement_summary else None,
            "score_before": e.score_before,
            "score_after": e.score_after,
        }
        for e in entries
    ]


@app.delete("/history/{entry_id}")
def history_delete(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    entry = db.query(EssayHistory).filter(
        EssayHistory.id == entry_id,
        EssayHistory.user_id == current_user["sub"],
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"deleted": True}


# ── File upload endpoint ──────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post("/upload-file", summary="Extract text from an uploaded file")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload .txt, .pdf, or .docx",
        )

    content = await file.read()

    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")

    if ext == ".txt":
        text = content.decode("utf-8", errors="ignore")
    elif ext == ".pdf":
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"
    else:  # .docx
        doc = docx.Document(io.BytesIO(content))
        text = "\n".join(
            para.text for para in doc.paragraphs if para.text.strip()
        )

    word_count = len(text.split())
    if word_count < 20:
        raise HTTPException(
            status_code=400,
            detail="Could not extract enough text from file. Please check the file content.",
        )

    return {
        "filename": filename,
        "file_type": ext,
        "extracted_text": text,
        "word_count": word_count,
        "char_count": len(text),
    }


# ── /improve ──────────────────────────────────────────────────────────────────

def _format_score(raw: dict) -> dict:
    """Convert score_essay() flat result or /score API response to a uniform shape."""
    if "dimensions" in raw:
        return {
            "overall_score": raw.get("overall_score", raw.get("total_score", 0)),
            "asap_score":    raw.get("asap_score",    raw.get("normalized_score", 0)),
            "dimensions":    raw["dimensions"],
        }
    return {
        "overall_score": raw.get("total_score", 0),
        "asap_score":    raw.get("normalized_score", 0),
        "dimensions": {
            dim: {"score": raw.get(dim, 0), "max": info["max"]}
            for dim, info in RUBRIC.items()
        },
    }


@app.post("/improve", summary="Improve an essay")
def improve(request: ImproveRequest):
    """
    Apply rule-based improvements to an essay and return before/after scores.

    - **essay_text**: the student's essay (min 20 words)
    - **prompt_name**: optional topic used for relevance scoring
    - **score_result**: optional pre-computed score (from /score); computed if omitted
    """
    text = request.essay_text.strip()
    word_count = len(text.split())

    if word_count < MIN_WORDS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Essay is too short: {word_count} word(s) submitted, "
                f"minimum is {MIN_WORDS}."
            ),
        )

    raw_before = request.score_result or score_essay(text, prompt_name=request.prompt_name)
    improvement = improve_essay(text, raw_before)
    improved_text = improvement["improved_text"]
    raw_after = score_essay(improved_text, prompt_name=request.prompt_name)

    return {
        "original_text": text,
        "improved_text": improved_text,
        "changes":       improvement["changes"],
        "summary":       improvement["summary"],
        "score_before":  _format_score(raw_before),
        "score_after":   _format_score(raw_after),
    }
