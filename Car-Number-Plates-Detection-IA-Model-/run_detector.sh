#!/bin/bash

# This script activates the virtual environment before running the Python script

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Activate the virtual environment
if [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
    source "$SCRIPT_DIR/venv/bin/activate"
else
    echo "Virtual environment not found. Running with system Python."
fi

# Run the Python script with all arguments passed to this script
python "$SCRIPT_DIR/tunisian_plate_detector.py" "$@"

# Deactivate the virtual environment
if [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
    deactivate
fi
