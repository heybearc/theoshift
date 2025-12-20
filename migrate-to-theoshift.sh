#!/bin/bash

# Theocratic Shift Scheduler Infrastructure Migration Script
# This script updates all references from Theocratic Shift Scheduler to Theocratic Shift Scheduler
# with blue-green deployment naming conventions

set -e

REPO_ROOT="/Users/cory/Documents/Cloudy-Work/applications/theoshift"
cd "$REPO_ROOT"

echo "=========================================="
echo "Theocratic Shift Migration Script"
echo "=========================================="
echo ""
echo "This script will update:"
echo "  - Container names: 134→blue-theoshift, 132→green-theoshift"
echo "  - Domains: *.cloudigan.net → *.theoshift.com"
echo "  - Application paths: theoshift → theoshift"
echo "  - Database: theoshift_scheduler → theoshift_scheduler"
echo "  - Terminology: staging→blue, production→green"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

echo ""
echo "Creating backup..."
BACKUP_DIR="$REPO_ROOT/backups/pre-theoshift-migration-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
git stash push -m "Pre-theoshift migration backup"
echo "✓ Git stash created"

echo ""
echo "Starting migration..."

# Function to update files
update_files() {
    local pattern=$1
    local old=$2
    local new=$3
    local description=$4
    
    echo "  Updating: $description"
    find . -type f \( -name "*.sh" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.tsx" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/backups/*" \
        -exec grep -l "$old" {} \; 2>/dev/null | while read file; do
        sed -i '' "s|$old|$new|g" "$file"
    done
}

# 1. Update container/hostname references
echo ""
echo "1. Updating container and hostname references..."
update_files "container" "Container 134 (blue-theoshift)" "Container 134 (blue-theoshift) (blue-theoshift)" "Container 134 (blue-theoshift) identification"
update_files "container" "Container 132 (green-theoshift)" "Container 132 (green-theoshift) (green-theoshift)" "Container 132 (green-theoshift) identification"
update_files "container" "container 134 (blue-theoshift)" "container 134 (blue-theoshift) (blue-theoshift)" "Container 134 (blue-theoshift) lowercase"
update_files "container" "container 132 (green-theoshift)" "container 132 (green-theoshift) (green-theoshift)" "Container 132 (green-theoshift) lowercase"

# 2. Update domain names
echo ""
echo "2. Updating domain names..."
update_files "domain" "jw-staging\.cloudigan\.net" "blue.theoshift.com" "Blue domain"
update_files "domain" "jw-production\.cloudigan\.net" "green.theoshift.com" "Green domain"
update_files "domain" "attendant\.cloudigan\.net" "theoshift.com" "Main domain"

# 3. Update application paths
echo ""
echo "3. Updating application paths..."
update_files "path" "/opt/theoshift" "/opt/theoshift" "Application path"
update_files "path" "theoshift" "theoshift" "Application directory name"

# 4. Update database references
echo ""
echo "4. Updating database references..."
update_files "database" "theoshift_scheduler" "theoshift_scheduler" "Database name"
update_files "database" "theoshift_user" "theoshift_user" "Database user"

# 5. Update SSH shortcuts
echo ""
echo "5. Updating SSH shortcuts..."
update_files "ssh" "ssh green-theoshift" "ssh green-theoshift" "SSH to green (was production)"
update_files "ssh" "ssh blue-theoshift" "ssh blue-theoshift" "SSH to blue (was staging)"

# 6. Update terminology (staging/production → blue/green)
echo ""
echo "6. Updating terminology..."
# Be careful with these - only update in specific contexts
find . -type f \( -name "*.sh" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/backups/*" \
    -exec grep -l "BLUE.*10\.92\.3\.24\|staging.*134" {} \; 2>/dev/null | while read file; do
    sed -i '' "s|BLUE|BLUE|g" "$file"
    sed -i '' "s|Blue|Blue|g" "$file"
done

find . -type f \( -name "*.sh" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/backups/*" \
    -exec grep -l "GREEN.*10\.92\.3\.22\|production.*132" {} \; 2>/dev/null | while read file; do
    sed -i '' "s|GREEN|GREEN|g" "$file"
    sed -i '' "s|Green|Green|g" "$file"
done

# 7. Update environment file names
echo ""
echo "7. Updating environment file references..."
update_files "env" "\.env\.staging" ".env.blue" "Blue env file"
update_files "env" "\.env\.production" ".env.green" "Green env file"

# 8. Update PM2 process names
echo ""
echo "8. Updating PM2 process names..."
update_files "pm2" "theoshift-blue" "theoshift-blue" "PM2 blue process"
update_files "pm2" "theoshift-green" "theoshift-green" "PM2 green process"
update_files "pm2" "theoshift-green" "theoshift-green" "PM2 default process"

# 9. Update MCP references
echo ""
echo "9. Updating MCP references..."
update_files "mcp" "theoshift-green" "theoshift" "MCP app name"
update_files "mcp" "jw-deployment-state\.json" "theoshift-deployment-state.json" "MCP state file"

# 10. Update project name references
echo ""
echo "10. Updating project name references..."
update_files "name" "Theocratic Shift Scheduler" "Theocratic Shift Scheduler" "Full project name"
update_files "name" "THEOCRATIC SHIFT SCHEDULER" "THEOCRATIC SHIFT SCHEDULER" "Full project name uppercase"

echo ""
echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
echo ""
echo "Summary of changes:"
echo "  ✓ Container names updated (134→blue-theoshift, 132→green-theoshift)"
echo "  ✓ Domain names updated (*.cloudigan.net → *.theoshift.com)"
echo "  ✓ Application paths updated (/opt/theoshift → /opt/theoshift)"
echo "  ✓ Database references updated (jw_* → theoshift_*)"
echo "  ✓ SSH shortcuts updated (jwa/jwg → green/blue-theoshift)"
echo "  ✓ Terminology updated (staging/production → blue/green)"
echo "  ✓ Environment files updated (.env.blue/production → .env.blue/green)"
echo "  ✓ PM2 processes updated (theoshift-green → theoshift)"
echo "  ✓ MCP references updated"
echo "  ✓ Project name updated"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test critical scripts"
echo "  3. Commit changes: git add . && git commit -m 'Migrate to Theocratic Shift infrastructure'"
echo "  4. Update actual server containers and DNS"
echo ""
echo "To restore backup: git stash pop"
echo ""
