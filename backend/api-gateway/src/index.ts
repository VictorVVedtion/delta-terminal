import { buildApp } from './app.js';
import { config, validateConfig } from './config/index.js';

/**
 * 启动服务器
 */
async function start() {
  try {
    // 验证配置
    if (!validateConfig()) {
      console.error('配置验证失败,请检查环境变量');
      process.exit(1);
    }

    // 构建应用
    const app = await buildApp();

    // 启动服务器
    await app.listen({
      port: config.port,
      host: config.host,
    });

    // 打印启动信息
    app.log.info(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  Delta Terminal API Gateway                            ║
║  AI 交易终端 API 网关服务                                ║
║                                                        ║
║  环境: ${config.env.padEnd(45)}║
║  地址: http://${config.host}:${config.port}${' '.repeat(38 - config.host.length - config.port.toString().length)}║
║  文档: http://${config.host}:${config.port}/docs${' '.repeat(33 - config.host.length - config.port.toString().length)}║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);

    // 优雅关闭处理
    const signals = ['SIGINT', 'SIGTERM'];

    for (const signal of signals) {
      process.on(signal, async () => {
        app.log.info(`收到 ${signal} 信号,开始优雅关闭...`);

        try {
          await app.close();
          app.log.info('服务器已关闭');
          process.exit(0);
        } catch (error) {
          app.log.error({ error }, '关闭过程中发生错误');
          process.exit(1);
        }
      });
    }

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      app.log.fatal({ error }, '未捕获的异常');
      process.exit(1);
    });

    // 未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason, promise) => {
      app.log.fatal({ reason, promise }, '未处理的 Promise 拒绝');
      process.exit(1);
    });

  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

// 启动应用
start();
