"""
demo.py
-------
Live demonstration of the essay scoring and feedback system.

Usage:
  python demo.py              -> score a built-in sample essay
  python demo.py --input      -> type / paste your own essay
  python demo.py --file essay.txt -> load essay from a text file
"""

import sys
import argparse
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from utils.scoring import score_essay, print_score_report
from utils.feedback import generate_feedback, print_feedback_report

# ── Built-in sample essay (used when no input flag given) ─────────────────────
SAMPLE_ESSAY = """
In "The Challenge of Exploring Venus," the author makes a compelling argument
that studying Venus is a worthy scientific pursuit despite the dangers involved.
The author effectively supports this claim through multiple lines of evidence.

First, the author explains that Venus was once Earth-like and may have harboured
life, making it scientifically valuable. Furthermore, NASA has proposed an
innovative blimp-like vehicle that would hover 30 miles above the surface,
avoiding the extreme heat and pressure. Additionally, silicon carbide electronics
have been tested in simulated Venusian conditions and survived for three weeks.

However, the author acknowledges that hovering vehicles cannot collect physical
samples from a distance. Therefore, scientists are also developing mechanical
computers that are resistant to extreme conditions.

In conclusion, the author strongly supports the claim with scientific reasoning
and practical engineering solutions. Consequently, exploring Venus is both
feasible and essential for advancing our understanding of planetary science.
"""

SAMPLE_SOURCE = """
Venus has extreme surface conditions: temperatures over 800 degrees Fahrenheit,
atmospheric pressure 90 times that of Earth, and corrosive sulfuric acid clouds.
NASA proposes a blimp hovering 30 miles above the surface. Silicon carbide
electronics survived three weeks in simulated Venusian conditions. Mechanical
computers using gears are resistant to heat and pressure. Venus was once
Earth-like and may have supported life, making it scientifically valuable.
"""

SAMPLE_PROMPT = "Exploring Venus"


def run_demo(essay_text, source_text=None, prompt_name=None):
    """Score an essay and print full score + feedback report."""

    print("\n" + "=" * 62)
    print("  ESSAY INPUT (first 300 characters)")
    print("=" * 62)
    print(essay_text.strip()[:300] + ("..." if len(essay_text.strip()) > 300 else ""))

    print("\n[Scoring essay... please wait]")
    result = score_essay(essay_text, source_text=source_text, prompt_name=prompt_name)

    print_score_report(result)

    feedback = generate_feedback(result)
    print_feedback_report(feedback, result)


def main():
    parser = argparse.ArgumentParser(description="Essay Scoring Demo")
    parser.add_argument("--input", action="store_true",
                        help="Type or paste an essay interactively")
    parser.add_argument("--file", type=str, default=None,
                        help="Path to a .txt file containing the essay")
    args = parser.parse_args()

    if args.file:
        # Load essay from file
        with open(args.file, encoding="utf-8", errors="replace") as f:
            essay = f.read()
        print(f"[INFO] Loaded essay from: {args.file}")
        run_demo(essay, source_text=SAMPLE_SOURCE, prompt_name=SAMPLE_PROMPT)

    elif args.input:
        # Interactive input
        print("\n" + "=" * 62)
        print("  PASTE YOUR ESSAY BELOW")
        print("  When done, press Enter then type END on a new line")
        print("=" * 62)
        lines = []
        while True:
            line = input()
            if line.strip().upper() == "END":
                break
            lines.append(line)
        essay = "\n".join(lines)
        run_demo(essay, source_text=SAMPLE_SOURCE, prompt_name=SAMPLE_PROMPT)

    else:
        # Default: use built-in sample essay
        print("[INFO] Using built-in sample essay. Run with --input to type your own.")
        run_demo(SAMPLE_ESSAY, source_text=SAMPLE_SOURCE, prompt_name=SAMPLE_PROMPT)


if __name__ == "__main__":
    main()
