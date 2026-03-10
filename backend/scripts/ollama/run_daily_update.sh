#!/usr/bin/env bash
# 
# CineMatch Daily Movie Update Daemon
# 
# This script manages the scheduled execution of the movie update process.
# It can run either as a one-off command or as a background daemon that
# triggers updates at a specified interval.
#

set -euo pipefail

# Resolve paths relative to the script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../.."
UPDATE_SCRIPT="${SCRIPT_DIR}/update-movie-list.js"

# Default configuration via environment variables or fallbacks
MODEL_NAME="${OLLAMA_MODEL:-cinematch-movie-curator}"
MOVIE_COUNT="${MOVIE_COUNT:-5}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-86400}"  # Default: 24 hours
RESEED_AFTER_UPDATE="${RESEED_AFTER_UPDATE:-true}"
RUN_ONCE="false"

# Simple CLI argument parser
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
    --reseed-after-update)
      RESEED_AFTER_UPDATE="$2"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
  shift
done

# Executes a single update cycle:
# 1. Runs the Node.js update script to fetch new movies from AI.
# 2. Optionally rescinds the SQLite database with the new data.
run_update() {
  echo "[$(date -Iseconds)] Starting movie update (model=${MODEL_NAME}, count=${MOVIE_COUNT})"
  node "${UPDATE_SCRIPT}" --model "${MODEL_NAME}" --count "${MOVIE_COUNT}"

  if [[ "${RESEED_AFTER_UPDATE}" == "true" ]]; then
    echo "[$(date -Iseconds)] Re-seeding database from updated movies.json and similarities.json"
    npm run seed -- --force
  fi

  echo "[$(date -Iseconds)] Movie update finished"
}

# Ensure we are in the project root so 'npm' commands work
cd "${PROJECT_ROOT}"

# Mode: RUN ONCE
if [[ "${RUN_ONCE}" == "true" ]]; then
  run_update
  exit 0
fi

# Mode: DAEMON
echo "[$(date -Iseconds)] Starting morning update daemon (interval=${INTERVAL_SECONDS}s)"
while true; do
  run_update || echo "[$(date -Iseconds)] Update failed; retrying next cycle"
  sleep "${INTERVAL_SECONDS}"
done
