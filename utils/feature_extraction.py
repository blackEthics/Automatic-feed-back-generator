"""
feature_extraction.py
---------------------
Unified feature extraction pipeline.

Calls all sub-modules and merges their outputs into a flat feature dict
(one row per essay) that the ML models can consume.

Feature groups:
  basic        – word count, sentence count, paragraph count, char count
  grammar      – error counts, error rate        (fast heuristic by default)
  readability  – Flesch scores, grade level, syllable ratios
  vocabulary   – TTR, CTTR, long-word ratio, academic word ratio
  organization – intro/conclusion flags, transition counts, sentence variance
  pos_tags     – noun/verb/adj/adv/pron ratios  (spaCy)
  relevance    – cosine similarity to source text, relevance score

Run directly to test on the first 50 essays:
  python utils/feature_extraction.py
"""

import pandas as pd
import numpy as np
from tqdm import tqdm
import warnings
warnings.filterwarnings("ignore")

from utils.preprocessing import (
    tokenize_sentences, tokenize_words, get_paragraphs, get_pos_tags,
)
from utils.grammar import check_grammar_fast, check_grammar_full
from utils.readability import compute_readability_features
from utils.vocabulary import compute_vocabulary_features
from utils.organization import compute_organization_features
from utils.relevance import compute_relevance_score


# ──────────────────────────────────────────────────────────────────────────────
# Individual feature groups
# ──────────────────────────────────────────────────────────────────────────────

def _basic_features(text):
    words     = tokenize_words(text)
    sentences = tokenize_sentences(text)
    paragraphs = get_paragraphs(text)

    n_words = max(len(words), 1)
    n_sents = max(len(sentences), 1)

    return {
        "word_count":          len(words),
        "sentence_count":      len(sentences),
        "paragraph_count":     len(paragraphs),
        "char_count":          len(text),
        "avg_sentence_length": n_words / n_sents,
        "avg_word_length":     sum(len(w) for w in words) / n_words,
    }


def _grammar_features(text, fast=True):
    result = check_grammar_fast(text) if fast else check_grammar_full(text)
    return {
        "grammar_errors":      result["total_errors"],
        "grammar_error_rate":  result["error_rate"],
        "spelling_errors":     result["spelling_errors"],
        "punct_errors":        result["punctuation_errors"],
    }


def _readability_features(text):
    r = compute_readability_features(text)
    return {
        "flesch_reading_ease":  r["flesch_reading_ease"],
        "fk_grade":             r["flesch_kincaid_grade"],
        "gunning_fog":          r["gunning_fog"],
        "ari":                  r["automated_readability_index"],
        "avg_syllables_pw":     r["avg_syllables_per_word"],
        "difficult_word_ratio": r["difficult_word_ratio"],
    }


def _vocabulary_features(text):
    v = compute_vocabulary_features(text)
    return {
        "ttr":              v["ttr"],
        "corrected_ttr":    v["corrected_ttr"],
        "unique_words":     v["unique_word_count"],
        "hapax_ratio":      v["hapax_ratio"],
        "long_word_ratio":  v["long_word_ratio"],
        "academic_count":   v["academic_count"],
        "academic_ratio":   v["academic_ratio"],
        "avg_word_len_v":   v["avg_word_length"],
    }


def _organization_features(text):
    o = compute_organization_features(text)
    return {
        "has_intro":           int(o["has_intro"]),
        "has_conclusion":      int(o["has_conclusion"]),
        "intro_score":         o["intro_score"],
        "conclusion_score":    o["conclusion_score"],
        "transition_count":    o["transition_count"],
        "unique_transitions":  o["unique_transitions"],
        "sent_len_variance":   o["sentence_length_variance"],
    }


def _pos_features(text):
    return get_pos_tags(text)


def _relevance_features(text, source_text, prompt_name):
    score, sim = compute_relevance_score(text, source_text, prompt_name)
    return {
        "relevance_score":  score,
        "topic_similarity": max(0.0, sim),   # -1 fallback → 0
    }


def _normalised_features(feats):
    """
    Length-normalised ratios computed from already-extracted features.

    These four values reduce the dominance of raw length features
    (especially char_count / word_count) in tree-based models.

    academic_ratio overwrites the vocabulary-module version with the
    same formula so downstream models see a consistent definition.
    """
    wc = max(feats.get("word_count", 1), 1)
    pc = max(feats.get("paragraph_count", 1), 1)
    return {
        "errors_per_100_words":      feats.get("grammar_errors", 0) / max(wc / 100, 1),
        "academic_ratio":            feats.get("academic_count", 0) / wc,
        "transitions_per_paragraph": feats.get("transition_count", 0) / pc,
        "unique_ratio":              feats.get("unique_words", 0) / wc,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Combined extractor
# ──────────────────────────────────────────────────────────────────────────────

def extract_all_features(essay_text, source_text=None, prompt_name=None,
                         fast_grammar=True):
    """
    Extract all NLP features for a single essay.

    Parameters
    ----------
    essay_text   : str – cleaned essay text
    source_text  : str | None – source passage from the dataset
    prompt_name  : str | None – prompt identifier (for relevance fallback)
    fast_grammar : bool – use heuristic grammar check (True for batch speed)

    Returns
    -------
    dict  (flat, all numeric)
    """
    if not essay_text or len(essay_text.strip()) < 10:
        return _empty_features()

    feats = {}
    feats.update(_basic_features(essay_text))
    feats.update(_grammar_features(essay_text, fast=fast_grammar))
    feats.update(_readability_features(essay_text))
    feats.update(_vocabulary_features(essay_text))
    feats.update(_organization_features(essay_text))
    feats.update(_pos_features(essay_text))
    feats.update(_relevance_features(essay_text, source_text, prompt_name))
    feats.update(_normalised_features(feats))   # must come last — reads from feats

    return feats


def _empty_features():
    """Zero-valued feature dict for empty / too-short essays."""
    return {
        "word_count": 0, "sentence_count": 0, "paragraph_count": 0,
        "char_count": 0, "avg_sentence_length": 0.0, "avg_word_length": 0.0,
        "grammar_errors": 0, "grammar_error_rate": 0.0,
        "spelling_errors": 0, "punct_errors": 0,
        "flesch_reading_ease": 50.0, "fk_grade": 8.0, "gunning_fog": 10.0,
        "ari": 8.0, "avg_syllables_pw": 1.5, "difficult_word_ratio": 0.1,
        "ttr": 0.0, "corrected_ttr": 0.0, "unique_words": 0,
        "hapax_ratio": 0.0, "long_word_ratio": 0.0,
        "academic_count": 0, "academic_ratio": 0.0, "avg_word_len_v": 0.0,
        "has_intro": 0, "has_conclusion": 0, "intro_score": 0.0,
        "conclusion_score": 0.0, "transition_count": 0, "unique_transitions": 0,
        "sent_len_variance": 0,
        "noun_ratio": 0.0, "verb_ratio": 0.0, "adj_ratio": 0.0,
        "adv_ratio": 0.0, "pron_ratio": 0.0,
        "relevance_score": 0.0, "topic_similarity": 0.0,
        # normalised features (added to reduce length bias)
        "errors_per_100_words": 0.0, "transitions_per_paragraph": 0.0,
        "unique_ratio": 0.0,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Batch feature matrix builder
# ──────────────────────────────────────────────────────────────────────────────

def build_feature_matrix(df, fast_grammar=True):
    """
    Build feature matrix X and target series y for the full dataframe.

    Parameters
    ----------
    df           : pd.DataFrame  (output of preprocessing.prepare_dataset)
    fast_grammar : bool  – if True, use heuristic grammar features (fast)
                           if False, use LanguageTool (slow but accurate)

    Returns
    -------
    (pd.DataFrame X,  pd.Series y)

    Note on speed
    -------------
    fast_grammar=True  → ~0.05 s/essay → 2000 essays ≈  1.5 min
    fast_grammar=False → ~0.8 s/essay  → 2000 essays ≈ 27 min  (LanguageTool)
    The sentence-transformer model adds ~0.05 s/essay on CPU after first load.
    """
    mode = "fast heuristics" if fast_grammar else "LanguageTool (slow)"
    print(f"\n[INFO] Feature extraction mode: grammar = {mode}")
    print(f"[INFO] Processing {len(df):,} essays…")

    rows = []
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Extracting features"):
        essay   = row.get("cleaned_text", "")
        source  = row.get("source_text", "")
        prompt  = row.get("prompt_name", "")
        feats   = extract_all_features(essay, source_text=source,
                                        prompt_name=prompt,
                                        fast_grammar=fast_grammar)
        rows.append(feats)

    X = pd.DataFrame(rows).fillna(0)
    y = df["score"].astype(float).reset_index(drop=True)

    print(f"[INFO] Feature matrix : {X.shape[0]:,} rows × {X.shape[1]} features")
    missing = X.isnull().sum().sum()
    if missing:
        print(f"[WARN] {missing} missing values filled with 0")

    return X, y


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from utils.preprocessing import load_asap_dataset, prepare_dataset

    df_raw = load_asap_dataset()
    df = prepare_dataset(df_raw, sample_size=50)

    X, y = build_feature_matrix(df, fast_grammar=True)

    print(f"\nFeature names ({X.shape[1]}):")
    print(list(X.columns))

    print(f"\nTarget distribution:")
    print(y.value_counts().sort_index().to_string())

    print(f"\nSample features (first essay):")
    for k, v in X.iloc[0].items():
        print(f"  {k:<25}: {v:.4f}" if isinstance(v, float) else f"  {k:<25}: {v}")
