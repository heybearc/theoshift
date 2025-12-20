#!/bin/bash

# 🔐 ADMIN CREDENTIALS DISPLAY
# Shows current admin user credentials for login
# Usage: ./scripts/show-admin-creds.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
if [ "$ENVIRONMENT" = "staging" ]; then
    SSH_HOST="10.92.3.24"
    SERVER_URL="http://10.92.3.24:3001"
elif [ "$ENVIRONMENT" = "production" ]; then
    SSH_HOST="10.92.3.22"
    SERVER_URL="http://10.92.3.22:3001"
else
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

SSH_KEY="~/.ssh/jw_staging"

echo "🔐 ADMIN CREDENTIALS - $ENVIRONMENT"
echo "=================================="
echo ""

# Query admin user from database
admin_info=$(ssh -i $SSH_KEY root@$SSH_HOST 'cd /opt/theoshift && node -e "
    const { PrismaClient } = require(\"@prisma/client\");
    const prisma = new PrismaClient();
    prisma.users.findFirst({ 
        where: { role: \"ADMIN\" },
        select: { email: true, firstName: true, lastName: true, isActive: true, createdAt: true }
    })
      .then(user => { 
        if (user) { 
            console.log(JSON.stringify(user, null, 2));
        } else { 
            console.log(\"NO_ADMIN_FOUND\"); 
        } 
      })
      .catch(err => console.log(\"ERROR:\", err.message))
      .finally(() => prisma.\$disconnect());
" 2>/dev/null' || echo "ERROR")

if echo "$admin_info" | grep -q "NO_ADMIN_FOUND"; then
    echo "❌ No admin user found in database"
    echo ""
    echo "Run this command to create admin user:"
    echo "ssh -i ~/.ssh/jw_staging root@$SSH_HOST 'cd /opt/theoshift && node scripts/seed-admin.js'"
    exit 1
elif echo "$admin_info" | grep -q "ERROR"; then
    echo "❌ Error querying database"
    echo "$admin_info"
    exit 1
else
    echo "✅ Admin User Found:"
    echo "$admin_info" | jq -r '
        "📧 Email: " + .email,
        "👤 Name: " + .firstName + " " + .lastName,
        "🟢 Status: " + (if .isActive then "Active" else "Inactive" end),
        "📅 Created: " + .createdAt
    ' 2>/dev/null || echo "$admin_info"
    
    echo ""
    echo "🔑 DEFAULT LOGIN CREDENTIALS:"
    echo "Email: admin@jwscheduler.local"
    echo "Password: AdminPass123!"
    echo ""
    echo "🌐 LOGIN URL:"
    echo "$SERVER_URL/auth/signin"
    echo ""
    echo "⚠️  SECURITY NOTICE:"
    echo "Please change the default password after first login!"
fi
