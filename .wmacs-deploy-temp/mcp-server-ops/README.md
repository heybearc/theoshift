# WMACS Server Operations MCP

A Model Context Protocol server for automated server-side operations within the WMACS (Windsurf MCP Artifact CI/CD System) framework, maintaining strict guardrails and audit trails.

## Features

### 🛡️ Built-in Guardrails
- **Host Whitelist**: Only staging (10.92.3.24) and production (10.92.3.22) allowed
- **Command Validation**: Pre-approved safe operations only
- **Rate Limiting**: Maximum 10 operations per hour
- **Path Restrictions**: Limited to application directories
- **Audit Logging**: All operations logged with reasons and timestamps

### 🔧 Available Operations

#### `restart_application`
Safely restart the JW Attendant Scheduler with optional cache clearing:
```json
{
  "environment": "staging|production",
  "reason": "Authentication fix deployment",
  "clearCache": true
}
```

#### `update_symlink` 
Update current release symlink with validation:
```json
{
  "environment": "staging",
  "releaseHash": "8c2be16",
  "reason": "Deploy authentication fixes"
}
```

#### `check_application_status`
Health check and status monitoring:
```json
{
  "environment": "staging"
}
```

#### `get_operation_log`
Audit trail of recent operations:
```json
{
  "limit": 10
}
```

## Integration with WMACS

### GitHub Actions Integration
Add to `.github/workflows/mcp-ci-cd.yml`:

```yaml
- name: MCP Server Operations
  if: steps.deploy.conclusion == 'success'
  run: |
    echo '{"environment": "${{ env.ENVIRONMENT }}", "reason": "Automated deployment restart", "clearCache": true}' | \
    npx mcp-server-ops-wmacs restart_application
```

### Windsurf Integration
Add to `mcp-claude-desktop-config.json`:

```json
{
  "mcpServers": {
    "wmacs-server-ops": {
      "command": "node",
      "args": ["/path/to/mcp-server-ops/src/index.js"],
      "env": {
        "SSH_PRIVATE_KEY": "/path/to/ssh/key"
      }
    }
  }
}
```

## Security Model

### Authentication
- SSH key-based authentication
- No password authentication allowed
- Keys stored in secure environment variables

### Authorization
- Pre-defined command whitelist
- Path-based access control
- Environment-specific restrictions

### Audit Trail
- All operations logged to `/var/log/wmacs-mcp-ops.log`
- Timestamped with reason codes
- Rate limiting prevents abuse

## Usage Examples

### Fix Authentication Issue (Current Scenario)
```bash
# Clear cache and restart with authentication fixes
mcp-call restart_application '{
  "environment": "staging",
  "reason": "Clear Next.js cache for authentication fix",
  "clearCache": true
}'
```

### Deploy New Release
```bash
# Update symlink to latest release
mcp-call update_symlink '{
  "environment": "staging", 
  "releaseHash": "8c2be16",
  "reason": "Deploy authentication security fixes"
}'

# Restart application
mcp-call restart_application '{
  "environment": "staging",
  "reason": "Activate new release deployment"
}'
```

### Health Monitoring
```bash
# Check application status
mcp-call check_application_status '{
  "environment": "staging"
}'
```

## Guardrails Compliance

✅ **Maintains WMACS Principles**:
- Code-first approach (operations defined in code)
- Audit trail and transparency
- Automated with human oversight
- Environment isolation
- Rollback capabilities

✅ **Security Best Practices**:
- Least privilege access
- Command validation
- Rate limiting
- Comprehensive logging
- No direct shell access

✅ **CI/CD Integration**:
- Works within existing GitHub Actions
- Respects deployment artifacts
- Maintains immutable releases
- Atomic operations

## Installation

```bash
cd mcp-server-ops
npm install
npm start
```

## Environment Variables

- `SSH_PRIVATE_KEY`: Path to SSH private key for server access
- `LOG_LEVEL`: Logging level (default: info)
- `MAX_OPERATIONS_PER_HOUR`: Rate limit (default: 10)

This MCP server enables automated server-side operations while maintaining the strict guardrails and principles of the WMACS system.
