"""
preprocessing.py
----------------
Dataset loading and text preprocessing pipeline.

Responsibilities:
  - Auto-detect and load the ASAP 2.0 dataset from ./Dataset/
  - Print dataset exploration statistics
  - Clean and normalise essay text
  - Tokenise into sentences, words, paragraphs
  - Lemmatise tokens
  - Extract POS tag ratios via spaCy

Run directly to test:
  python utils/preprocessing.py
"""

import os
import glob
import re
import pandas as pd
import numpy as np
import nltk
import spacy
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# ── NLTK downloads (silent on subsequent runs) ────────────────────────────────
for _pkg in ['punkt', 'punkt_tab', 'stopwords', 'wordnet', 'averaged_perceptron_tagger']:
    nltk.download(_pkg, quiet=True)

# ── spaCy model (loaded lazily so import is fast) ─────────────────────────────
_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("[WARN] spaCy model not found. Run: python -m spacy download en_core_web_sm")
            _nlp = False          # sentinel so we don't retry every call
    return _nlp if _nlp else None

# ── Constants ─────────────────────────────────────────────────────────────────
DATASET_DIR = "./Dataset"


# ──────────────────────────────────────────────────────────────────────────────
# Dataset loading
# ──────────────────────────────────────────────────────────────────────────────

def find_dataset_files(directory=DATASET_DIR):
    """Return all CSV/TSV/XLSX paths found recursively under *directory*."""
    found = []
    for pattern in ["**/*.csv", "**/*.tsv", "**/*.xlsx"]:
        found.extend(glob.glob(os.path.join(directory, pattern), recursive=True))
    return found


def load_asap_dataset(filepath=None):
    """
    Load the ASAP 2.0 dataset.

    If *filepath* is None the function auto-detects the first file found
    inside ./Dataset/.

    Returns
    -------
    pd.DataFrame
    """
    if filepath is None:
        files = find_dataset_files()
        if not files:
            raise FileNotFoundError(
                f"No dataset files found in '{DATASET_DIR}'. "
                "Make sure the CSV lives under ./Dataset/"
            )
        filepath = files[0]
        print(f"[INFO] Auto-detected dataset: {filepath}")

    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(filepath)
    elif ext == ".tsv":
        df = pd.read_csv(filepath, sep="\t")
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(filepath)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    print(f"[INFO] Loaded {df.shape[0]:,} rows × {df.shape[1]} columns")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Dataset exploration
# ──────────────────────────────────────────────────────────────────────────────

def explore_dataset(df):
    """Print a comprehensive summary of *df* and return it unchanged."""
    sep = "=" * 60
    print(f"\n{sep}\nDATASET EXPLORATION\n{sep}")

    print(f"\n  Shape   : {df.shape}")
    print(f"  Columns : {list(df.columns)}")

    print("\n  Sample rows (2):")
    display_cols = [c for c in ['essay_id', 'score', 'prompt_name', 'full_text'] if c in df.columns]
    print(df[display_cols].head(2).to_string())

    print("\n  Missing values:")
    missing = df.isnull().sum()
    if missing.any():
        print(missing[missing > 0].to_string())
    else:
        print("    None")

    print("\n  Score distribution:")
    for score, cnt in df["score"].value_counts().sort_index().items():
        bar = "#" * (cnt // 200)
        print(f"    Score {score}: {cnt:6,}  {bar}")

    print("\n  Score statistics:")
    print(df["score"].describe().to_string())

    print("\n  Essays per prompt:")
    for prompt, cnt in df["prompt_name"].value_counts().items():
        print(f"    {str(prompt)[:55]:<55}: {cnt:,}")

    tmp = df.copy()
    tmp["_wc"] = df["full_text"].fillna("").apply(lambda x: len(str(x).split()))
    print("\n  Essay word-count statistics:")
    print(tmp["_wc"].describe().to_string())

    print(sep + "\n")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Text cleaning helpers
# ──────────────────────────────────────────────────────────────────────────────

def clean_text(text):
    """
    Clean and normalise essay text.

    Keeps punctuation (needed for grammar analysis) but collapses whitespace,
    normalises smart-quotes, and removes non-printable characters.

    Parameters
    ----------
    text : str | any

    Returns
    -------
    str
    """
    if not isinstance(text, str) or not text.strip():
        return ""

    # Normalise line endings
    text = re.sub(r"\r\n|\r", "\n", text)
    # Collapse horizontal whitespace to a single space
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse 3+ consecutive blank lines to two
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Smart quotes → ASCII
    text = (text
            .replace("‘", "'").replace("’", "'")
            .replace("“", '"').replace("”", '"'))

    # Strip non-printable (keep newlines)
    text = re.sub(r"[^\x20-\x7E\n]", "", text)

    return text.strip()


def get_paragraphs(text):
    """Split *text* into non-empty paragraphs."""
    if not text:
        return []
    parts = [p.strip() for p in text.split("\n\n") if p.strip()]
    # Fall back to single newlines if no double newlines found
    if len(parts) <= 1:
        parts = [p.strip() for p in text.split("\n") if p.strip()]
    return parts


def tokenize_sentences(text):
    """Return a list of sentence strings."""
    if not text:
        return []
    return sent_tokenize(text)


def tokenize_words(text, remove_stopwords=False, lowercase=True):
    """
    Tokenise *text* into alphabetic word tokens.

    Parameters
    ----------
    text             : str
    remove_stopwords : bool – filter English stopwords
    lowercase        : bool – lowercase all tokens

    Returns
    -------
    list[str]
    """
    if not text:
        return []
    tokens = [t for t in word_tokenize(text) if t.isalpha()]
    if lowercase:
        tokens = [t.lower() for t in tokens]
    if remove_stopwords:
        stops = set(stopwords.words("english"))
        tokens = [t for t in tokens if t not in stops]
    return tokens


def lemmatize_tokens(tokens):
    """Lemmatise a list of lowercase word tokens."""
    lem = WordNetLemmatizer()
    return [lem.lemmatize(t) for t in tokens]


def get_pos_tags(text):
    """
    Return a dict of POS ratios (noun, verb, adj, adv, pron) using spaCy.
    Falls back to empty dict if the model is unavailable.

    Parameters
    ----------
    text : str  (truncated to 10 000 chars for speed)

    Returns
    -------
    dict
    """
    nlp = _get_nlp()
    if nlp is None or not text:
        return {k: 0.0 for k in ("noun_ratio", "verb_ratio", "adj_ratio",
                                   "adv_ratio", "pron_ratio")}

    doc = nlp(text[:10_000])
    counts = {}
    for token in doc:
        counts[token.pos_] = counts.get(token.pos_, 0) + 1

    total = max(sum(counts.values()), 1)
    return {
        "noun_ratio": counts.get("NOUN", 0) / total,
        "verb_ratio": counts.get("VERB", 0) / total,
        "adj_ratio":  counts.get("ADJ",  0) / total,
        "adv_ratio":  counts.get("ADV",  0) / total,
        "pron_ratio": counts.get("PRON", 0) / total,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Full preprocessing pipeline for a single essay
# ──────────────────────────────────────────────────────────────────────────────

def preprocess_essay(text):
    """
    Run the full preprocessing pipeline on a single essay.

    Returns
    -------
    dict with keys: cleaned_text, paragraphs, sentences,
                    words, words_no_stopwords, lemmas
    """
    cleaned = clean_text(text)
    return {
        "cleaned_text":       cleaned,
        "paragraphs":         get_paragraphs(cleaned),
        "sentences":          tokenize_sentences(cleaned),
        "words":              tokenize_words(cleaned),
        "words_no_stopwords": tokenize_words(cleaned, remove_stopwords=True),
        "lemmas":             lemmatize_tokens(tokenize_words(cleaned, remove_stopwords=True)),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Dataset preparation
# ──────────────────────────────────────────────────────────────────────────────

def prepare_dataset(df, sample_size=None):
    """
    Clean the raw dataframe and prepare it for feature extraction.

    Steps:
      1. Fill missing text fields
      2. Clean essay and source texts
      3. Drop essays shorter than 10 words
      4. Optionally sample *sample_size* rows for faster development

    Parameters
    ----------
    df          : pd.DataFrame  (from load_asap_dataset)
    sample_size : int | None    – use None for the full dataset

    Returns
    -------
    pd.DataFrame
    """
    df = df.copy()

    df["full_text"] = df["full_text"].fillna("")
    if "source_text_1" in df.columns:
        df["source_text"] = df["source_text_1"].fillna("").apply(clean_text)
    elif "source_text" in df.columns:
        df["source_text"] = df["source_text"].fillna("").apply(clean_text)
    else:
        df["source_text"] = ""

    df["cleaned_text"] = df["full_text"].apply(clean_text)

    # Drop very short essays
    df["_wc"] = df["cleaned_text"].apply(lambda x: len(x.split()))
    before = len(df)
    df = df[df["_wc"] >= 10].drop(columns=["_wc"]).reset_index(drop=True)
    dropped = before - len(df)
    if dropped:
        print(f"[INFO] Dropped {dropped} essays with < 10 words")

    if sample_size and sample_size < len(df):
        df = df.sample(n=sample_size, random_state=42).reset_index(drop=True)
        print(f"[INFO] Using random sample of {sample_size:,} essays")

    print(f"[INFO] Dataset ready: {len(df):,} essays")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Self-test
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    df_raw = load_asap_dataset()
    explore_dataset(df_raw)

    df = prepare_dataset(df_raw, sample_size=100)

    sample = df["cleaned_text"].iloc[0]
    result = preprocess_essay(sample)

    print("[Sample essay preprocessing]")
    print(f"  Paragraphs : {len(result['paragraphs'])}")
    print(f"  Sentences  : {len(result['sentences'])}")
    print(f"  Words      : {len(result['words'])}")
    print(f"  Lemmas     : {len(result['lemmas'])}")
    print(f"  Preview    : {sample[:200]}...")
