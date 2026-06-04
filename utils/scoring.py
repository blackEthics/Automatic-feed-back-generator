"""
scoring.py
----------
Combined essay scoring engine.

Aggregates individual dimension scores according to the rubric:

  | Dimension    | Max pts |
  |--------------|---------|
  | Grammar      |   20    |
  | Relevance    |   25    |
  | Organization |   20    |
  | Clarity      |   20    |
  | Vocabulary   |   15    |
  | TOTAL        |  100    |

The 100-point total is then mapped to the ASAP 1–6 scale.

Run directly to test:
  python utils/scoring.py
"""

from utils.grammar import compute_grammar_score
from utils.readability import compute_clarity_score
from utils.vocabulary import compute_vocabulary_score
from utils.relevance import compute_relevance_score
from utils.organization import compute_organization_score


# ── Rubric ────────────────────────────────────────────────────────────────────
RUBRIC = {
    "grammar":      {"max": 20, "label": "Grammar"},
    "relevance":    {"max": 25, "label": "Relevance"},
    "organization": {"max": 20, "label": "Organization"},
    "clarity":      {"max": 20, "label": "Clarity"},
    "vocabulary":   {"max": 15, "label": "Vocabulary"},
}


# ──────────────────────────────────────────────────────────────────────────────
# Main scorer
# ──────────────────────────────────────────────────────────────────────────────

def score_essay(essay_text, source_text=None, prompt_name=None, fast_grammar=False):
    """
    Score a single essay across all rubric dimensions.

    Parameters
    ----------
    essay_text   : str
    source_text  : str | None  – reference passage for relevance scoring
    prompt_name  : str | None  – fallback for relevance if no source text
    fast_grammar : bool        – use heuristic grammar check (faster, less accurate)

    Returns
    -------
    dict with keys:
      grammar, relevance, organization, clarity, vocabulary  – individual scores
      total_score        – sum (0–100)
      normalized_score   – ASAP scale (1.0–6.0)
      similarity         – cosine similarity value
      details            – raw feature dicts from each sub-module
    """
    if not essay_text or len(essay_text.strip()) < 20:
        return _zero_result()

    grammar_score,  grammar_details  = compute_grammar_score(essay_text, fast=fast_grammar)
    clarity_score,  clarity_details  = compute_clarity_score(essay_text)
    vocab_score,    vocab_details     = compute_vocabulary_score(essay_text)
    org_score,      org_details       = compute_organization_score(essay_text)
    rel_score,      similarity        = compute_relevance_score(
                                            essay_text, source_text, prompt_name)

    total = grammar_score + clarity_score + vocab_score + org_score + rel_score

    # Map [0, 100] → [1.0, 6.0]
    normalized = round(min(6.0, max(1.0, 1.0 + (total / 100.0) * 5.0)), 2)

    return {
        "grammar":          round(grammar_score, 2),
        "relevance":        round(rel_score, 2),
        "organization":     round(org_score, 2),
        "clarity":          round(clarity_score, 2),
        "vocabulary":       round(vocab_score, 2),
        "total_score":      round(total, 2),
        "normalized_score": normalized,
        "similarity":       similarity,
        "details": {
            "grammar":      grammar_details,
            "clarity":      clarity_details,
            "vocabulary":   vocab_details,
            "organization": org_details,
        },
    }


def _zero_result():
    return {
        "grammar": 0.0, "relevance": 0.0, "organization": 0.0,
        "clarity": 0.0, "vocabulary": 0.0,
        "total_score": 0.0, "normalized_score": 1.0,
        "similarity": 0.0, "details": {},
    }


def scores_to_feature_row(score_result):
    """
    Flatten a score_result dict into ML-ready features.
    Useful when you want to combine rule-based scores with raw features.
    """
    return {
        "rule_grammar":      score_result["grammar"],
        "rule_relevance":    score_result["relevance"],
        "rule_organization": score_result["organization"],
        "rule_clarity":      score_result["clarity"],
        "rule_vocabulary":   score_result["vocabulary"],
        "rule_total":        score_result["total_score"],
        "rule_similarity":   max(0.0, score_result["similarity"]),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Pretty printing
# ──────────────────────────────────────────────────────────────────────────────

def print_score_report(result, essay_id=None):
    """Print a formatted score report to stdout."""
    sep = "=" * 52
    header = f"ESSAY SCORE REPORT" + (f"  –  ID: {essay_id}" if essay_id else "")
    print(f"\n{sep}\n{header}\n{sep}")

    for dim, info in RUBRIC.items():
        score    = result[dim]
        max_pts  = info["max"]
        label    = info["label"]
        filled   = int(round(score / max_pts * 20))
        bar      = "#" * filled + "-" * (20 - filled)
        print(f"  {label:<14} {bar}  {score:5.1f} / {max_pts}")

    print(f"\n  {'TOTAL':<14} {'':>20}  {result['total_score']:5.1f} / 100")
    print(f"  {'ASAP SCALE':<14} {'':>20}  {result['normalized_score']:5.2f} / 6.0")
    print(sep)


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    weak_essay = (
        "Venus is hot. NASA wants to go there. "
        "They have some ideas but it is hard. "
        "i think its good to study venus because we can learn things."
    )

    strong_essay = (
        'In "The Challenge of Exploring Venus," the author makes a compelling argument '
        "that studying Venus is a worthwhile scientific pursuit despite the considerable "
        "dangers involved. The author effectively supports this position through multiple "
        "lines of evidence.\n\n"
        "First, he describes NASA's innovative blimp-like vehicle concept. This craft would "
        "hover approximately 30 miles above the surface, avoiding the extreme heat and "
        "pressure conditions. Furthermore, silicon carbide electronics have been successfully "
        "tested in simulated Venusian conditions for three weeks, demonstrating technological "
        "feasibility. Additionally, mechanical computers offer an alternative approach that is "
        "resistant to extreme physical conditions.\n\n"
        "In conclusion, the author strongly supports his claim with scientific evidence and "
        "practical engineering solutions. Therefore, exploring Venus is not only justified but "
        "essential for advancing our understanding of planetary science."
    )

    for label, essay in [("Weak essay", weak_essay), ("Strong essay", strong_essay)]:
        print(f"\n{'─'*52}\n{label}\n{'─'*52}")
        result = score_essay(essay, prompt_name="Exploring Venus")
        print_score_report(result)
