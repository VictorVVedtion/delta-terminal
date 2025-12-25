import { buildApp } from './app.js';
import { config } from './config/index.js';

async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: config.service.port,
      host: config.service.host,
    });

    app.log.info(
      `🚀 ${config.service.name} v${config.service.version} is running on http://${config.service.host}:${config.service.port}`
    );
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
