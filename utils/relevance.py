"""
relevance.py
------------
Topic-relevance analysis using sentence-transformer embeddings.

Approach:
  1. Encode the essay with all-MiniLM-L6-v2 (384-dim dense vector)
  2. Encode the reference text (source text or fallback topic description)
  3. Compute cosine similarity

The model is loaded once and reused across calls.

Why all-MiniLM-L6-v2?
  - Only 22M parameters → fast inference on CPU
  - Strong semantic similarity performance
  - No GPU required

Rubric contribution: 25 points

Run directly to test:
  python utils/relevance.py
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ── Lazy model loading ────────────────────────────────────────────────────────
_model = None
MODEL_NAME = "all-MiniLM-L6-v2"


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print(f"[INFO] Loading sentence-transformer model: {MODEL_NAME}")
            _model = SentenceTransformer(MODEL_NAME)
        except Exception as e:
            print(f"[WARN] sentence-transformers unavailable ({e}). Relevance will use length proxy.")
            _model = False
    return _model if _model else None


# ── Fallback topic descriptions ───────────────────────────────────────────────
# Used when no source text is available in the dataset row.
TOPIC_DESCRIPTIONS = {
    "Exploring Venus": (
        "NASA exploring Venus planet space science research challenges "
        "blimp hovering atmosphere heat pressure silicon carbide electronics"
    ),
    "Driverless cars": (
        "autonomous self-driving cars technology safety transportation "
        "future benefits risks accidents pedestrians regulation"
    ),
    "Facial action coding system": (
        "facial action coding system FACS emotions technology computers "
        "classroom students biometric recognition surveillance"
    ),
    "The Face on Mars": (
        "Face Mars NASA natural landform geology aliens space exploration "
        "Cydonia mountain shadows camera photograph"
    ),
    '"A Cowboy Who Rode the Waves"': (
        "surfing cowboy Miki Dora waves ocean sport culture lifestyle California"
    ),
    "Does the electoral college work?": (
        "electoral college voting election president democracy reform "
        "United States popular vote winner"
    ),
    "Car-free cities": (
        "car free cities transportation urban planning environment "
        "pollution walking cycling public transit"
    ),
}


# ──────────────────────────────────────────────────────────────────────────────
# Core function
# ──────────────────────────────────────────────────────────────────────────────

def _encode(texts):
    """Return embeddings matrix for a list of texts."""
    model = _get_model()
    # Truncate to ~400 words to stay within model's practical context window
    truncated = [" ".join(t.split()[:400]) for t in texts]
    return model.encode(truncated, show_progress_bar=False)


def compute_relevance_score(essay_text, source_text=None, prompt_name=None, max_score=25):
    """
    Compute the relevance of *essay_text* to its topic.

    Priority for reference text:
      1. source_text  (from dataset column source_text_1, if non-empty)
      2. Fallback topic description keyed by prompt_name
      3. Length-based proxy when neither is available

    Similarity mapping (cosine sim → score):
      ≥ 0.60  → full score
      0.30–0.60 → interpolated mid-range
      0.10–0.30 → lower range
       < 0.10  → near-zero (likely off-topic)

    Parameters
    ----------
    essay_text  : str
    source_text : str | None
    prompt_name : str | None
    max_score   : int  (default 25)

    Returns
    -------
    (float score,  float similarity)  – similarity is -1.0 for the length proxy
    """
    if not essay_text or len(essay_text.split()) < 5:
        return 0.0, 0.0

    # Choose reference
    if source_text and len(source_text.strip()) > 50:
        reference = source_text
    elif prompt_name and prompt_name in TOPIC_DESCRIPTIONS:
        reference = TOPIC_DESCRIPTIONS[prompt_name]
    else:
        # No reference available – use word count as a very rough proxy
        wc = len(essay_text.split())
        proxy_score = round(min(max_score, (wc / 300) * max_score * 0.6), 2)
        return proxy_score, -1.0

    model = _get_model()
    if model is None:
        # No model – same length proxy
        wc = len(essay_text.split())
        return round(min(max_score, (wc / 300) * max_score * 0.6), 2), -1.0

    emb = _encode([essay_text, reference])
    sim = float(cosine_similarity([emb[0]], [emb[1]])[0][0])

    # Map similarity to [0, 1]
    if sim >= 0.60:
        norm = 1.00
    elif sim >= 0.30:
        norm = 0.60 + (sim - 0.30) / 0.30 * 0.40
    elif sim >= 0.10:
        norm = 0.20 + (sim - 0.10) / 0.20 * 0.40
    else:
        norm = max(0.0, sim * 2)

    score = round(norm * max_score, 2)
    return score, sim


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    source = (
        "Venus is challenging to explore due to extreme heat, pressure, and corrosive "
        "atmosphere. NASA proposes a blimp-like vehicle hovering 30 miles above the "
        "surface. Silicon carbide electronics have been tested and survived simulated "
        "Venusian conditions for three weeks."
    )
    essays = {
        "On-topic": (
            "The author argues that studying Venus is a worthy pursuit. NASA's blimp concept "
            "would allow scientists to hover above the dangerous surface conditions. "
            "Furthermore, silicon carbide electronics demonstrate that technology can "
            "withstand the extreme environment."
        ),
        "Off-topic": (
            "My favourite sport is football. I play every weekend with my friends. "
            "We enjoy competing and improving our skills. Football teaches teamwork "
            "and discipline which are very important life lessons."
        ),
    }

    for label, essay in essays.items():
        score, sim = compute_relevance_score(essay, source_text=source)
        print(f"\n{label}:")
        print(f"  Relevance score : {score}/25")
        print(f"  Cosine sim      : {sim:.4f}")
