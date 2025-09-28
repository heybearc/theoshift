---
description: Direct development workflow on Proxmox staging environment
---

# Staging Development Workflow

This workflow enables direct development on the Proxmox staging environment, eliminating local development.

## 1. Connect to Staging Environment
```bash
ssh jw-staging
```

## 2. Navigate to Project Directory
```bash
cd /opt/jw-attendant-staging
```

## 3. Activate Virtual Environment
```bash
source venv/bin/activate
```

## 4. Start Development Server (if needed)
```bash
# For testing changes
python3 manage.py runserver 0.0.0.0:8002

# Or use the production service
systemctl status jw-attendant-staging
```

## 5. Make Code Changes
```bash
# Edit files directly on staging
nano scheduler/views.py
# or use your preferred editor
```

## 6. Run Database Migrations
```bash
python3 manage.py makemigrations
python3 manage.py migrate
```

## 7. Collect Static Files
```bash
python3 manage.py collectstatic --noinput
```

## 8. Restart Staging Service
```bash
sudo systemctl restart jw-attendant-staging
```

## 9. Test Changes
```bash
# Check service status
sudo systemctl status jw-attendant-staging

# Test health endpoint
curl http://10.92.3.22:8001/health/
```

## 10. Deploy to Production (when ready)
```bash
# Use deployment script
./scripts/deploy_staging_to_production.sh deploy

# Or trigger GitHub Actions workflow
git push origin main
```

## Development Tips

### File Editing Options
- **nano**: Simple terminal editor
- **vim**: Advanced terminal editor  
- **VS Code Remote**: Use VS Code with Remote-SSH extension
- **rsync**: Sync files from local editor to staging

### Testing Commands
```bash
# Run tests
python3 manage.py test

# Check for issues
python3 manage.py check

# View logs
journalctl -u jw-attendant-staging -f
```

### Database Management
```bash
# Connect to PostgreSQL
psql -h 10.92.3.21 -U jw_user -d jw_attendant_scheduler

# Create superuser
python3 manage.py createsuperuser

# Load fixtures
python3 manage.py loaddata fixtures/sample_data.json
```

This workflow ensures all development happens directly on the staging environment, maintaining consistency with the production deployment pipeline.
