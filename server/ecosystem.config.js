module.exports = {
  apps: [
    {
      name: "fusebead",
      script: "dist/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      // 生产环境不启用 watch，避免日志等文件变更误触发重启
      // watch: false (default),
      // 内存超过 256MB 时自动重启
      max_memory_restart: "256M",
      // 日志配置
      error_file: "/var/log/fusebead-error.log",
      out_file: "/var/log/fusebead-out.log",
      merge_logs: true,
      // 进程崩溃后自动重启
      autorestart: true,
      // 最多重启 10 次，超过后停止
      max_restarts: 10,
    },
  ],
};
