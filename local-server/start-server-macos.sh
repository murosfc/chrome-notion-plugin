#!/bin/bash

# Chrome Notion Plugin Server - macOS Start Script
# Optimized for macOS with specific commands and behaviors

echo ""
echo "================================"
echo "  Chrome Notion Plugin Server"
echo "  macOS Version"
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
    echo "Or install via Homebrew: brew install node"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Display Node.js version for debugging
NODE_VERSION=$(node --version)
echo "Using Node.js version: $NODE_VERSION"
echo ""

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found in current directory"
    echo "Current directory: $(pwd)"
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
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        echo "Please check your npm installation"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo ""
fi

# Kill any existing server on port 3000 (macOS specific)
echo "Checking for existing processes on port 3000..."
echo ""

# Use netstat for macOS (different from Linux)
if netstat -an | grep -q ":3000.*LISTEN"; then
    echo "Found existing server process on port 3000"
    echo "Terminating existing processes..."
    
    # Get PIDs using lsof (more reliable on macOS)
    PIDS=$(lsof -ti :3000)
    
    if [ ! -z "$PIDS" ]; then
        for PID in $PIDS; do
            echo "- Killing PID: $PID"
            # Use SIGTERM first, then SIGKILL if needed
            if kill $PID 2>/dev/null; then
                sleep 1
                if kill -0 $PID 2>/dev/null; then
                    echo "  Process still running, using SIGKILL..."
                    kill -9 $PID 2>/dev/null
                fi
                echo "  ✓ Process $PID terminated successfully"
            else
                echo "  ✗ Warning: Could not terminate process $PID"
            fi
        done
    fi
    
    echo ""
    echo "Waiting for port to be released..."
    sleep 3
    echo "Port 3000 is now available"
else
    echo "Port 3000 is already available"
fi
echo ""

# Check if port is actually free
if netstat -an | grep -q ":3000.*LISTEN"; then
    echo "WARNING: Port 3000 is still in use. Server may fail to start."
    echo "You may need to manually kill the process or use a different port."
    echo ""
fi

# Start the server
echo "================================"
echo "Starting Chrome Notion Plugin Server..."
echo "================================"
echo ""

# Set NODE_ENV for better error messages
export NODE_ENV=development

# Start server with better error handling
node server.js

# Capture exit code
EXIT_CODE=$?

# Keep terminal open if server stops unexpectedly (only in interactive mode)
if [ -t 0 ]; then
    echo ""
    echo "================================"
    echo "Server stopped (exit code: $EXIT_CODE)"
    echo "================================"
    
    if [ $EXIT_CODE -ne 0 ]; then
        echo "Server exited with an error. Check the logs above."
    fi
    
    read -p "Press Enter to exit..."
fi

exit $EXIT_CODE
