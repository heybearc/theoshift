#!/bin/bash

# Emergency Production Start Script
# Direct manual deployment to get JW Attendant running

echo "🚨 Emergency Production Deployment"
echo "=================================="

# Configuration
PROD_SERVER="jwa"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"
PROJECT_PATH="/opt/theoshift"

echo "Step 1: Kill all existing processes..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    pkill -f 'npm\\|node\\|next\\|pm2' || true
    sleep 2
"

echo "Step 2: Set up environment..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd $PROJECT_PATH
    
    # Create production environment
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL=\"postgresql://theoshift_user:jw_password@10.92.3.21:5432/theoshift_scheduler\"
NEXTAUTH_URL=\"https://theoshift.com\"
NEXTAUTH_SECRET=\"prod-secret-$(date +%s)\"
EOF
    
    echo 'Environment configured'
"

echo "Step 3: Quick dependency check..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd $PROJECT_PATH
    
    # Check if we have basic dependencies
    if [ ! -d node_modules ]; then
        echo 'Installing minimal dependencies...'
        npm install --production --no-optional
    fi
"

echo "Step 4: Start application directly..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd $PROJECT_PATH
    
    # Start with nohup for simplicity
    echo 'Starting application...'
    nohup npm start > production.log 2>&1 &
    
    # Wait and check
    sleep 5
    
    # Check if process started
    if pgrep -f 'npm.*start' > /dev/null; then
        echo '✅ Application process started'
    else
        echo '❌ Application failed to start'
        exit 1
    fi
"

echo "Step 5: Test connectivity..."
sleep 10
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    # Test local connection
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        echo '✅ Local connection successful'
    else
        echo '❌ Local connection failed'
        echo 'Checking logs:'
        tail -20 $PROJECT_PATH/production.log
        exit 1
    fi
    
    # Test external binding
    if curl -f http://10.92.3.22:3001 > /dev/null 2>&1; then
        echo '✅ External connection successful'
    else
        echo '❌ External connection failed - checking binding'
        netstat -tlnp | grep :3001 || ss -tlnp | grep :3001
    fi
"

echo ""
echo "🎉 Emergency deployment complete!"
echo "Test: http://10.92.3.22:3001"
echo "Production: https://theoshift.com"
echo ""
echo "If still not working, check logs:"
echo "ssh -F $SSH_CONFIG $PROD_SERVER 'tail -f $PROJECT_PATH/production.log'"
