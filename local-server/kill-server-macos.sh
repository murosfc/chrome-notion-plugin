#!/bin/bash

# Chrome Notion Plugin Server - macOS Kill Script
# Optimized for macOS with specific commands and behaviors

echo ""
echo "================================"
echo "  Kill Chrome Notion Plugin Server"
echo "  macOS Version"
echo "================================"
echo ""

echo "Searching for processes using port 3000..."
echo ""

# Check for processes using port 3000 (macOS specific approach)
if netstat -an | grep -q ":3000.*LISTEN"; then
    echo "Found processes using port 3000:"
    echo ""
    
    # Show detailed process information
    echo "Process details:"
    lsof -i :3000 2>/dev/null || echo "Could not get detailed process info"
    echo ""
    
    echo "Terminating processes..."
    
    # Get all PIDs using port 3000 (including TCP and UDP)
    PIDS=$(lsof -ti :3000 2>/dev/null)
    
    if [ ! -z "$PIDS" ]; then
        for PID in $PIDS; do
            # Get process name for better logging
            PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
            echo "- Killing PID: $PID ($PROCESS_NAME)"
            
            # Try graceful termination first
            if kill -TERM $PID 2>/dev/null; then
                # Wait a moment for graceful shutdown
                sleep 2
                
                # Check if process is still running
                if kill -0 $PID 2>/dev/null; then
                    echo "  Process still running, using SIGKILL..."
                    if kill -9 $PID 2>/dev/null; then
                        echo "  ✓ Process $PID terminated successfully (SIGKILL)"
                    else
                        echo "  ✗ Warning: Could not terminate process $PID"
                    fi
                else
                    echo "  ✓ Process $PID terminated successfully (SIGTERM)"
                fi
            else
                echo "  ✗ Warning: Could not send signal to process $PID"
            fi
        done
        
        # Final check
        echo ""
        echo "Verifying termination..."
        sleep 1
        
        if netstat -an | grep -q ":3000.*LISTEN"; then
            echo "⚠️  Warning: Some processes may still be using port 3000"
            echo "You may need to restart your terminal or reboot if problems persist"
        else
            echo "✓ All processes on port 3000 have been terminated"
        fi
    else
        echo "✗ Could not identify processes using port 3000"
        echo "Port may be in use by system processes"
    fi
else
    echo "✓ No processes found using port 3000"
fi

# Additional cleanup for macOS - check for zombie processes
ZOMBIE_PIDS=$(ps aux | grep -i "node.*server.js" | grep -v grep | awk '{print $2}' 2>/dev/null)
if [ ! -z "$ZOMBIE_PIDS" ]; then
    echo ""
    echo "Found potential zombie Node.js processes:"
    for PID in $ZOMBIE_PIDS; do
        PROCESS_INFO=$(ps -p $PID -o pid,ppid,command 2>/dev/null || echo "Process not found")
        echo "- PID: $PID - $PROCESS_INFO"
        
        read -p "Kill this process? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if kill -9 $PID 2>/dev/null; then
                echo "  ✓ Process $PID terminated"
            else
                echo "  ✗ Could not terminate process $PID"
            fi
        fi
    done
fi

echo ""
echo "================================"
echo "Done"
echo "================================"

# Keep terminal open if running interactively
if [ -t 0 ]; then
    read -p "Press Enter to exit..."
fi
