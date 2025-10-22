#!/bin/bash

# Emergency Direct Fix - No More APEX, Just Fix It
echo "🚨 EMERGENCY FIX - Direct Production Repair"
echo "=========================================="

PROD_SERVER="jwa"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

# Step 1: Kill everything and start fresh
echo "1. Killing all processes..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "pkill -f 'npm\\|node\\|next\\|pm2' || true; sleep 2"

# Step 2: Copy EVERYTHING from local to production
echo "2. Copying complete application..."
rsync -avz --timeout=30 \
  --exclude node_modules \
  --exclude .git \
  --exclude .next \
  -e "ssh -F $SSH_CONFIG" \
  ./ "$PROD_SERVER:/opt/jw-attendant-scheduler/"

# Step 3: Set up environment
echo "3. Setting up production environment..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/jw-attendant-scheduler

# Create proper .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL=\"postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler\"
NEXTAUTH_URL=\"https://attendant.cloudigan.net\"
NEXTAUTH_SECRET=\"$(openssl rand -hex 32)\"
EOF

echo 'Environment configured'
"

# Step 4: Install and build
echo "4. Installing dependencies and building..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/jw-attendant-scheduler

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build with proper CSS
npm run build

echo 'Build completed'
"

# Step 5: Start with PM2
echo "5. Starting with PM2..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/jw-attendant-scheduler

# Start with PM2
pm2 delete jw-attendant || true
pm2 start npm --name 'jw-attendant' -- start

echo 'Application started'
"

# Step 6: Test
echo "6. Testing application..."
sleep 10
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
echo 'Process check:'
pm2 status

echo 'Port check:'
ss -tlnp | grep :3001

echo 'HTTP test:'
curl -I http://localhost:3001 2>/dev/null | head -3
"

echo ""
echo "🎯 Emergency fix complete!"
echo "Test: https://attendant.cloudigan.net"
