#!/usr/bin/env bash
#
# CineMatch Ollama Agent Setup
# 
# This script initializes or updates the specialized CineMatch AI model
# using the 'ollama create' command based on the system's Modelfile.
# It ensures the environment is ready for the automated movie curation scripts.
#

set -euo pipefail

# Resolve script directory and target paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELFILE_PATH="${SCRIPT_DIR}/../../ollama/Modelfile"
MODEL_NAME="${OLLAMA_MODEL:-cinematch-movie-curator}"

# Check for Ollama CLI presence
if ! command -v ollama >/dev/null 2>&1; then
  echo "[setup] ollama is not installed or not in PATH."
  echo "[setup] Install from https://ollama.com/download and re-run this script."
  exit 1
fi

# Verify the Modelfile existence
if [[ ! -f "${MODELFILE_PATH}" ]]; then
  echo "[setup] Modelfile not found at ${MODELFILE_PATH}"
  exit 1
fi

# Create/Update the customized local model
echo "[setup] Creating/updating Ollama model '${MODEL_NAME}' from Modelfile..."
ollama create "${MODEL_NAME}" -f "${MODELFILE_PATH}"

echo "[setup] Done."
echo "[setup] Run once:      ./backend/scripts/ollama/run_daily_update.sh --once"
echo "[setup] Run as daemon: ./backend/scripts/ollama/run_daily_update.sh"
# 
# Next Steps:
# Use the scripts above to start fetching data.
#
