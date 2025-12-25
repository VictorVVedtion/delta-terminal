import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * 请求日志中间件
 * 记录所有进入网关的请求信息
 */
export async function loggerMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();

  // 记录请求开始
  request.log.info({
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  }, '收到请求');

  // 在响应发送后记录
  reply.addHook('onSend', async () => {
    const duration = Date.now() - startTime;
    
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
    }, '请求完成');
  });
}

/**
 * 错误日志中间件
 */
export function logError(error: Error, request: FastifyRequest): void {
  request.log.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    method: request.method,
    url: request.url,
  }, '请求处理错误');
}
