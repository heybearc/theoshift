module.exports = {
  project: {
    name: 'jw-attendant-scheduler',
    framework: 'nextjs',
    version: '2.0.0-clean-slate',
    description: 'JW Attendant Scheduler - Clean Next.js Implementation'
  },
  
  deployment: {
    host: '10.92.3.24',
    port: 3001,
    path: '/opt/jw-attendant-scheduler',
    user: 'root',
    sshKey: '~/.ssh/id_rsa'
  },
  
  database: {
    host: '10.92.3.21',
    port: 5432,
    name: 'jw_attendant_scheduler_staging',
    user: 'jw_scheduler_staging'
  },
  
  monitoring: {
    healthCheckUrl: 'http://10.92.3.24:3001',
    logPath: '/var/log/nextjs-production.log',
    pidFile: 'nextjs.pid'
  },
  
  wmacs: {
    guardian: true,
    qosAgent: true,
    researchAdvisor: true,
    terminalStabilization: true
  }
};
