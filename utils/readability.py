"""
readability.py
--------------
Readability and clarity analysis using the textstat library.

Metrics computed:
  - Flesch Reading Ease   (higher = easier to read)
  - Flesch-Kincaid Grade  (US school grade level)
  - Gunning Fog Index     (years of education needed)
  - Average sentence length
  - Average syllables per word
  - Difficult word ratio  (words not in Dale-Chall easy list)

Rubric contribution: 20 points (Clarity category)

Why textstat?
  It is lightweight, has no server dependency, and provides multiple
  validated readability formulas in a single call.

Run directly to test:
  python utils/readability.py
"""

import textstat
from utils.preprocessing import tokenize_sentences, tokenize_words


# ──────────────────────────────────────────────────────────────────────────────
# Feature extraction
# ──────────────────────────────────────────────────────────────────────────────

def compute_readability_features(text):
    """
    Compute all readability metrics for *text*.

    Parameters
    ----------
    text : str

    Returns
    -------
    dict
    """
    if not text or len(text.strip()) < 20:
        return {
            "flesch_reading_ease":        50.0,
            "flesch_kincaid_grade":       8.0,
            "gunning_fog":                10.0,
            "automated_readability_index": 8.0,
            "avg_sentence_length":        0.0,
            "avg_syllables_per_word":     1.5,
            "difficult_word_ratio":       0.1,
        }

    sentences = tokenize_sentences(text)
    words = tokenize_words(text)
    n_words = max(len(words), 1)
    n_sentences = max(len(sentences), 1)

    syllables = textstat.syllable_count(text)
    difficult = textstat.difficult_words(text)

    return {
        "flesch_reading_ease":        textstat.flesch_reading_ease(text),
        "flesch_kincaid_grade":       textstat.flesch_kincaid_grade(text),
        "gunning_fog":                textstat.gunning_fog(text),
        "automated_readability_index": textstat.automated_readability_index(text),
        "avg_sentence_length":        n_words / n_sentences,
        "avg_syllables_per_word":     syllables / n_words,
        "difficult_word_ratio":       difficult / n_words,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Scoring
# ──────────────────────────────────────────────────────────────────────────────

def compute_clarity_score(text, max_score=20):
    """
    Map readability features to a rubric score.

    Scoring rationale
    -----------------
    Target reading level for academic student essays:
      Flesch Reading Ease  50–70  (standard / fairly difficult)
      Avg sentence length  12–25 words

    Too simple (FRE > 80) gets a mild penalty – it implies shallow sentences.
    Too complex (FRE < 30) gets a larger penalty – hard to follow.

    Parameters
    ----------
    text      : str
    max_score : int  (default 20)

    Returns
    -------
    (float score,  dict features)
    """
    features = compute_readability_features(text)
    fre = features["flesch_reading_ease"]
    asl = features["avg_sentence_length"]

    # ── Flesch Reading Ease sub-score ────────────────────────────────────────
    if 50 <= fre <= 70:
        fre_sub = 1.00
    elif 70 < fre <= 90:
        fre_sub = 1.00 - (fre - 70) / 80          # mild penalty for too simple
    elif fre > 90:
        fre_sub = 0.75
    elif 30 <= fre < 50:
        fre_sub = 0.70 + (fre - 30) / 100         # some penalty for complexity
    else:
        fre_sub = max(0.30, fre / 100)             # very complex / unreadable

    # ── Average sentence length sub-score ────────────────────────────────────
    if 12 <= asl <= 25:
        asl_sub = 1.00
    elif asl > 25:
        asl_sub = max(0.50, 1.00 - (asl - 25) / 50)
    elif asl > 0:
        asl_sub = max(0.40, asl / 15)
    else:
        asl_sub = 0.20

    combined = fre_sub * 0.70 + asl_sub * 0.30
    score = round(min(max_score, max(0.0, combined * max_score)), 2)
    return score, features


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    essays = {
        "Short choppy": (
            "Venus is hot. It is dangerous. NASA wants to go. They have a plan. "
            "It is a blimp. It would hover. This is interesting."
        ),
        "Good academic": (
            "The author effectively argues that exploring Venus is worthwhile despite "
            "the numerous challenges it presents. NASA's proposed blimp-like vehicle "
            "would hover thirty miles above the surface, avoiding extreme ground conditions. "
            "Furthermore, silicon carbide electronics could withstand the harsh environment, "
            "demonstrating that technological innovation can overcome planetary obstacles."
        ),
        "Overly complex": (
            "The epistemological implications of extraterrestrial atmospheric phenomenon "
            "necessitate a comprehensive re-evaluation of heliocentric paradigms, particularly "
            "vis-à-vis the thermodynamic incompatibilities extant between terrestrial biospheric "
            "habitation requirements and Venusian exospheric compositional attributes."
        ),
    }

    for label, text in essays.items():
        score, feats = compute_clarity_score(text)
        print(f"\n{label}:")
        print(f"  Clarity score  : {score}/20")
        print(f"  FRE            : {feats['flesch_reading_ease']:.1f}")
        print(f"  FK Grade       : {feats['flesch_kincaid_grade']:.1f}")
        print(f"  Avg sent len   : {feats['avg_sentence_length']:.1f} words")
