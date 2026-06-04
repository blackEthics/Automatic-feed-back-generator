#!/usr/bin/env bash
# start.sh — Render / Heroku startup script for the essay-scoring API.
#
# Execution order:
#   1. Download NLTK corpora to disk (fast no-op on subsequent deploys).
#   2. Start gunicorn with UvicornWorker.
#   3. gunicorn.conf.py::post_fork fires in each worker and loads all NLP
#      models into memory before the worker accepts any requests.
set -euo pipefail

echo "[startup] Downloading NLTK corpora..."
python - <<'PYEOF'
import nltk
for pkg in ["punkt", "punkt_tab", "stopwords", "wordnet", "averaged_perceptron_tagger"]:
    nltk.download(pkg, quiet=True)
print("[startup] NLTK corpora ready.")
PYEOF

echo "[startup] Launching gunicorn (workers will pre-load NLP models via post_fork)..."
exec gunicorn api.main:app \
    --config gunicorn.conf.py \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers "${WEB_CONCURRENCY:-1}" \
    --bind "0.0.0.0:${PORT:-8000}" \
    --timeout 120 \
    --log-level "${LOG_LEVEL:-info}" \
    --access-logfile -
