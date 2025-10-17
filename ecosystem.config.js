module.exports = {
    apps: [
        {
            name: 'ERP-SERVER',
            script: 'app.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'PRODMODE',
                PM2_MACHINE_NAME: 'ERP-SERVER',
                PORT: 5003,
            },
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            merge_logs: true,
            max_size: '10M',
            max_files: 10,
            autorestart: true,
            restart_delay: 3000,
            kill_timeout: 5000, // для graceful shutdown WebSocket
            listen_timeout: 3000
        }
    ],
};