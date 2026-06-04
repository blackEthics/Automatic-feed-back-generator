"""
gunicorn.conf.py
----------------
Gunicorn settings and per-worker model preloading.

Why post_fork and not a shell preload script?
  A shell script that imports models runs in its own process and exits —
  the loaded models never reach gunicorn's workers. post_fork fires inside
  each worker process after it is forked from the master, before the uvicorn
  event loop starts. Models loaded here are live in the worker's memory and
  serve every subsequent request without re-initialisation.

Approximate RAM per worker:
  spaCy en_core_web_sm          ~50 MB
  sentence-transformers model   ~90 MB
  LanguageTool JVM             ~250 MB
  Python + app overhead        ~100 MB
  ──────────────────────────────────────
  Total                        ~490 MB

  → Keep WEB_CONCURRENCY=1 on Render free tier (512 MB).
  → Use Render Starter (2 GB) for WEB_CONCURRENCY=2 or higher.
"""

import logging

log = logging.getLogger("gunicorn.error")


def post_fork(server, worker):
    """Called by gunicorn inside each worker after forking, before serving."""
    pid = worker.pid

    log.info("[worker %s] pre-loading NLP models...", pid)

    log.info("[worker %s] loading spaCy en_core_web_sm", pid)
    from utils.preprocessing import _get_nlp
    nlp = _get_nlp()
    log.info("[worker %s] spaCy: %s", pid, "ok" if nlp else "UNAVAILABLE")

    log.info("[worker %s] loading sentence-transformers (all-MiniLM-L6-v2)", pid)
    from utils.relevance import _get_model
    st = _get_model()
    log.info("[worker %s] sentence-transformers: %s", pid, "ok" if st else "UNAVAILABLE")

    log.info("[worker %s] starting LanguageTool JVM", pid)
    from utils.grammar import _get_lt
    lt = _get_lt()
    log.info(
        "[worker %s] LanguageTool: %s",
        pid,
        "ok" if lt else "UNAVAILABLE — grammar will use fast heuristic mode",
    )

    log.info("[worker %s] all models ready; handing off to uvicorn", pid)
