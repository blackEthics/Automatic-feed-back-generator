"""
grammar.py
----------
Grammar and spelling error detection.

Two modes:
  fast  – heuristic-based, ~instant, suitable for batch feature extraction
  full  – LanguageTool-based, accurate, suitable for individual essay scoring

Rubric contribution: 20 points

Run directly to test:
  python utils/grammar.py
"""

import re
from utils.preprocessing import tokenize_sentences, tokenize_words

# ── Lazy LanguageTool initialisation ──────────────────────────────────────────
_lt_tool = None


def _get_lt():
    global _lt_tool
    if _lt_tool is None:
        try:
            import language_tool_python
            print("[INFO] Starting LanguageTool server (first call only)…")
            _lt_tool = language_tool_python.LanguageTool("en-US")
        except Exception as e:
            print(f"[WARN] LanguageTool unavailable ({e}). Falling back to fast mode.")
            _lt_tool = False          # sentinel
    return _lt_tool if _lt_tool else None


# ──────────────────────────────────────────────────────────────────────────────
# Fast heuristic grammar check (no external dependency)
# ──────────────────────────────────────────────────────────────────────────────

_COMMON_ERRORS = re.compile(
    r"\b(alot|dont|cant|wont|isnt|arent|wasnt|werent|shouldnt|couldnt|wouldnt"
    r"|im\b|its a|your a|there going|definately|occured|recieve|beleive"
    r"|seperate|untill|wich|teh|adn|nad)\b",
    re.IGNORECASE,
)


def check_grammar_fast(text):
    """
    Heuristic grammar assessment – no external libraries needed.

    Signals used:
      - Sentences not starting with a capital letter
      - Sentences missing terminal punctuation
      - Lowercase standalone "i" (should be "I")
      - Common misspellings via regex
      - Comma/period after a space (   ,  pattern)

    Returns
    -------
    dict
    """
    if not text or len(text.strip()) < 10:
        return _empty_grammar_result()

    sentences = tokenize_sentences(text)
    words = tokenize_words(text, remove_stopwords=False, lowercase=False)
    n_words = max(len(words), 1)
    n_sents = max(len(sentences), 1)

    # Sentences that don't start with a capital letter
    no_cap = sum(1 for s in sentences if s and s[0].islower())

    # Sentences without terminal punctuation
    no_punct = sum(1 for s in sentences if s and s[-1] not in ".!?")

    # Lowercase "i" used as first-person pronoun
    lower_i = len(re.findall(r"(?<!\w)i(?!\w)", text))

    # Common misspellings / typos
    common_errors = len(_COMMON_ERRORS.findall(text))

    # Space before punctuation  e.g. "word ,word"
    space_before_punct = len(re.findall(r"\s[,;:.]", text))

    total_errors = no_cap + no_punct + lower_i + common_errors + space_before_punct
    error_rate = total_errors / n_words

    return {
        "total_errors":      total_errors,
        "grammar_errors":    no_cap + no_punct,
        "spelling_errors":   common_errors,
        "punctuation_errors": no_punct + space_before_punct,
        "error_rate":        error_rate,
        "mode":              "fast",
    }


# ──────────────────────────────────────────────────────────────────────────────
# Full LanguageTool grammar check (accurate)
# ──────────────────────────────────────────────────────────────────────────────

def check_grammar_full(text, char_limit=3000):
    """
    Use LanguageTool to detect grammar / spelling errors.

    *char_limit* truncates the text so each call stays fast (~0.5 s).

    Returns
    -------
    dict  (same structure as check_grammar_fast for interchangeability)
    """
    tool = _get_lt()
    if tool is None:
        # LanguageTool unavailable – fall back to fast mode
        return check_grammar_fast(text)

    if not text or len(text.strip()) < 10:
        return _empty_grammar_result()

    words = tokenize_words(text)
    n_words = max(len(words), 1)

    matches = tool.check(text[:char_limit])

    grammar_errors = 0
    spelling_errors = 0
    punctuation_errors = 0

    for m in matches:
        rule = (m.rule_id if hasattr(m, "rule_id") else m.ruleId).lower()
        if any(k in rule for k in ("spell", "typo", "misspell")):
            spelling_errors += 1
        elif any(k in rule for k in ("punct", "comma", "period", "apostrophe")):
            punctuation_errors += 1
        else:
            grammar_errors += 1

    return {
        "total_errors":       len(matches),
        "grammar_errors":     grammar_errors,
        "spelling_errors":    spelling_errors,
        "punctuation_errors": punctuation_errors,
        "error_rate":         len(matches) / n_words,
        "mode":               "full",
        "matches":            matches,
    }


def _empty_grammar_result():
    return {
        "total_errors": 0, "grammar_errors": 0, "spelling_errors": 0,
        "punctuation_errors": 0, "error_rate": 0.0, "mode": "empty",
    }


# ──────────────────────────────────────────────────────────────────────────────
# Scoring
# ──────────────────────────────────────────────────────────────────────────────

def compute_grammar_score(text, max_score=20, fast=False):
    """
    Convert grammar error rate to a rubric score.

    Scoring formula:
      score = max_score × max(0,  1 – error_rate × 10)

    So an error rate of 0.00 → 20 pts, 0.10 → 10 pts, ≥0.20 → 0 pts.

    Parameters
    ----------
    text      : str
    max_score : int  (default 20)
    fast      : bool – use heuristic checker if True (fast, for batch use)

    Returns
    -------
    (float score,  dict details)
    """
    details = check_grammar_fast(text) if fast else check_grammar_full(text)
    error_rate = details["error_rate"]
    score = round(max(0.0, max_score * (1.0 - error_rate * 10)), 2)
    return score, details


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    bad_essay = (
        "the author of this article say that Venus is a good planet to study. "
        "He provide many reason for why we should goes there even if its dangerous. "
        "i think the blimp idea are very interesting and could works good. "
        "we definately need to explore more about venus."
    )

    good_essay = (
        "The author effectively argues that studying Venus is a worthwhile endeavour. "
        "He presents compelling evidence including NASA's blimp concept and silicon carbide electronics. "
        "Furthermore, he notes that Venus may once have harboured life, making it scientifically valuable."
    )

    print("=== FAST MODE ===")
    for label, essay in [("Bad", bad_essay), ("Good", good_essay)]:
        score, details = compute_grammar_score(essay, fast=True)
        print(f"  {label} essay → score={score}/20  errors={details['total_errors']}  rate={details['error_rate']:.3f}")

    print("\n=== FULL MODE (LanguageTool) ===")
    for label, essay in [("Bad", bad_essay), ("Good", good_essay)]:
        score, details = compute_grammar_score(essay, fast=False)
        print(f"  {label} essay → score={score}/20  errors={details['total_errors']}  rate={details['error_rate']:.3f}  mode={details['mode']}")
