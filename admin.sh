#!/bin/bash
# Run admin console from the backend virtual environment
cd "$(dirname "$0")/backend" && source venv/bin/activate && python admin.py
