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

import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator

from utils.scoring import score_essay, RUBRIC
from utils.feedback import generate_feedback
from utils.improver import improve_essay

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# ── Endpoints ─────────────────────────────────────────────────────────────────

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
