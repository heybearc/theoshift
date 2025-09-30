# GitHub Repository Secrets Setup

## Required Secrets for MCP CI/CD

To enable automated deployments, add these secrets to your GitHub repository:

### Navigation to Secrets
1. Go to your GitHub repository: `cloudigan/jw-attendant-scheduler`
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Required Secrets

#### Proxmox Infrastructure Access
```
Name: PROXMOX_HOST
Value: 10.92.0.5
```

```
Name: PROXMOX_USERNAME  
Value: root
```

```
Name: PROXMOX_PASSWORD
Value: Cl0udy!!(@)
```

#### Database Configuration
```
Name: DATABASE_URL
Value: postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler
```

#### Django Application
```
Name: SECRET_KEY
Value: <your-django-secret-key>
```

```
Name: DEBUG
Value: False
```

#### Email Configuration (if needed)
```
Name: EMAIL_HOST
Value: smtp.gmail.com
```

```
Name: EMAIL_HOST_USER
Value: your-email@gmail.com
```

```
Name: EMAIL_HOST_PASSWORD
Value: <app-password>
```

### GitHub Token (Automatic)
The `GITHUB_TOKEN` is automatically provided by GitHub Actions and doesn't need to be added manually.

## Security Notes

- These secrets are encrypted and only accessible during workflow runs
- Never commit sensitive values to your repository
- Use environment-specific values for staging vs production
- Rotate passwords regularly for security

## Verification

After adding secrets, push a commit to the `staging` branch to trigger the workflow and verify:
1. Secrets are properly loaded
2. MCP servers can authenticate
3. Deployment process executes successfully

## Next Steps

Once secrets are configured:
1. Set up container directory structure
2. Configure JW Attendant Scheduler on container 134
3. Test full deployment pipeline
