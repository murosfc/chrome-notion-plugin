#!/bin/bash

# Chrome Notion Plugin Server - Universal Unix Script
# Automatically detects OS and runs the appropriate script

echo ""
echo "================================"
echo "  Chrome Notion Plugin Server"
echo "  Universal Unix Launcher"
echo "================================"
echo ""

# Detect operating system
OS="$(uname -s)"
case "${OS}" in
    Linux*)     
        echo "Detected: Linux"
        echo "Using Linux-optimized script..."
        echo ""
        exec ./start-server.sh
        ;;
    Darwin*)    
        echo "Detected: macOS"
        echo "Using macOS-optimized script..."
        echo ""
        exec ./start-server-macos.sh
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        echo "Detected: Windows (Unix environment)"
        echo "Please use start-server.bat instead"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
        ;;
    *)          
        echo "Unknown operating system: ${OS}"
        echo "Falling back to generic Linux script..."
        echo ""
        exec ./start-server.sh
        ;;
esac
