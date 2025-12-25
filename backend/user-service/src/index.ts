import { buildApp } from './app';
import { config } from './config';

async function main() {
  try {
    const app = await buildApp();

    // 启动服务器
    await app.listen({
      port: config.port,
      host: config.host,
    });

    app.log.info(`🚀 User Service is running on http://${config.host}:${config.port}`);
    app.log.info(`📚 API Documentation: http://${config.host}:${config.port}/docs`);
    app.log.info(`🏥 Health Check: http://${config.host}:${config.port}/health`);

    // 优雅关闭
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        app.log.info(`收到 ${signal} 信号，正在关闭服务...`);
        await app.close();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ 启动服务失败:', error);
    process.exit(1);
  }
}

main();
