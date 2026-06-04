"""
vocabulary.py
-------------
Vocabulary richness analysis.

Metrics:
  - Type-Token Ratio (TTR):           unique_words / total_words
  - Corrected TTR (CTTR):             unique / sqrt(2 × total)  ← length-robust
  - Hapax legomena ratio:             once-occurring words / vocabulary size
  - Long-word ratio:                  words with 7+ chars / total
  - Transition / academic word ratio: use of advanced connective phrases
  - Average word length

Rubric contribution: 15 points

Why these metrics?
  Raw TTR shrinks as essays get longer even if vocabulary stays rich.
  CTTR is a standard correction (Carroll, 1964) used widely in L2 writing
  research.  Long-word ratio correlates with academic register.

Run directly to test:
  python utils/vocabulary.py
"""

import math
from collections import Counter
from utils.preprocessing import tokenize_words


# ── Academic / transition vocabulary ─────────────────────────────────────────
ACADEMIC_WORDS = frozenset({
    "furthermore", "moreover", "nevertheless", "consequently", "therefore",
    "alternatively", "specifically", "particularly", "significantly",
    "additionally", "subsequently", "essentially", "ultimately", "frequently",
    "considerably", "predominantly", "simultaneously", "demonstrates",
    "illustrates", "emphasizes", "indicates", "suggests", "implies",
    "contrasts", "acknowledges", "asserts", "concludes", "evaluates",
    "argument", "evidence", "analysis", "perspective", "approach",
    "effectively", "efficiently", "precisely", "accurately",
})


# ──────────────────────────────────────────────────────────────────────────────
# Feature extraction
# ──────────────────────────────────────────────────────────────────────────────

def compute_vocabulary_features(text):
    """
    Compute vocabulary richness features for *text*.

    Parameters
    ----------
    text : str

    Returns
    -------
    dict
    """
    words_all = tokenize_words(text, remove_stopwords=False, lowercase=True)
    n_words = max(len(words_all), 1)

    word_freq = Counter(words_all)
    vocab_size = max(len(word_freq), 1)

    # Type-Token Ratio
    ttr = len(word_freq) / n_words

    # Corrected TTR (length-independent)
    cttr = len(word_freq) / math.sqrt(2 * n_words)

    # Hapax legomena (words appearing exactly once)
    hapax_count = sum(1 for c in word_freq.values() if c == 1)
    hapax_ratio = hapax_count / vocab_size

    # Long words (≥7 characters → typically academic vocabulary)
    long_words = [w for w in words_all if len(w) >= 7]
    long_word_ratio = len(long_words) / n_words

    # Academic / transition word usage
    academic_count = sum(1 for w in words_all if w in ACADEMIC_WORDS)
    academic_ratio = academic_count / n_words

    # Average word length
    avg_word_len = sum(len(w) for w in words_all) / n_words

    return {
        "ttr":              ttr,
        "corrected_ttr":    cttr,
        "unique_word_count": len(word_freq),
        "total_word_count":  n_words,
        "hapax_ratio":       hapax_ratio,
        "long_word_ratio":   long_word_ratio,
        "academic_count":    academic_count,
        "academic_ratio":    academic_ratio,
        "avg_word_length":   avg_word_len,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Scoring
# ──────────────────────────────────────────────────────────────────────────────

def compute_vocabulary_score(text, max_score=15):
    """
    Map vocabulary features to a rubric score.

    Sub-score breakdown (each 0–1, then weighted):
      corrected_ttr   40 % – core vocabulary diversity measure
      long_word_ratio 25 % – academic register indicator
      academic_ratio  20 % – use of advanced connective phrases
      avg_word_length 15 % – general word sophistication

    Parameters
    ----------
    text      : str
    max_score : int  (default 15)

    Returns
    -------
    (float score,  dict features)
    """
    feats = compute_vocabulary_features(text)

    # Corrected TTR  – typical student essays: CTTR 2–10
    cttr_sub = min(1.0, feats["corrected_ttr"] / 8.0)

    # Long-word ratio  – ideal: 0.15–0.35
    lwr = feats["long_word_ratio"]
    if 0.15 <= lwr <= 0.35:
        lwr_sub = 1.00
    elif lwr < 0.15:
        lwr_sub = lwr / 0.15
    else:
        # Excessive long words can hurt readability
        lwr_sub = max(0.50, 1.00 - (lwr - 0.35) * 2)

    # Academic ratio  – ideal ≥ 0.02 (2 academic words per 100)
    acad_sub = min(1.0, feats["academic_ratio"] / 0.02)

    # Average word length  – ideal: 4.5–6.5 chars
    awl = feats["avg_word_length"]
    if 4.5 <= awl <= 6.5:
        awl_sub = 1.00
    elif awl < 4.5:
        awl_sub = max(0.30, awl / 4.5)
    else:
        awl_sub = max(0.60, 1.00 - (awl - 6.5) / 10)

    combined = (
        cttr_sub  * 0.40 +
        lwr_sub   * 0.25 +
        acad_sub  * 0.20 +
        awl_sub   * 0.15
    )
    score = round(min(max_score, max(0.0, combined * max_score)), 2)
    return score, feats


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    essays = {
        "Simple": (
            "Venus is hot. It is very very hot. NASA wants to go there. "
            "They have a big plan to go. The plan is good. I like the plan. "
            "Venus is interesting to go to."
        ),
        "Rich vocabulary": (
            "The author effectively demonstrates that studying Venus is a worthwhile "
            "endeavour despite the numerous challenges it presents. Furthermore, the "
            "innovative solutions proposed by NASA—including blimp-like vehicles and "
            "silicon carbide electronics—suggest that these obstacles are surmountable. "
            "The utilisation of mechanical computers represents a fascinating alternative "
            "approach to conventional technology, significantly expanding exploration possibilities."
        ),
    }

    for label, text in essays.items():
        score, feats = compute_vocabulary_score(text)
        print(f"\n{label}:")
        print(f"  Vocabulary score  : {score}/15")
        print(f"  TTR               : {feats['ttr']:.3f}")
        print(f"  Corrected TTR     : {feats['corrected_ttr']:.3f}")
        print(f"  Long-word ratio   : {feats['long_word_ratio']:.3f}")
        print(f"  Academic ratio    : {feats['academic_ratio']:.3f}")
        print(f"  Avg word length   : {feats['avg_word_length']:.2f}")
