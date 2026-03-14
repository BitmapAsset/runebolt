module.exports = {
  apps: [{
    name: 'runebolt',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      RUNEBOLT_PORT: 3141,
    },
    error_file: '/var/log/runebolt/error.log',
    out_file: '/var/log/runebolt/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 10000,
  }],
};
