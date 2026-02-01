#!/bin/bash
lsof -t -i :3000 | xargs kill -9 2>/dev/null
lsof -t -i :8000 | xargs kill -9 2>/dev/null
exit 0
