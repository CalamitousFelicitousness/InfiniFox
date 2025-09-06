#!/bin/bash

# Remove empty directories identified in consistency project
# Phase 4 cleanup task

echo "Removing empty directories..."

# Remove empty test directory at root
if [ -d "test" ] && [ -z "$(ls -A test)" ]; then
    rmdir test
    echo "✓ Removed empty test/ directory"
else
    echo "⚠ test/ directory not empty or doesn't exist"
fi

# Remove empty styles directory in src
if [ -d "src/styles" ] && [ -z "$(ls -A src/styles)" ]; then
    rmdir src/styles
    echo "✓ Removed empty src/styles/ directory"
else
    echo "⚠ src/styles/ directory not empty or doesn't exist"
fi

echo "Cleanup complete"
