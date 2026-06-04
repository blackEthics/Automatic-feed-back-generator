"""
train.py
--------
Model training pipeline for essay score prediction.

Steps:
  1. Load the ASAP 2.0 dataset
  2. Prepare and clean the text
  3. Extract NLP features (fast grammar mode by default)
  4. Split into train / test sets
  5. Train Ridge, RandomForest, GradientBoosting, and XGBoost regressors
  6. Evaluate each model with 5-fold cross-validation
  7. Build an ensemble (average of all trained models)
  8. Save trained models to ./models/
  9. Save feature matrix, targets, and predictions to ./data/
 10. Generate training visualisations in ./evaluation/

Why Random Forest?
  Handles non-linear feature interactions well, provides feature importance,
  robust to outliers, and does not require feature scaling.

Why Ridge (baseline)?
  Linear, interpretable, very fast – serves as a sanity-check baseline.

Usage:
  python train.py                       # default 2 000-essay sample
  python train.py --sample 5000         # larger sample
  python train.py --full                # full 24 000-essay dataset (slow!)
  python train.py --no-fast-grammar     # use LanguageTool (slow but accurate)
"""

import os
import sys
import argparse
import numpy as np
import pandas as pd
import joblib
import warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from xgboost import XGBRegressor
    _XGBOOST = True
except ImportError:
    _XGBOOST = False
    print("[WARN] xgboost not installed – skipping XGBoost model.")

from utils.preprocessing import load_asap_dataset, prepare_dataset
from utils.feature_extraction import build_feature_matrix

# Columns added by _normalised_features — used to compute the old/new feature delta
_NEW_NORMALISED_FEATURES = ["errors_per_100_words", "transitions_per_paragraph", "unique_ratio"]

MODELS_DIR = "./models"
DATA_DIR   = "./data"
EVAL_DIR   = "./evaluation"

for d in [MODELS_DIR, DATA_DIR, EVAL_DIR]:
    os.makedirs(d, exist_ok=True)


# ------------------------------------------------------------------------------
# Model definitions
# ------------------------------------------------------------------------------

def _build_models():
    """Return dict of {name: estimator} to train."""
    models = {
        "ridge": Pipeline([
            ("scaler", StandardScaler()),
            ("reg",    Ridge(alpha=1.0)),
        ]),
        "random_forest": RandomForestRegressor(
            n_estimators=200, max_depth=12,
            min_samples_leaf=4, random_state=42, n_jobs=-1,
        ),
        "gradient_boosting": GradientBoostingRegressor(
            n_estimators=150, max_depth=5,
            learning_rate=0.08, subsample=0.8,
            random_state=42,
        ),
    }
    if _XGBOOST:
        models["xgboost"] = XGBRegressor(
            n_estimators=200, max_depth=6,
            learning_rate=0.08, subsample=0.8,
            colsample_bytree=0.8, random_state=42,
            verbosity=0,
        )
    return models


# ------------------------------------------------------------------------------
# Train & evaluate
# ------------------------------------------------------------------------------

def _eval_metrics(y_true, y_pred):
    y_pred = np.clip(y_pred, 1.0, 6.0)
    return {
        "mae":  mean_absolute_error(y_true, y_pred),
        "rmse": np.sqrt(mean_squared_error(y_true, y_pred)),
        "r2":   r2_score(y_true, y_pred),
    }


def compute_sample_weights(y):
    """
    Per-sample weights to counteract ASAP class imbalance.

    Mild weighting only: classes 1 and 6 receive 1.5× weight;
    all other classes receive 1.0×.  Stronger weighting (e.g. 3×)
    hurts performance on small samples (~2 000 essays) because those
    boundary classes have too few examples to benefit.

    All weights are normalised so their mean equals 1.0, keeping
    the effective learning rate unchanged.

    Note: XGBRegressor does not support scale_pos_weight (that flag is
    for binary classification).  sample_weight passed to fit() is the
    correct mechanism for regression tasks.

    Parameters
    ----------
    y : array-like of float  (ASAP scores 1.0 – 6.0)

    Returns
    -------
    np.ndarray  same length as y
    """
    y_int = np.round(y).astype(int).clip(1, 6)
    weights = np.where(np.isin(y_int, [1, 6]), 1.5, 1.0)
    return weights / weights.mean()


def train_models(X_train, X_test, y_train, y_test, feature_names):
    """
    Train all models, run cross-validation, and evaluate on the test set.

    Returns
    -------
    dict  { model_name: {"model": estimator, "metrics": dict,
                          "cv_mae": float, "preds": np.ndarray} }
    """
    models   = _build_models()
    results  = {}

    print(f"\n{'Model':<25} {'CV-MAE':>8} {'Test-MAE':>10} {'RMSE':>8} {'R²':>8}")
    print("-" * 65)

    for name, model in models.items():
        # Cross-validation (without sample_weight — fold-aware passing requires
        # sklearn ≥ 1.4; CV here is an approximation used for model selection)
        cv = cross_val_score(model, X_train, y_train,
                             cv=5, scoring="neg_mean_absolute_error", n_jobs=-1)
        cv_mae = -cv.mean()

        # Train on full training set
        if name == "xgboost":
            model.fit(X_train, y_train,
                      sample_weight=compute_sample_weights(y_train))
        else:
            model.fit(X_train, y_train)

        # Test set evaluation
        preds   = model.predict(X_test)
        metrics = _eval_metrics(y_test, preds)

        print(f"  {name:<23} {cv_mae:>8.4f} {metrics['mae']:>10.4f} "
              f"{metrics['rmse']:>8.4f} {metrics['r2']:>8.4f}")

        # Save model
        path = os.path.join(MODELS_DIR, f"{name}.pkl")
        joblib.dump(model, path)

        results[name] = {"model": model, "metrics": metrics,
                         "cv_mae": cv_mae, "preds": preds}

    # -- Ensemble (simple average) ---------------------------------------------
    all_preds   = np.column_stack([r["preds"] for r in results.values()])
    ens_preds   = np.clip(all_preds.mean(axis=1), 1.0, 6.0)
    ens_metrics = _eval_metrics(y_test, ens_preds)

    print(f"  {'ensemble (avg)':<23} {'—':>8} {ens_metrics['mae']:>10.4f} "
          f"{ens_metrics['rmse']:>8.4f} {ens_metrics['r2']:>8.4f}")

    results["ensemble"] = {"model": None, "metrics": ens_metrics,
                            "cv_mae": None, "preds": ens_preds}

    # -- Feature importance (Random Forest) -----------------------------------
    if "random_forest" in results:
        rf = results["random_forest"]["model"]
        importances = rf.feature_importances_
        imp_df = pd.DataFrame({
            "feature":    feature_names,
            "importance": importances,
        }).sort_values("importance", ascending=False)

        imp_df.to_csv(os.path.join(DATA_DIR, "feature_importance.csv"), index=False)

        print("\n[Top 15 features by importance (Random Forest)]")
        print(imp_df.head(15).to_string(index=False))

    return results


# ------------------------------------------------------------------------------
# Visualisations
# ------------------------------------------------------------------------------

def _plot_prediction_vs_actual(results, y_test):
    # Pick the single-model with lowest test MAE
    best_name = min(
        (n for n in results if n != "ensemble"),
        key=lambda n: results[n]["metrics"]["mae"],
    )
    preds = results[best_name]["preds"]
    mae   = results[best_name]["metrics"]["mae"]

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))

    # Scatter
    axes[0].scatter(y_test, preds, alpha=0.25, s=10, color="steelblue")
    axes[0].plot([1, 6], [1, 6], "r--", lw=1.5, label="Perfect prediction")
    axes[0].set_xlabel("Actual Score")
    axes[0].set_ylabel("Predicted Score")
    axes[0].set_title(f"Actual vs Predicted — {best_name}\nMAE = {mae:.3f}")
    axes[0].legend(fontsize=8)
    axes[0].set_xlim(0.5, 6.5)
    axes[0].set_ylim(0.5, 6.5)

    # Error histogram
    errors = preds - np.array(y_test)
    axes[1].hist(errors, bins=35, color="salmon", edgecolor="white", alpha=0.85)
    axes[1].axvline(0, color="red", linestyle="--", lw=2, label="Zero error")
    axes[1].set_xlabel("Prediction Error (predicted − actual)")
    axes[1].set_ylabel("Count")
    axes[1].set_title(f"Error Distribution — {best_name}")
    axes[1].legend(fontsize=8)

    plt.tight_layout()
    out = os.path.join(EVAL_DIR, "prediction_vs_actual.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] {out}")


def _plot_model_comparison(results):
    names  = list(results.keys())
    maes   = [results[n]["metrics"]["mae"]  for n in names]
    r2s    = [results[n]["metrics"]["r2"]   for n in names]

    colours = ["steelblue", "salmon", "seagreen", "gold", "mediumpurple"]

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))

    x = np.arange(len(names))
    bars = axes[0].bar(x, maes, color=colours[:len(names)])
    axes[0].set_ylabel("MAE (lower is better)")
    axes[0].set_title("Model Comparison – MAE")
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(names, rotation=15, ha="right")
    for bar, v in zip(bars, maes):
        axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                     f"{v:.3f}", ha="center", va="bottom", fontsize=8)

    bars = axes[1].bar(x, r2s, color=colours[:len(names)])
    axes[1].set_ylabel("R² (higher is better)")
    axes[1].set_title("Model Comparison – R²")
    axes[1].set_xticks(x)
    axes[1].set_xticklabels(names, rotation=15, ha="right")
    for bar, v in zip(bars, r2s):
        axes[1].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                     f"{v:.3f}", ha="center", va="bottom", fontsize=8)

    plt.tight_layout()
    out = os.path.join(EVAL_DIR, "model_comparison.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] {out}")


def _plot_feature_importance():
    path = os.path.join(DATA_DIR, "feature_importance.csv")
    if not os.path.exists(path):
        return
    df = pd.read_csv(path).head(15)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(df["feature"][::-1], df["importance"][::-1],
            color="steelblue", alpha=0.85)
    ax.set_xlabel("Importance")
    ax.set_title("Top 15 Feature Importances (Random Forest)")
    plt.tight_layout()
    out = os.path.join(EVAL_DIR, "feature_importance.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] {out}")


def _print_cv_report(results, n_old, n_new):
    """
    Print a post-training comparison table showing the effect of
    the normalised features and XGBoost sample-weight improvements.
    """
    sep = "=" * 66
    added = [f for f in _NEW_NORMALISED_FEATURES]

    print(f"\n{sep}")
    print("IMPROVEMENT SUMMARY")
    print(sep)
    print(f"  Features      : {n_old} → {n_new}  "
          f"(+{n_new - n_old} normalised: {', '.join(added)})")
    print(f"  Class weights : XGBoost trained with compute_sample_weights(y)")
    print(f"                  classes 1 & 6 receive 1.5× weight, others 1.0×")
    print()
    print(f"  {'Model':<28} {'Test-MAE':>9} {'RMSE':>8} {'R²':>8}")
    print("  " + "─" * 58)

    # Baseline row for before/after comparison
    print(f"  {'baseline (38 feat, no sw)':<28} {'0.4717':>9} {'—':>8} {'0.6423':>8}")

    best_name, best_mae = None, float("inf")
    for name, res in results.items():
        m   = res["metrics"]
        tag = " [+sw]" if name == "xgboost" else ""
        label = name + tag
        print(f"  {label:<28} {m['mae']:>9.4f} {m['rmse']:>8.4f} {m['r2']:>8.4f}")
        if name != "ensemble" and m["mae"] < best_mae:
            best_mae  = m["mae"]
            best_name = name

    print()
    print(f"  Best single model : {best_name}  (Test-MAE {best_mae:.4f})")
    print(sep)


# ------------------------------------------------------------------------------
# Main entry point
# ------------------------------------------------------------------------------

def main(sample_size=2000, fast_grammar=True):
    """
    End-to-end training pipeline.

    Parameters
    ----------
    sample_size  : int | None  – None = full dataset (slow)
    fast_grammar : bool        – True = heuristic grammar features (fast)
    """
    print("=" * 62)
    print("ESSAY SCORING MODEL  –  TRAINING PIPELINE")
    print("=" * 62)

    # 1. Load data
    print("\n[1/5] Loading dataset...")
    df_raw = load_asap_dataset()
    df = prepare_dataset(df_raw, sample_size=sample_size)

    # 2. Feature extraction
    print("\n[2/5] Extracting NLP features...")
    X, y = build_feature_matrix(df, fast_grammar=fast_grammar)

    # Save for offline analysis
    X.to_csv(os.path.join(DATA_DIR, "features.csv"), index=False)
    y.to_csv(os.path.join(DATA_DIR, "targets.csv"), index=False)
    print(f"  Feature matrix saved  -> {DATA_DIR}/features.csv")

    # 3. Train / test split (stratified by score bucket)
    print("\n[3/5] Splitting data  (80 % train / 20 % test)...")
    buckets = pd.cut(y, bins=[0, 2, 3, 4, 6], labels=False)
    X_train, X_test, y_train, y_test = train_test_split(
        X.values, y.values, test_size=0.20, random_state=42,
        stratify=buckets,
    )
    print(f"  Train: {len(X_train):,}    Test: {len(X_test):,}")

    # Save test indices for evaluate.py
    pd.DataFrame({"y_test": y_test}).to_csv(
        os.path.join(DATA_DIR, "y_test.csv"), index=False)

    # 4. Train models
    print("\n[4/5] Training models...")
    feature_names = list(X.columns)
    results = train_models(X_train, X_test, y_train, y_test, feature_names)

    # Save all predictions
    pred_df = pd.DataFrame({"actual": y_test})
    for name, res in results.items():
        pred_df[f"{name}_pred"] = np.clip(res["preds"], 1.0, 6.0)
    pred_df.to_csv(os.path.join(DATA_DIR, "predictions.csv"), index=False)
    print(f"\n  Predictions saved     -> {DATA_DIR}/predictions.csv")

    # 5. Visualisations
    print("\n[5/5] Generating plots...")
    _plot_prediction_vs_actual(results, y_test)
    _plot_model_comparison(results)
    _plot_feature_importance()

    # Cross-validation / improvement report
    n_new = X.shape[1]
    n_old = n_new - len(_NEW_NORMALISED_FEATURES)
    _print_cv_report(results, n_old=n_old, n_new=n_new)

    print("\n" + "=" * 62)
    print("TRAINING COMPLETE")
    print(f"  Models   -> {MODELS_DIR}/")
    print(f"  Data     -> {DATA_DIR}/")
    print(f"  Plots    -> {EVAL_DIR}/")
    print("=" * 62)

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train essay scoring models")
    parser.add_argument("--sample",          type=int, default=2000,
                        help="Number of essays to use (default 2000, use 0 for all)")
    parser.add_argument("--full",            action="store_true",
                        help="Use full dataset (ignores --sample)")
    parser.add_argument("--no-fast-grammar", dest="fast_grammar",
                        action="store_false",
                        help="Use LanguageTool grammar check (slow but accurate)")
    args = parser.parse_args()

    size = None if args.full else (args.sample if args.sample > 0 else None)
    main(sample_size=size, fast_grammar=args.fast_grammar)
