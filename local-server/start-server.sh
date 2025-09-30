#!/bin/bash

# Chrome Notion Plugin Server - Linux/macOS Start Script
# Equivalent to start-server.bat for Windows

echo ""
echo "================================"
echo "  Chrome Notion Plugin Server"
echo "================================"
echo ""
echo "Starting Node.js server..."
echo ""
echo "Server will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from: https://nodejs.org"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found in current directory"
    echo "Make sure you're running this from the local-server folder"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    echo ""
    npm install
    echo ""
fi

# Kill any existing server on port 3000
echo "Checking for existing processes on port 3000..."
echo ""

# Find and kill processes using port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Found existing server process on port 3000"
    echo "Terminating existing processes..."
    
    # Get PIDs of processes using port 3000
    PIDS=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    
    for PID in $PIDS; do
        echo "- Killing PID: $PID"
        if kill -9 $PID 2>/dev/null; then
            echo "  ✓ Process $PID terminated successfully"
        else
            echo "  ✗ Warning: Could not terminate process $PID"
        fi
    done
    
    echo ""
    echo "Waiting for port to be released..."
    sleep 2
    echo "Port 3000 is now available"
else
    echo "Port 3000 is already available"
fi
echo ""

# Start the server
echo "================================"
echo "Starting Chrome Notion Plugin Server..."
echo "================================"
echo ""
node server.js

# Keep terminal open if server stops unexpectedly (only in interactive mode)
if [ -t 0 ]; then
    echo ""
    echo "================================"
    echo "Server stopped"
    echo "================================"
    read -p "Press Enter to exit..."
fi
