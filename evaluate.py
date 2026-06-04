"""
evaluate.py
-----------
Comprehensive model evaluation and visualisation.

Reads pre-computed predictions (from train.py) and produces:

Metrics:
  - MAE   (Mean Absolute Error)
  - RMSE  (Root Mean Squared Error)
  - R²    (Coefficient of Determination)
  - Exact accuracy   (% of rounded predictions matching true integer score)
  - ±1 accuracy      (% within one point of true score)

Visualisations saved to ./evaluation/:
  score_distribution.png   – class distribution in test set
  correlation_heatmap.png  – top-feature × target correlation matrix
  error_analysis.png       – three-panel error breakdown
  feature_importance.png   – bar chart of Random Forest importance

Text report:
  evaluation_report.txt    – full metrics table and context notes

Usage:
  python evaluate.py

Run train.py first to generate the required data files.
"""

import os
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_DIR = "./data"
EVAL_DIR = "./evaluation"
os.makedirs(EVAL_DIR, exist_ok=True)


# ------------------------------------------------------------------------------
# Data loading helpers
# ------------------------------------------------------------------------------

def _load_predictions():
    path = os.path.join(DATA_DIR, "predictions.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"'{path}' not found. Run train.py first."
        )
    return pd.read_csv(path)


def _load_features():
    xp = os.path.join(DATA_DIR, "features.csv")
    yp = os.path.join(DATA_DIR, "targets.csv")
    if not os.path.exists(xp):
        raise FileNotFoundError(f"'{xp}' not found. Run train.py first.")
    return pd.read_csv(xp), pd.read_csv(yp).squeeze()


# ------------------------------------------------------------------------------
# Metrics
# ------------------------------------------------------------------------------

def compute_metrics(y_true, y_pred, model_name=""):
    """Compute full set of regression + pseudo-classification metrics."""
    yp = np.clip(y_pred, 1.0, 6.0)

    mae  = mean_absolute_error(y_true, yp)
    rmse = np.sqrt(mean_squared_error(y_true, yp))
    r2   = r2_score(y_true, yp)

    yt_r = np.clip(np.round(y_true), 1, 6).astype(int)
    yp_r = np.clip(np.round(yp),     1, 6).astype(int)

    exact   = np.mean(yt_r == yp_r)
    adj_acc = np.mean(np.abs(yt_r - yp_r) <= 1)

    return {
        "model": model_name, "MAE": mae, "RMSE": rmse, "R2": r2,
        "Exact_Acc": exact, "Adj_Acc": adj_acc,
    }


def analyze_errors(y_true, y_pred, model_name=""):
    """Print and return detailed error statistics."""
    errors = np.clip(y_pred, 1.0, 6.0) - y_true
    stats = {
        "bias":              np.mean(errors),
        "std":               np.std(errors),
        "max_over":          np.max(errors),
        "max_under":         np.min(errors),
        "pct_within_half":   np.mean(np.abs(errors) <= 0.5) * 100,
        "pct_within_one":    np.mean(np.abs(errors) <= 1.0) * 100,
    }
    print(f"\n  Error analysis – {model_name}")
    print(f"    Bias (mean error)  : {stats['bias']:+.4f}")
    print(f"    Std of errors      : {stats['std']:.4f}")
    print(f"    Max over-estimate  : {stats['max_over']:+.4f}")
    print(f"    Max under-estimate : {stats['max_under']:+.4f}")
    print(f"    Within ±0.5        : {stats['pct_within_half']:.1f}%")
    print(f"    Within ±1.0        : {stats['pct_within_one']:.1f}%")
    return stats


# ------------------------------------------------------------------------------
# Visualisations
# ------------------------------------------------------------------------------

def plot_score_distribution(y_true):
    """Bar chart of score class counts."""
    vals, cnts = np.unique(np.clip(np.round(y_true), 1, 6).astype(int),
                           return_counts=True)
    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(vals, cnts, color="steelblue", edgecolor="white", alpha=0.85)
    ax.set_xlabel("ASAP Score (1–6)")
    ax.set_ylabel("Number of Essays")
    ax.set_title("Score Distribution – Test Set")
    ax.set_xticks(range(1, 7))
    for bar, c in zip(bars, cnts):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 3,
                str(c), ha="center", va="bottom", fontsize=9)
    plt.tight_layout()
    out = os.path.join(EVAL_DIR, "score_distribution.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] {out}")


def plot_correlation_heatmap(X_full, y_full, top_n=15):
    """Correlation heatmap of top N features correlated with target."""
    corrs = X_full.corrwith(pd.Series(y_full.values[:len(X_full)],
                                       name="score")).abs()
    top_feats = corrs.nlargest(top_n).index.tolist()

    data = X_full[top_feats].copy()
    data["score"] = y_full.values[:len(X_full)]
    cm   = data.corr()

    mask = np.triu(np.ones_like(cm, dtype=bool))
    fig, ax = plt.subplots(figsize=(12, 10))
    sns.heatmap(cm, mask=mask, annot=True, fmt=".2f",
                cmap="RdYlGn", center=0, ax=ax,
                annot_kws={"size": 7}, linewidths=0.4)
    ax.set_title(f"Feature Correlation Heatmap (top {top_n} + target)")
    plt.tight_layout()
    out = os.path.join(EVAL_DIR, "correlation_heatmap.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] {out}")


def plot_error_analysis(pred_df):
    """Three-panel error analysis for the ensemble model."""
    y_true = pred_df["actual"].values
    y_pred = np.clip(pred_df["ensemble_pred"].values, 1.0, 6.0)
    errors = y_pred - y_true

    fig, axes = plt.subplots(1, 3, figsize=(16, 5))

    # Panel 1: error histogram
    axes[0].hist(errors, bins=35, color="salmon", edgecolor="white", alpha=0.85)
    axes[0].axvline(0, color="red", linestyle="--", lw=2, label="Zero error")
    axes[0].axvline(errors.mean(), color="royalblue", linestyle="--", lw=1.5,
                    label=f"Mean={errors.mean():+.3f}")
    axes[0].set_xlabel("Prediction Error")
    axes[0].set_ylabel("Count")
    axes[0].set_title("Error Distribution (Ensemble)")
    axes[0].legend(fontsize=8)

    # Panel 2: mean error per actual score
    score_vals = sorted(set(np.clip(np.round(y_true), 1, 6).astype(int)))
    means, stds = [], []
    for sv in score_vals:
        mask  = np.clip(np.round(y_true), 1, 6).astype(int) == sv
        means.append(errors[mask].mean())
        stds.append(errors[mask].std())

    axes[1].bar(score_vals, means, yerr=stds, color="steelblue", alpha=0.75,
                capsize=5, error_kw={"elinewidth": 1.5})
    axes[1].axhline(0, color="red", linestyle="--", lw=1.5)
    axes[1].set_xlabel("Actual Score")
    axes[1].set_ylabel("Mean Prediction Error")
    axes[1].set_title("Bias per Score Level")
    axes[1].set_xticks(score_vals)

    # Panel 3: scatter actual vs predicted
    axes[2].scatter(y_true, y_pred, alpha=0.20, s=8, color="steelblue")
    axes[2].plot([1, 6], [1, 6], "r--", lw=1.5, label="Perfect prediction")
    axes[2].set_xlabel("Actual Score")
    axes[2].set_ylabel("Predicted Score")
    axes[2].set_title("Actual vs Predicted (Ensemble)")
    axes[2].set_xlim(0.5, 6.5)
    axes[2].set_ylim(0.5, 6.5)
    axes[2].legend(fontsize=8)

    plt.tight_layout()
    out = os.path.join(EVAL_DIR, "error_analysis.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] {out}")


def plot_feature_importance():
    """Horizontal bar chart of top-15 Random Forest features."""
    path = os.path.join(DATA_DIR, "feature_importance.csv")
    if not os.path.exists(path):
        print("[WARN] feature_importance.csv not found – skipping plot.")
        return
    df = pd.read_csv(path).head(15)
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(df["feature"][::-1], df["importance"][::-1],
            color="steelblue", alpha=0.85)
    ax.set_xlabel("Importance Score")
    ax.set_title("Top 15 Feature Importances (Random Forest)")
    plt.tight_layout()
    out = os.path.join(EVAL_DIR, "feature_importance.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] {out}")


# ------------------------------------------------------------------------------
# Text report
# ------------------------------------------------------------------------------

def write_report(all_metrics, error_stats):
    """Write a plain-text evaluation report."""
    path = os.path.join(EVAL_DIR, "evaluation_report.txt")

    with open(path, "w", encoding="utf-8") as f:
        f.write("=" * 72 + "\n")
        f.write("ESSAY SCORING SYSTEM  –  EVALUATION REPORT\n")
        f.write("=" * 72 + "\n\n")

        # Metrics table
        f.write(f"{'Model':<25} {'MAE':>7} {'RMSE':>7} {'R²':>7} "
                f"{'Exact%':>8} {'±1 Acc%':>9}\n")
        f.write("-" * 70 + "\n")
        for m in all_metrics:
            f.write(
                f"{m['model']:<25} {m['MAE']:>7.4f} {m['RMSE']:>7.4f} "
                f"{m['R2']:>7.4f} {m['Exact_Acc']:>7.1%} "
                f"{m['Adj_Acc']:>8.1%}\n"
            )

        f.write("\n\n")
        f.write("[METRIC DEFINITIONS]\n")
        f.write("  MAE     – Mean Absolute Error (avg prediction error in score points)\n")
        f.write("  RMSE    – Root Mean Squared Error (larger errors penalised more)\n")
        f.write("  R²      – Coefficient of determination (1.0 = perfect fit)\n")
        f.write("  Exact%  – % essays with predicted integer score == true score\n")
        f.write("  ±1 Acc% – % essays predicted within ±1 score point of truth\n")

        f.write("\n[ACADEMIC BENCHMARKS]\n")
        f.write("  Human rater agreement on ASAP 2.0:\n")
        f.write("    MAE ≈ 0.5–0.8   Adjacent accuracy ≈ 85–95%\n")
        f.write("  Competitive AES systems (BERT-based):\n")
        f.write("    MAE ≈ 0.4–0.6   R² ≈ 0.65–0.80\n")
        f.write("  This system (feature-based ML, no fine-tuning):\n")
        f.write("    Expected MAE ≈ 0.6–0.9  (reasonable for a lightweight system)\n")

        f.write("\n[LIMITATIONS]\n")
        f.write("  1. Feature-based models cannot capture deep semantic meaning.\n")
        f.write("  2. Grammar heuristics undercount complex errors.\n")
        f.write("  3. Relevance scoring depends on quality of source text.\n")
        f.write("  4. Score 5–6 classes are rare (class imbalance).\n")

    print(f"[Saved] {path}")


# ------------------------------------------------------------------------------
# Main entry point
# ------------------------------------------------------------------------------

def main():
    print("=" * 62)
    print("ESSAY SCORING MODEL  –  EVALUATION")
    print("=" * 62)

    # Load saved outputs from training
    print("\n[1/4] Loading predictions and features...")
    pred_df = _load_predictions()
    X_full, y_full = _load_features()
    y_true  = pred_df["actual"].values
    print(f"  Test set : {len(pred_df):,} essays")

    # Metrics for every model column
    print("\n[2/4] Computing metrics...")
    pred_cols   = [c for c in pred_df.columns if c.endswith("_pred")]
    all_metrics = []
    all_errors  = {}

    header = (f"\n{'Model':<25} {'MAE':>7} {'RMSE':>7} {'R²':>7} "
              f"{'Exact%':>8} {'±1 Acc%':>9}")
    print(header)
    print("-" * 70)

    for col in pred_cols:
        name    = col.replace("_pred", "")
        y_pred  = pred_df[col].values
        m       = compute_metrics(y_true, y_pred, name)
        all_metrics.append(m)
        all_errors[name] = analyze_errors(y_true, y_pred, name)

        print(f"  {m['model']:<23} {m['MAE']:>7.4f} {m['RMSE']:>7.4f} "
              f"{m['R2']:>7.4f} {m['Exact_Acc']:>7.1%} {m['Adj_Acc']:>8.1%}")

    # Plots
    print("\n[3/4] Generating plots...")
    plot_score_distribution(y_true)
    plot_correlation_heatmap(X_full, y_full)
    plot_error_analysis(pred_df)
    plot_feature_importance()

    # Text report
    print("\n[4/4] Writing evaluation report...")
    write_report(all_metrics, all_errors)

    print("\n" + "=" * 62)
    print("EVALUATION COMPLETE")
    print(f"  All outputs saved in: {EVAL_DIR}/")
    print("=" * 62)


if __name__ == "__main__":
    main()
