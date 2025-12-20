module.exports = {
  apps: [{
    name: 'theoshift-green',
    script: 'npm',
    args: 'start -- --port 3001',
    cwd: '/opt/theoshift',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
