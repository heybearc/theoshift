#!/bin/bash

# Fix CSS hash mismatch after Next.js builds
# This script creates symlinks to ensure CSS files are accessible

CSS_DIR="/opt/jw-attendant-scheduler/.next/static/css"

if [ -d "$CSS_DIR" ]; then
    cd "$CSS_DIR"
    
    # Find the actual CSS file (should be only one)
    ACTUAL_CSS=$(ls *.css 2>/dev/null | head -1)
    
    if [ -n "$ACTUAL_CSS" ]; then
        echo "Found CSS file: $ACTUAL_CSS"
        
        # Get the expected CSS filename from a sample page
        EXPECTED_CSS=$(curl -s 'http://localhost:3001/auth/signin' | grep -o 'href="/_next/static/css/[^"]*\.css"' | head -1 | sed 's/.*\/\([^"]*\)".*/\1/')
        
        if [ -n "$EXPECTED_CSS" ] && [ "$EXPECTED_CSS" != "$ACTUAL_CSS" ]; then
            echo "Creating symlink: $EXPECTED_CSS -> $ACTUAL_CSS"
            ln -sf "$ACTUAL_CSS" "$EXPECTED_CSS"
            echo "CSS hash mismatch fixed!"
        else
            echo "CSS files already match or no mismatch detected"
        fi
    else
        echo "No CSS files found in $CSS_DIR"
    fi
else
    echo "CSS directory not found: $CSS_DIR"
fi
