#!/usr/bin/env python
"""
tests/test_api.py
-----------------
Integration tests for the essay-scoring API.

Usage:
    python tests/test_api.py                         # local server at :8000
    python tests/test_api.py --url http://host:port  # remote deployment
"""

import sys
import json
import argparse
import httpx

# ── Config ────────────────────────────────────────────────────────────────────
DEFAULT_URL = "http://localhost:8000"
TIMEOUT     = 180.0          # generous: LanguageTool JVM can be slow on cold start
DIMENSIONS  = {"grammar", "relevance", "organization", "clarity", "vocabulary"}

# ── Fixture essays ────────────────────────────────────────────────────────────
SHORT_ESSAY = (  # 61 words, on-topic for Driverless cars
    "Driverless cars are an exciting new technology that could make our roads "
    "significantly safer for everyone. By removing human error from driving, "
    "companies like Tesla and Waymo hope to dramatically prevent accidents. "
    "However, there are still serious concerns about reliability, cybersecurity, "
    "and potential job losses for professional drivers. The technology needs far "
    "more testing before it becomes widespread in our cities."
)

MEDIUM_ESSAY = (  # 120+ words, supplied verbatim by user
    "Driverless cars represent one of the most transformative technologies of our "
    "generation. Proponents argue that autonomous vehicles will dramatically reduce "
    "road fatalities, since human error causes approximately ninety percent of all "
    "traffic accidents. Furthermore, self-driving technology promises to improve "
    "mobility for elderly and disabled populations who cannot operate conventional "
    "vehicles. However, critics raise legitimate concerns about cybersecurity "
    "vulnerabilities, since a hacked autonomous vehicle could become a dangerous "
    "weapon. The economic disruption to professional drivers, who number in the "
    "millions globally, also demands serious policy attention. In conclusion, while "
    "the potential benefits of driverless cars are substantial, their widespread "
    "adoption requires robust regulatory frameworks, rigorous safety testing, and "
    "proactive social policies to manage job displacement."
)

TINY_ESSAY = "Cars drive fast sometimes."  # 5 words --well under the 20-word minimum


# ── Individual test functions ─────────────────────────────────────────────────
# Each returns (passed: bool, actual: str).
# test_medium_essay also writes into `captured` for later JSON printing.

def test_health(client):
    """GET /health → 200 {"status": "ok"}"""
    r = client.get("/health")
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
    ok = r.status_code == 200 and body == {"status": "ok"}
    return ok, f"HTTP {r.status_code}  body={body}"


def test_short_essay(client):
    """POST /score ~61-word essay → score within expected ranges, all dims, fast"""
    r = client.post(
        "/score",
        json={"essay_text": SHORT_ESSAY, "prompt_name": "Driverless cars"},
    )
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}  body={r.text[:200]}"

    d       = r.json()
    overall = d["overall_score"]
    asap    = d["asap_score"]
    dims    = set(d["dimensions"].keys())
    ms      = d["processing_time_ms"]

    failures = []
    if not (40 <= overall <= 85):
        failures.append(f"overall_score={overall} (expected 40–85)")
    if not (1.0 <= asap <= 6.0):
        failures.append(f"asap_score={asap} (expected 1.0–6.0)")
    if dims != DIMENSIONS:
        failures.append(f"dimensions={dims}")
    if ms >= 5000:
        failures.append(f"processing_time_ms={ms} (expected <5000)")

    actual = f"overall={overall}, asap={asap}, dims={'ok' if not failures else dims}, time={ms:.0f}ms"
    if failures:
        actual += "  FAIL: " + "; ".join(failures)
    return len(failures) == 0, actual


def test_medium_essay(client, captured):
    """POST /score 120+-word essay → complete, well-formed response"""
    r = client.post("/score", json={"essay_text": MEDIUM_ESSAY})
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}  body={r.text[:200]}"

    d = r.json()
    captured["t3"] = d          # saved for JSON dump after summary

    failures = []

    # Top-level keys
    for key in ("overall_score", "asap_score", "dimensions", "feedback",
                "word_count", "processing_time_ms"):
        if key not in d:
            failures.append(f"missing key '{key}'")

    # Dimensions
    if "dimensions" in d:
        if set(d["dimensions"].keys()) != DIMENSIONS:
            failures.append(f"wrong dimension keys: {set(d['dimensions'].keys())}")
        for dim, v in d["dimensions"].items():
            if "score" not in v or "max" not in v:
                failures.append(f"dimension '{dim}' missing score/max")

    # Feedback
    if "feedback" in d:
        for key in ("overall", "priority", "specific_tips"):
            if key not in d["feedback"]:
                failures.append(f"feedback missing '{key}'")
        if "specific_tips" in d["feedback"] and not isinstance(d["feedback"]["specific_tips"], list):
            failures.append("specific_tips is not a list")

    # Value ranges
    if "overall_score" in d and not (0 <= d["overall_score"] <= 100):
        failures.append(f"overall_score out of range: {d['overall_score']}")
    if "asap_score" in d and not (1.0 <= d["asap_score"] <= 6.0):
        failures.append(f"asap_score out of range: {d['asap_score']}")

    actual = (
        f"overall={d.get('overall_score')}, asap={d.get('asap_score')}, "
        f"words={d.get('word_count')}, time={d.get('processing_time_ms', 0):.0f}ms"
    )
    if failures:
        actual += "  FAIL: " + "; ".join(failures)
    return len(failures) == 0, actual


def test_missing_field(client):
    """POST /score with no fields → HTTP 422 (Pydantic: field required)"""
    r = client.post("/score", json={})
    ok = r.status_code == 422
    return ok, f"HTTP {r.status_code}"


def test_too_short(client):
    """POST /score with 5-word essay → HTTP 422 (below 20-word minimum)"""
    # The API enforces MIN_WORDS=20 via HTTPException(422), not 400.
    # We assert 4xx so the test survives if the threshold is ever relaxed to 400.
    r = client.post("/score", json={"essay_text": TINY_ESSAY})
    ok = 400 <= r.status_code < 500
    detail = ""
    try:
        detail = r.json().get("detail", "")[:80]
    except Exception:
        detail = r.text[:80]
    return ok, f"HTTP {r.status_code}  detail={detail!r}"


def test_consistency(client):
    """POST /score same essay twice → identical overall_score (deterministic)"""
    payload = {"essay_text": MEDIUM_ESSAY}
    r1 = client.post("/score", json=payload)
    r2 = client.post("/score", json=payload)

    if r1.status_code != 200 or r2.status_code != 200:
        return False, f"HTTP {r1.status_code} / {r2.status_code}"

    s1 = r1.json()["overall_score"]
    s2 = r2.json()["overall_score"]
    return s1 == s2, f"{s1} == {s2}" if s1 == s2 else f"{s1} != {s2}  (NOT deterministic)"


# ── Runner ────────────────────────────────────────────────────────────────────

def run(base_url):
    print(f"\nEssay Scoring API --integration tests")
    print(f"Target : {base_url}")
    print(f"Timeout: {TIMEOUT}s per request\n")

    captured = {}
    results  = []   # list of (name, passed, actual)

    with httpx.Client(base_url=base_url, timeout=TIMEOUT) as client:
        tests = [
            ("T1 --health check",          lambda c: test_health(c)),
            ("T2 --short essay (61 w)",    lambda c: test_short_essay(c)),
            ("T3 --medium essay (120+ w)", lambda c: test_medium_essay(c, captured)),
            ("T4 --missing essay_text",    lambda c: test_missing_field(c)),
            ("T5 --too-short essay (5 w)", lambda c: test_too_short(c)),
            ("T6 --score consistency",     lambda c: test_consistency(c)),
        ]

        for name, fn in tests:
            try:
                passed, actual = fn(client)
            except Exception as exc:
                passed, actual = False, f"EXCEPTION: {exc}"

            results.append((name, passed, actual))
            mark = "PASS" if passed else "FAIL"
            print(f"  [{mark}]  {name}")
            if not passed:
                print(f"           {actual}")

    # ── Full JSON dump for T3 ─────────────────────────────────────────────────
    if "t3" in captured:
        print("\n" + "-" * 66)
        print("Full JSON response --T3 (medium essay / 120+ words):")
        print("-" * 66)
        print(json.dumps(captured["t3"], indent=2))

    # ── Summary table ─────────────────────────────────────────────────────────
    name_w   = max(len(n) for n, *_ in results)
    actual_w = min(54, max(len(a) for _, __, a in results))
    border   = f"+-{'-' * name_w}-+--------+-{'-' * actual_w}-+"

    print("\n" + "-" * 66)
    print("Summary")
    print("-" * 66)
    print(border)
    print(f"| {'Test':<{name_w}} | Status | {'Actual':<{actual_w}} |")
    print(border)
    for name, passed, actual in results:
        status_cell = " PASS " if passed else " FAIL "
        actual_cell = actual if len(actual) <= actual_w else actual[: actual_w - 1] + "…"
        print(f"| {name:<{name_w}} |{status_cell}| {actual_cell:<{actual_w}} |")
    print(border)

    n_passed = sum(1 for _, p, __ in results if p)
    n_total  = len(results)
    verdict  = "All tests passed." if n_passed == n_total else f"{n_total - n_passed} test(s) FAILED."
    print(f"\n{n_passed}/{n_total} passed --{verdict}\n")

    return 0 if n_passed == n_total else 1


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Essay-scoring API integration tests")
    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help=f"Base URL of the API (default: {DEFAULT_URL})",
    )
    args = parser.parse_args()
    sys.exit(run(args.url))
