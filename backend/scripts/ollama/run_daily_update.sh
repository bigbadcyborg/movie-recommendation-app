#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../.."
UPDATE_SCRIPT="${SCRIPT_DIR}/update-movie-list.js"

MODEL_NAME="${OLLAMA_MODEL:-cinematch-movie-curator}"
MOVIE_COUNT="${MOVIE_COUNT:-5}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-86400}"
RUN_ONCE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --once)
      RUN_ONCE="true"
      ;;
    --count)
      MOVIE_COUNT="$2"
      shift
      ;;
    --model)
      MODEL_NAME="$2"
      shift
      ;;
    --interval-seconds)
      INTERVAL_SECONDS="$2"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
  shift
done

run_update() {
  echo "[$(date -Iseconds)] Starting movie update (model=${MODEL_NAME}, count=${MOVIE_COUNT})"
  node "${UPDATE_SCRIPT}" --model "${MODEL_NAME}" --count "${MOVIE_COUNT}"
  echo "[$(date -Iseconds)] Movie update finished"
}

cd "${PROJECT_ROOT}"

if [[ "${RUN_ONCE}" == "true" ]]; then
  run_update
  exit 0
fi

while true; do
  run_update || echo "[$(date -Iseconds)] Update failed; retrying next cycle"
  sleep "${INTERVAL_SECONDS}"
done
