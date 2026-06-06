"""
improver.py
-----------
Rule-based essay improvement engine.
Uses only existing NLP utilities — no external AI APIs.
"""

import re
from utils.preprocessing import get_paragraphs
from utils.vocabulary import ACADEMIC_WORDS
from utils.organization import TRANSITION_WORDS


def _get_score(score_result: dict, dim: str) -> float:
    """Extract a dimension score from flat (score_essay) or dimensions-keyed (API) format."""
    if "dimensions" in score_result:
        d = score_result["dimensions"].get(dim, {})
        if isinstance(d, dict):
            return float(d.get("score", 0))
        return float(d)
    return float(score_result.get(dim, 0))


def _case_replace(text: str, pattern: str, replacement: str):
    """
    Replace all matches of *pattern* in *text* with *replacement*,
    preserving the capitalisation of the first character.

    Returns (new_text, list_of_(original, replaced) tuples).
    """
    found = []

    def _fn(m):
        orig = m.group(0)
        rep = replacement[0].upper() + replacement[1:] if orig[0].isupper() else replacement
        found.append((orig, rep))
        return rep

    new_text = re.sub(pattern, _fn, text, flags=re.IGNORECASE)
    return new_text, found


# ── Improvement rules ─────────────────────────────────────────────────────────

_GRAMMAR_FIXES = [
    (r"\balot\b",       "a lot"),
    (r"\bdont\b",       "don't"),
    (r"\bcant\b",       "can't"),
    (r"\bwont\b",       "won't"),
    (r"\bisnt\b",       "isn't"),
    (r"\barent\b",      "aren't"),
    (r"\bwasnt\b",      "wasn't"),
    (r"\bshouldnt\b",   "shouldn't"),
    (r"\bcouldnt\b",    "couldn't"),
    (r"\bwouldnt\b",    "wouldn't"),
    (r"\bdefinately\b", "definitely"),
    (r"\boccured\b",    "occurred"),
    (r"\brecieve\b",    "receive"),
    (r"\bbeleive\b",    "believe"),
    (r"\bseperate\b",   "separate"),
    (r"\buntill\b",     "until"),
]

_UPGRADE_MAP = {
    "big": "substantial",   "small": "minimal",
    "good": "beneficial",   "bad": "detrimental",
    "show": "demonstrate",  "shows": "demonstrates",
    "use": "utilize",       "uses": "utilizes",
    "help": "facilitate",   "helps": "facilitates",
    "make": "establish",    "makes": "establishes",
    "think": "consider",    "thinks": "considers",
    "but": "however",       "also": "furthermore",
    "so": "consequently",   "very": "significantly",
    "really": "considerably", "many": "numerous",
    "get": "obtain",        "gets": "obtains",
    "important": "crucial", "different": "distinct",
    "problem": "challenge", "answer": "solution",
    "need": "require",      "needs": "requires",
}

_PARA_TRANSITIONS = {1: "Furthermore, ", 2: "However, ", 3: "Additionally, "}

_INTRO_MARKERS      = ["this essay", "in this", "the following"]
_CONCLUSION_MARKERS = ["in conclusion", "to conclude", "in summary", "to summarize", "overall"]


# ── Public API ────────────────────────────────────────────────────────────────

def improve_essay(text: str, score_result: dict) -> dict:
    """
    Apply rule-based improvements to *text* guided by *score_result*.

    Parameters
    ----------
    text         : original essay text
    score_result : output of score_essay() or the /score API response

    Returns
    -------
    dict
        improved_text : str
        changes       : list[dict]
        summary       : dict
    """
    improved = text
    changes: list[dict] = []

    # ── Step 1: Grammar fixes ─────────────────────────────────────────────────
    for pattern, replacement in _GRAMMAR_FIXES:
        new_text, occurrences = _case_replace(improved, pattern, replacement)
        if occurrences:
            orig, rep = occurrences[0]
            changes.append({
                "type":     "grammar",
                "original": orig,
                "improved": rep,
                "reason":   "Spelling correction",
            })
            improved = new_text

    # Standalone lowercase "i" → "I"
    if re.search(r"\bi\b", improved):
        changes.append({
            "type":     "grammar",
            "original": "i",
            "improved": "I",
            "reason":   "Spelling correction",
        })
        improved = re.sub(r"\bi\b", "I", improved)

    # ── Step 2: Vocabulary upgrade ────────────────────────────────────────────
    vocab_score = _get_score(score_result, "vocabulary")
    if vocab_score < 12:
        upgrades = 0
        for word, upgrade in _UPGRADE_MAP.items():
            if upgrades >= 8:
                break
            if word in ACADEMIC_WORDS:
                continue
            pattern = r"\b" + re.escape(word) + r"\b"
            new_text, occurrences = _case_replace(improved, pattern, upgrade)
            if occurrences:
                orig, rep = occurrences[0]
                changes.append({
                    "type":     "vocabulary",
                    "original": orig,
                    "improved": rep,
                    "reason":   "Academic vocabulary enhancement",
                })
                improved = new_text
                upgrades += 1

    # ── Step 3: Transition injection ──────────────────────────────────────────
    org_score = _get_score(score_result, "organization")
    if org_score < 13.2:
        paragraphs = get_paragraphs(improved)
        injections = 0
        for i, para in enumerate(paragraphs[1:], 1):
            if injections >= 3:
                break
            words = para.split()
            if not words:
                continue
            first_word = words[0].lower().rstrip(",")
            if first_word not in TRANSITION_WORDS:
                transition = _PARA_TRANSITIONS.get(i, "Moreover, ")
                new_para = transition + para[0].lower() + para[1:]
                idx = improved.find(para)
                if idx != -1:
                    improved = improved[:idx] + new_para + improved[idx + len(para):]
                    changes.append({
                        "type":     "transition",
                        "original": para[:60] + ("..." if len(para) > 60 else ""),
                        "improved": new_para[:60] + ("..." if len(new_para) > 60 else ""),
                        "reason":   "Added transition for paragraph cohesion",
                    })
                    injections += 1

    # ── Step 4: Structure fixes ───────────────────────────────────────────────
    if org_score < 8:
        if not any(m in improved[:100].lower() for m in _INTRO_MARKERS):
            intro = (
                "This essay examines the key aspects and presents "
                "a well-reasoned argument supported by evidence.\n\n"
            )
            improved = intro + improved
            changes.append({
                "type":     "structure",
                "original": "",
                "improved": intro.strip(),
                "reason":   "Added introductory statement",
            })

        if not any(m in improved[-100:].lower() for m in _CONCLUSION_MARKERS):
            conclusion = (
                "\n\nIn conclusion, the evidence presented demonstrates "
                "the significance of this topic and supports the arguments made above."
            )
            improved = improved + conclusion
            changes.append({
                "type":     "structure",
                "original": "",
                "improved": conclusion.strip(),
                "reason":   "Added concluding statement",
            })

    # ── Summary ───────────────────────────────────────────────────────────────
    return {
        "improved_text": improved,
        "changes":       changes,
        "summary": {
            "grammar_fixes":       sum(1 for c in changes if c["type"] == "grammar"),
            "vocabulary_upgrades": sum(1 for c in changes if c["type"] == "vocabulary"),
            "transitions_added":   sum(1 for c in changes if c["type"] == "transition"),
            "structure_fixes":     sum(1 for c in changes if c["type"] == "structure"),
            "total_changes":       len(changes),
        },
    }
