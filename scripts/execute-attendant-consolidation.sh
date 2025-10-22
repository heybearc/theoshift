#!/bin/bash

# Attendant Table Consolidation Migration Executor
# This script safely executes the attendant table consolidation

set -e  # Exit on any error

echo "🚀 Starting Attendant Table Consolidation Migration"
echo "=================================================="

# Configuration
BACKUP_DIR="/tmp/jw-attendant-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_consolidation_backup_$TIMESTAMP.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📊 Step 1: Pre-migration Analysis"
echo "--------------------------------"

# Check current state
echo "Analyzing current database state..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  try {
    const attendants = await prisma.attendants.count();
    const eventAttendants = await prisma.event_attendants.count();
    const assignments = await prisma.position_assignments.count();
    const oversight = await prisma.position_oversight_assignments.count();
    const publications = await prisma.document_publications.count();
    
    console.log(\`Current State:\`);
    console.log(\`- Attendants: \${attendants}\`);
    console.log(\`- Event Attendants: \${eventAttendants}\`);
    console.log(\`- Position Assignments: \${assignments}\`);
    console.log(\`- Oversight Assignments: \${oversight}\`);
    console.log(\`- Document Publications: \${publications}\`);
    
    if (attendants === 0) {
      console.log('⚠️  No attendants found - migration may not be needed');
    }
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

analyze();
"

echo ""
echo "💾 Step 2: Creating Database Backup"
echo "-----------------------------------"

# Create full database backup
echo "Creating backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
else
    echo "❌ Backup failed! Aborting migration."
    exit 1
fi

echo ""
echo "🔄 Step 3: Executing Migration"
echo "------------------------------"

# Execute the migration SQL
echo "Applying database schema changes..."
psql "$DATABASE_URL" -f "prisma/migrations/consolidate_attendants/migration.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully"
else
    echo "❌ Database migration failed!"
    echo "🔄 Restoring from backup..."
    
    # Restore from backup
    dropdb --if-exists "$DATABASE_NAME"
    createdb "$DATABASE_NAME"
    psql "$DATABASE_URL" < "$BACKUP_FILE"
    
    echo "💾 Database restored from backup"
    exit 1
fi

echo ""
echo "🔍 Step 4: Post-Migration Verification"
echo "--------------------------------------"

# Verify migration results
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    // Check if attendants table still exists
    let attendantsExist = true;
    try {
      await prisma.attendants.count();
    } catch (error) {
      if (error.code === 'P2021') {
        attendantsExist = false;
      }
    }
    
    const eventAttendants = await prisma.event_attendants.count();
    const assignments = await prisma.position_assignments.count();
    const oversight = await prisma.position_oversight_assignments.count();
    const publications = await prisma.document_publications.count();
    
    console.log('Post-Migration State:');
    console.log(\`- Attendants table exists: \${attendantsExist}\`);
    console.log(\`- Event Attendants: \${eventAttendants}\`);
    console.log(\`- Position Assignments: \${assignments}\`);
    console.log(\`- Oversight Assignments: \${oversight}\`);
    console.log(\`- Document Publications: \${publications}\`);
    
    // Verify data integrity
    const attendantsWithoutEmail = await prisma.event_attendants.count({
      where: { email: null }
    });
    
    if (attendantsWithoutEmail > 0) {
      console.log(\`⚠️  Found \${attendantsWithoutEmail} attendants without email\`);
    }
    
    console.log('✅ Verification completed');
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
"

echo ""
echo "📝 Step 5: Update Prisma Schema"
echo "-------------------------------"

# Backup current schema
cp "prisma/schema.prisma" "prisma/schema.prisma.backup.$TIMESTAMP"

# Replace with consolidated schema
cp "prisma/schema-consolidated.prisma" "prisma/schema.prisma"

echo "✅ Prisma schema updated"

echo ""
echo "🔄 Step 6: Regenerate Prisma Client"
echo "-----------------------------------"

# Regenerate Prisma client
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client regenerated successfully"
else
    echo "❌ Prisma client generation failed!"
    echo "🔄 Restoring original schema..."
    cp "prisma/schema.prisma.backup.$TIMESTAMP" "prisma/schema.prisma"
    npx prisma generate
    exit 1
fi

echo ""
echo "🎉 Migration Completed Successfully!"
echo "===================================="
echo ""
echo "✅ Summary:"
echo "- Database schema updated"
echo "- Attendant data consolidated into event_attendants"
echo "- Foreign key relationships updated"
echo "- Prisma schema and client updated"
echo ""
echo "📋 Next Steps:"
echo "1. Test all attendant-related functionality"
echo "2. Update API endpoints if needed"
echo "3. Deploy to production after thorough testing"
echo ""
echo "💾 Backup Location: $BACKUP_FILE"
echo "📝 Schema Backup: prisma/schema.prisma.backup.$TIMESTAMP"
echo ""
echo "⚠️  Important: Test thoroughly before deploying to production!"
