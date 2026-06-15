module.exports = {
  apps: [{
    name: 'stock-selector',
    script: 'src/index.js',
    cwd: '/www/wwwroot/stock-selector',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      ENABLE_SCHEDULER: 'true',
      ALLOWED_ORIGINS: '*',
    },
    error_file: '/www/wwwroot/stock-selector/logs/error.log',
    out_file: '/www/wwwroot/stock-selector/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    time: true,
  }]
};
