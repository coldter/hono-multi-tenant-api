/**
 * @type {import('pm2').Config}
 */
module.exports = {
  apps: [
    {
      name: "Numerology-backend",
      script: "npm",
      watch: false,
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
