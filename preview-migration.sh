#!/bin/bash

# Preview what will be changed by the migration script
# This script shows you what files will be updated without making any changes

REPO_ROOT="/Users/cory/Documents/Cloudy-Work/applications/theoshift"
cd "$REPO_ROOT"

echo "=========================================="
echo "Migration Preview"
echo "=========================================="
echo ""

# Function to preview changes
preview_changes() {
    local old=$1
    local new=$2
    local description=$3
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 $description"
    echo "   '$old' → '$new'"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local count=0
    find . -type f \( -name "*.sh" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.tsx" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/backups/*" \
        -not -path "*/migrate-to-theoshift.sh" \
        -not -path "*/preview-migration.sh" \
        -exec grep -l "$old" {} \; 2>/dev/null | while read file; do
        count=$((count + 1))
        echo "  📄 $file"
        grep -n "$old" "$file" | head -3 | sed 's/^/     /'
        local total=$(grep -c "$old" "$file")
        if [ $total -gt 3 ]; then
            echo "     ... and $((total - 3)) more occurrences"
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo "  ✓ No files found (already updated or not applicable)"
    fi
}

# Preview all changes
preview_changes "jw-staging\.cloudigan\.net" "blue.theoshift.com" "Staging domain → Blue domain"
preview_changes "jw-production\.cloudigan\.net" "green.theoshift.com" "Production domain → Green domain"
preview_changes "attendant\.cloudigan\.net" "theoshift.com" "Main domain"
preview_changes "/opt/theoshift" "/opt/theoshift" "Application path"
preview_changes "theoshift_scheduler" "theoshift_scheduler" "Database name"
preview_changes "theoshift_user" "theoshift_user" "Database user"
preview_changes "ssh green-theoshift" "ssh green-theoshift" "SSH to green"
preview_changes "ssh blue-theoshift" "ssh blue-theoshift" "SSH to blue"
preview_changes "Theocratic Shift Scheduler" "Theocratic Shift Scheduler" "Project name"

echo ""
echo "=========================================="
echo "Preview Complete"
echo "=========================================="
echo ""
echo "To run the actual migration:"
echo "  ./migrate-to-theoshift.sh"
echo ""
