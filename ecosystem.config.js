module.exports = {
  apps: [{
    name: 'jw-attendant',
    script: 'npm',
    args: 'start -- --port 3001',
    cwd: '/opt/jw-attendant-scheduler',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
