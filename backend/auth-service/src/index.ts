/**
 * 认证服务主入口
 */

import { buildApp } from './app.js';
import { config } from './config/index.js';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    app.log.info(`
🚀 认证服务已启动
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 地址: http://${config.host}:${config.port}
🌍 环境: ${process.env.NODE_ENV || 'development'}
📝 日志级别: ${process.env.LOG_LEVEL || 'info'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

start();
