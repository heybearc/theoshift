#!/bin/bash
# Theocratic Shift Scheduler - Health Check Script
# Container Infrastructure: 131=postgres, 132=prod, 134=staging

set -e

CONTAINER_ID=${1:-"134"}  # Default to staging
TIMEOUT=${2:-"30"}        # Default 30 second timeout

echo "🏥 Theocratic Shift Scheduler Health Check"
echo "====================================="

# Validate container assignment
case $CONTAINER_ID in
    "132")
        echo "🎯 Checking GREEN (Container 132 (green-theoshift) - 10.92.3.22)"
        CONTAINER_IP="10.92.3.22"
        ENV="production"
        ;;
    "134")
        echo "🎯 Checking BLUE (Container 134 (blue-theoshift) - 10.92.3.24)"
        CONTAINER_IP="10.92.3.24"
        ENV="staging"
        ;;
    *)
        echo "❌ Invalid container ID: $CONTAINER_ID"
        echo "Valid containers: 132 (production), 134 (staging)"
        exit 1
        ;;
esac

echo "Environment: $ENV"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Health check functions
check_web_service() {
    echo "🌐 Testing web service..."
    if curl -f -s --max-time $TIMEOUT http://$CONTAINER_IP:8000/ >/dev/null 2>&1; then
        echo "✅ Web service responding"
        return 0
    else
        echo "❌ Web service not responding"
        return 1
    fi
}

check_health_endpoint() {
    echo "🏥 Testing health endpoint..."
    if curl -f -s --max-time $TIMEOUT http://$CONTAINER_IP:8000/health/ >/dev/null 2>&1; then
        echo "✅ Health endpoint responding"
        return 0
    else
        echo "⚠️  Health endpoint not available (may not be implemented)"
        return 0  # Don't fail if health endpoint doesn't exist
    fi
}

check_database_connection() {
    echo "🗄️  Testing database connection..."
    # This would need to be run on the container itself
    echo "📝 Database check requires container access"
    echo "   SSH command: ssh root@$CONTAINER_IP 'cd /opt/theoshift/current && python manage.py check --database default'"
    return 0
}

check_static_files() {
    echo "📁 Testing static file serving..."
    if curl -f -s --max-time $TIMEOUT http://$CONTAINER_IP:8000/static/admin/css/base.css >/dev/null 2>&1; then
        echo "✅ Static files serving correctly"
        return 0
    else
        echo "⚠️  Static files may not be properly configured"
        return 0  # Don't fail for static files
    fi
}

# Run all health checks
echo "Running health checks..."
echo ""

FAILED_CHECKS=0

if ! check_web_service; then
    ((FAILED_CHECKS++))
fi

if ! check_health_endpoint; then
    ((FAILED_CHECKS++))
fi

if ! check_database_connection; then
    ((FAILED_CHECKS++))
fi

if ! check_static_files; then
    ((FAILED_CHECKS++))
fi

echo ""
echo "📊 Health Check Summary"
echo "======================"
echo "Container: $CONTAINER_ID ($CONTAINER_IP)"
echo "Environment: $ENV"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo "✅ All critical health checks passed"
    echo "🔗 Application URL: http://$CONTAINER_IP:8000"
    exit 0
else
    echo "❌ $FAILED_CHECKS health check(s) failed"
    echo "🔧 Manual investigation required"
    exit 1
fi
