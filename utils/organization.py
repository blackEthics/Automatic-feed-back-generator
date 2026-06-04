"""
organization.py
---------------
Essay organization and logical structure analysis.

Detects:
  - Introduction paragraph (first paragraph markers)
  - Conclusion paragraph  (last paragraph markers)
  - Transition word usage (variety and count)
  - Paragraph count
  - Sentence length variance (indicates structural variety)

Rubric contribution: 20 points

Why rule-based?
  Organisation is signalled by textual markers (transition phrases, conclusion
  keywords) that can be reliably detected with lexical rules. No labelled
  per-essay organisation scores exist in the ASAP dataset.

Run directly to test:
  python utils/organization.py
"""

import re
from utils.preprocessing import get_paragraphs, tokenize_sentences, tokenize_words


# ── Vocabulary lists ──────────────────────────────────────────────────────────

TRANSITION_WORDS = frozenset({
    # Addition
    "furthermore", "moreover", "additionally", "also", "besides",
    "in addition", "as well as", "not only", "first", "second", "third",
    "firstly", "secondly", "thirdly", "finally", "lastly",
    # Contrast
    "however", "nevertheless", "although", "despite", "on the other hand",
    "in contrast", "whereas", "yet", "still",
    # Cause / Effect
    "therefore", "consequently", "thus", "hence", "as a result",
    "because", "since", "due to", "so that",
    # Example / Evidence
    "for example", "for instance", "specifically", "such as", "namely",
    "in particular", "to illustrate", "according to",
    "the author states", "the text says", "as stated", "this shows",
    "the article mentions", "evidence shows", "this suggests",
    # Conclusion
    "in conclusion", "to conclude", "in summary", "to summarize",
    "overall", "ultimately", "in brief", "to sum up",
})

INTRO_MARKERS = [
    "in this essay", "this essay", "the author", "in the article",
    "the following", "throughout", 'in "', "according to",
    "i will", "i am going to",
]

CONCLUSION_MARKERS = [
    "in conclusion", "to conclude", "in summary", "to summarize",
    "in closing", "overall", "ultimately", "finally", "to sum up",
    "as shown", "therefore", "thus", "in the end", "all in all",
    "based on", "given these points",
]


# ──────────────────────────────────────────────────────────────────────────────
# Helper detectors
# ──────────────────────────────────────────────────────────────────────────────

def _detect_intro(paragraphs):
    """Score the introduction quality of the first paragraph."""
    if not paragraphs:
        return {"has_intro": False, "intro_score": 0.0, "intro_sentences": 0}

    first = paragraphs[0].lower()
    sents = tokenize_sentences(paragraphs[0])
    words = tokenize_words(paragraphs[0])

    has_marker    = any(m in first for m in INTRO_MARKERS)
    enough_sents  = len(sents) >= 2
    enough_words  = len(words) >= 20

    score = has_marker * 0.40 + enough_sents * 0.30 + enough_words * 0.30

    return {
        "has_intro":       score > 0.30,
        "intro_score":     score,
        "intro_sentences": len(sents),
    }


def _detect_conclusion(paragraphs):
    """Score the conclusion quality of the last paragraph."""
    if not paragraphs or len(paragraphs) < 2:
        return {"has_conclusion": False, "conclusion_score": 0.0, "conclusion_sentences": 0}

    last = paragraphs[-1].lower()
    sents = tokenize_sentences(paragraphs[-1])
    words = tokenize_words(paragraphs[-1])

    has_marker    = any(m in last for m in CONCLUSION_MARKERS)
    enough_sents  = len(sents) >= 2
    enough_words  = len(words) >= 15

    score = has_marker * 0.50 + enough_sents * 0.25 + enough_words * 0.25

    return {
        "has_conclusion":       score > 0.30,
        "conclusion_score":     score,
        "conclusion_sentences": len(sents),
    }


def _detect_transitions(text):
    """Count transition word occurrences in *text*."""
    text_lower = text.lower()
    found = []
    for phrase in TRANSITION_WORDS:
        # Count non-overlapping occurrences
        n = text_lower.count(phrase)
        if n:
            found.extend([phrase] * n)

    return {
        "transition_count":   len(found),
        "unique_transitions": len(set(found)),
        "transitions_found":  list(set(found)),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Feature extraction
# ──────────────────────────────────────────────────────────────────────────────

def compute_organization_features(text):
    """
    Compute all organisation-related features for *text*.

    Returns
    -------
    dict
    """
    paragraphs = get_paragraphs(text)
    sentences  = tokenize_sentences(text)

    intro_info      = _detect_intro(paragraphs)
    conclusion_info = _detect_conclusion(paragraphs)
    transition_info = _detect_transitions(text)

    # Sentence length variance – high variance implies deliberate structure variety
    sent_lengths = [len(tokenize_words(s)) for s in sentences if s.strip()]
    if len(sent_lengths) >= 2:
        length_variance = max(sent_lengths) - min(sent_lengths)
        avg_sent_len    = sum(sent_lengths) / len(sent_lengths)
    else:
        length_variance = 0
        avg_sent_len    = sent_lengths[0] if sent_lengths else 0

    return {
        "paragraph_count":         len(paragraphs),
        "sentence_count":          len(sentences),
        "has_intro":               intro_info["has_intro"],
        "has_conclusion":          conclusion_info["has_conclusion"],
        "intro_score":             intro_info["intro_score"],
        "conclusion_score":        conclusion_info["conclusion_score"],
        "transition_count":        transition_info["transition_count"],
        "unique_transitions":      transition_info["unique_transitions"],
        "sentence_length_variance": length_variance,
        "avg_sentence_length":     avg_sent_len,
        "transitions_found":       transition_info["transitions_found"],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Scoring
# ──────────────────────────────────────────────────────────────────────────────

def compute_organization_score(text, max_score=20):
    """
    Map organisation features to a rubric score.

    Sub-score weights
    -----------------
      Paragraph structure  20 % – at least 3 paragraphs
      Introduction quality 20 % – detected intro markers + length
      Conclusion quality   20 % – detected conclusion markers + length
      Transition words     25 % – variety and frequency
      Sentence variety     15 % – length range across sentences

    Parameters
    ----------
    text      : str
    max_score : int  (default 20)

    Returns
    -------
    (float score,  dict features)
    """
    feats = compute_organization_features(text)

    # Paragraph sub-score
    np_ = feats["paragraph_count"]
    para_sub = 1.00 if np_ >= 3 else (0.60 if np_ == 2 else (0.20 if np_ == 1 else 0.0))

    # Intro / conclusion sub-scores (already 0–1 from detection)
    intro_sub      = feats["intro_score"]
    conclusion_sub = feats["conclusion_score"]

    # Transition word sub-score
    nt = feats["transition_count"]
    if nt >= 5:
        trans_sub = 1.00
    elif nt >= 3:
        trans_sub = 0.70
    elif nt >= 1:
        trans_sub = 0.40
    else:
        trans_sub = 0.00

    # Sentence variety sub-score
    var = feats["sentence_length_variance"]
    if var >= 10:
        variety_sub = 1.00
    elif var >= 5:
        variety_sub = 0.70
    elif var >= 2:
        variety_sub = 0.40
    else:
        variety_sub = 0.20

    combined = (
        para_sub       * 0.20 +
        intro_sub      * 0.20 +
        conclusion_sub * 0.20 +
        trans_sub      * 0.25 +
        variety_sub    * 0.15
    )
    score = round(min(max_score, max(0.0, combined * max_score)), 2)
    return score, feats


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    structured_essay = """
    The author of this article makes a compelling argument that exploring Venus is a
    worthwhile scientific endeavour. In this essay, I will evaluate how well he supports
    this claim.

    First, the author explains that Venus was once Earth-like and may have harboured life.
    Furthermore, he describes NASA's blimp concept as a solution to the extreme surface
    conditions. However, he acknowledges that hovering vehicles cannot take physical samples.
    Additionally, silicon carbide electronics are being tested to survive the harsh environment.

    In conclusion, the author effectively supports his claim through multiple lines of
    evidence. Therefore, studying Venus is not only feasible but scientifically essential.
    """

    unstructured_essay = (
        "Venus is a planet NASA wants to study. It is very hot and dangerous. "
        "They have a blimp idea it could work. The electronics can survive maybe. "
        "I think Venus is good to study because we can learn things about space."
    )

    for label, text in [("Structured", structured_essay), ("Unstructured", unstructured_essay)]:
        score, feats = compute_organization_score(text)
        print(f"\n{label}:")
        print(f"  Organization score  : {score}/20")
        print(f"  Paragraphs          : {feats['paragraph_count']}")
        print(f"  Has intro           : {feats['has_intro']}")
        print(f"  Has conclusion      : {feats['has_conclusion']}")
        print(f"  Transitions used    : {feats['transition_count']}  (unique: {feats['unique_transitions']})")
        print(f"  Sentence variance   : {feats['sentence_length_variance']}")
