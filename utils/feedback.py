"""
feedback.py
-----------
Rule-based feedback generation.

Maps dimension scores to specific, actionable improvement messages.
Also generates structural tips based on raw feature details from the
score_result.

Run directly to test:
  python utils/feedback.py
"""

from utils.scoring import score_essay, print_score_report

# ── Rubric weights (used to determine priority improvements) ──────────────────
RUBRIC_MAX = {
    "grammar": 20, "relevance": 25, "organization": 20,
    "clarity": 20, "vocabulary": 15,
}

# ── Threshold-based message tables ───────────────────────────────────────────
# Each entry: (lower_bound_inclusive, upper_bound_exclusive, message)
_FEEDBACK_TABLE = {
    "grammar": [
        (0,  8,  "Your essay contains many grammar and spelling errors. "
                 "Carefully re-read your work, paying attention to subject-verb agreement, "
                 "punctuation, and spelling. Consider using a grammar-checking tool."),
        (8,  13, "There are several grammar issues in your essay. Focus on proper sentence "
                 "structure, consistent tense, and correct punctuation."),
        (13, 17, "Grammar is mostly correct with a few minor errors. "
                 "One final proofread should polish your writing."),
        (17, 21, "Excellent grammar and spelling throughout the essay."),
    ],
    "relevance": [
        (0,  10, "Your essay does not clearly address the topic. Make sure you respond "
                 "directly to the prompt and cite specific evidence from the source text."),
        (10, 16, "Your essay partially addresses the topic. Strengthen your connections to "
                 "the source material by quoting or paraphrasing key passages."),
        (16, 21, "Your essay is generally on-topic. Adding more direct references to the "
                 "source text would further demonstrate your engagement with the material."),
        (21, 26, "Your essay is highly relevant and well-connected to the source material."),
    ],
    "organization": [
        (0,  8,  "Your essay lacks clear organization. Structure your response with a "
                 "clear introduction, body paragraphs, and conclusion. Use transition words "
                 "(e.g., 'furthermore', 'however', 'in conclusion') to connect your ideas."),
        (8,  13, "Organization needs improvement. Ensure each paragraph focuses on one main "
                 "idea, and use transition words to guide the reader from point to point."),
        (13, 17, "Essay organization is adequate. A stronger conclusion paragraph and more "
                 "varied transitions would improve the overall structure."),
        (17, 21, "Your essay is well-organized with clear structure and effective transitions."),
    ],
    "clarity": [
        (0,  8,  "Your essay is difficult to read. Try varying your sentence length, avoid "
                 "run-on sentences, and aim for clear, direct expression."),
        (8,  13, "Clarity could be improved. Aim for a mix of short and medium-length "
                 "sentences, and avoid overly complex phrasing."),
        (13, 17, "The essay is mostly clear and readable. Minor improvements in sentence "
                 "structure would make your argument easier to follow."),
        (17, 21, "Excellent clarity and readability throughout the essay."),
    ],
    "vocabulary": [
        (0,  6,  "Your vocabulary is limited. Challenge yourself to use more varied and "
                 "academic words. Avoid repeating the same words too often."),
        (6,  10, "Vocabulary is adequate but could be more diverse. Use more specific, "
                 "academic language and varied synonyms."),
        (10, 13, "Good vocabulary usage with some variety. Incorporating more transition "
                 "phrases and academic terms would strengthen your register."),
        (13, 16, "Excellent vocabulary with strong variety and an appropriate academic "
                 "register throughout."),
    ],
}

# ── Structural tip templates ──────────────────────────────────────────────────
_TIPS = {
    "no_conclusion": (
        "Missing conclusion: End with a paragraph that restates your main argument "
        "and summarises your key evidence."
    ),
    "no_intro": (
        "Missing introduction: Begin with a paragraph that introduces the topic "
        "and clearly states your position."
    ),
    "few_paragraphs": (
        "Essay structure: Aim for at least 3 paragraphs — introduction, one or more "
        "body paragraphs, and a conclusion."
    ),
    "no_transitions": (
        "Transitions: Use linking phrases such as 'furthermore', 'however', "
        "'in addition', and 'therefore' to connect your ideas."
    ),
    "high_error_rate": (
        "Proofreading: Focus on sentence fragments, run-on sentences, and spelling. "
        "Reading your essay aloud can help catch errors."
    ),
    "off_topic": (
        "Source engagement: Quote or paraphrase directly from the source text to "
        "show you understand the material."
    ),
}


# ──────────────────────────────────────────────────────────────────────────────
# Core feedback generator
# ──────────────────────────────────────────────────────────────────────────────

def generate_feedback(score_result):
    """
    Generate actionable feedback from a score_result dict.

    Parameters
    ----------
    score_result : dict  – output of scoring.score_essay()

    Returns
    -------
    dict with keys:
      overall       – general assessment string
      priority      – which two dimensions need the most work
      grammar/relevance/organization/clarity/vocabulary  – dimension messages
      specific_tips – list of targeted structural tips
    """
    feedback = {}

    # ── Dimension messages ────────────────────────────────────────────────────
    for dim, table in _FEEDBACK_TABLE.items():
        s = score_result[dim]
        for lo, hi, msg in table:
            if lo <= s < hi:
                feedback[dim] = msg
                break
        else:
            feedback[dim] = table[-1][2]     # max bucket

    # ── Structural tips ───────────────────────────────────────────────────────
    tips = []
    org  = score_result.get("details", {}).get("organization", {})
    gram = score_result.get("details", {}).get("grammar", {})

    if org.get("paragraph_count", 3) < 3:
        tips.append(_TIPS["few_paragraphs"])
    if not org.get("has_conclusion", True):
        tips.append(_TIPS["no_conclusion"])
    if not org.get("has_intro", True):
        tips.append(_TIPS["no_intro"])
    if org.get("transition_count", 3) < 2:
        tips.append(_TIPS["no_transitions"])
    if gram.get("error_rate", 0) > 0.10:
        tips.append(_TIPS["high_error_rate"])
    sim = score_result.get("similarity", 1.0)
    if 0.0 <= sim < 0.20:
        tips.append(_TIPS["off_topic"])

    # ── Priority areas (two lowest %-scoring dimensions) ─────────────────────
    pct = {dim: score_result[dim] / RUBRIC_MAX[dim] for dim in RUBRIC_MAX}
    priority_dims = sorted(pct, key=lambda d: pct[d])[:2]
    priority_msg = (
        f"Priority improvements: {priority_dims[0].capitalize()} "
        f"and {priority_dims[1].capitalize()}."
    )

    # ── Overall assessment ────────────────────────────────────────────────────
    total = score_result["total_score"]
    if total >= 80:
        overall = "Excellent essay! You demonstrate strong writing skills across all dimensions."
    elif total >= 65:
        overall = "Good essay overall. Focus on the specific areas highlighted below to strengthen your writing."
    elif total >= 45:
        overall = "Your essay shows effort but needs improvement in several areas. Work through the suggestions below."
    else:
        overall = (
            "Your essay needs significant improvement. Start by establishing a clear "
            "structure (introduction, body, conclusion) and directly addressing the prompt."
        )

    return {
        "overall":       overall,
        "priority":      priority_msg,
        "grammar":       feedback["grammar"],
        "relevance":     feedback["relevance"],
        "organization":  feedback["organization"],
        "clarity":       feedback["clarity"],
        "vocabulary":    feedback["vocabulary"],
        "specific_tips": tips,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Pretty printing
# ──────────────────────────────────────────────────────────────────────────────

def print_feedback_report(feedback_result, score_result=None):
    """Print a formatted feedback report to stdout."""
    sep = "=" * 62
    print(f"\n{sep}\nFEEDBACK REPORT\n{sep}")

    if score_result:
        print(f"\n  Score: {score_result['total_score']:.1f}/100  "
              f"(ASAP scale: {score_result['normalized_score']:.2f}/6.0)")

    print(f"\n[Overall Assessment]")
    print(f"  {feedback_result['overall']}")
    print(f"  {feedback_result['priority']}")

    print(f"\n[Dimension Feedback]")
    for dim in ["grammar", "relevance", "organization", "clarity", "vocabulary"]:
        max_pts = RUBRIC_MAX[dim]
        pts = score_result[dim] if score_result else "?"
        print(f"\n  {dim.upper()} ({pts}/{max_pts} pts):")
        print(f"    {feedback_result[dim]}")

    if feedback_result["specific_tips"]:
        print(f"\n[Specific Tips]")
        for tip in feedback_result["specific_tips"]:
            print(f"  • {tip}")

    print(sep)


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    weak = (
        "Venus is a planet NASA wants to study. It is very hot and dangerous. "
        "They have some ideas to go there maybe. "
        "i think studying venus is good because we can learn things about space and planets."
    )

    result = score_essay(weak, prompt_name="Exploring Venus")
    print_score_report(result)
    fb = generate_feedback(result)
    print_feedback_report(fb, result)
