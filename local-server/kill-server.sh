#!/bin/bash

# Chrome Notion Plugin Server - Linux/macOS Kill Script
# Equivalent to kill-server.bat for Windows

echo ""
echo "================================"
echo "  Kill Chrome Notion Plugin Server"
echo "================================"
echo ""

echo "Searching for processes using port 3000..."
echo ""

# Find and kill all processes using port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Found processes using port 3000:"
    lsof -Pi :3000 -sTCP:LISTEN
    echo ""
    echo "Terminating processes..."
    
    # Get all PIDs using port 3000
    PIDS=$(lsof -Pi :3000 -t)
    
    for PID in $PIDS; do
        echo "- Killing PID: $PID"
        if kill -9 $PID 2>/dev/null; then
            echo "  ✓ Process $PID terminated successfully"
        else
            echo "  ✗ Warning: Could not terminate process $PID"
        fi
    done
    
    echo ""
    echo "✓ All processes on port 3000 have been terminated"
else
    echo "✓ No processes found using port 3000"
fi

echo ""
echo "================================"
echo "Done"
echo "================================"

# Keep terminal open if running interactively
if [ -t 0 ]; then
    read -p "Press Enter to exit..."
fi
