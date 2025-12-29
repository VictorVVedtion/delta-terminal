import { Queue, Worker, Job } from 'bullmq';
import { config } from '../../config/index.js';
import { FastifyBaseLogger } from 'fastify';

export const QUEUE_NAMES = {
  HEARTBEAT: 'spirit_heartbeat',
  MARKET_SCAN: 'spirit_market-scan',
  SIGNAL_CHECK: 'spirit_signal-check',
  EXECUTE: 'spirit_execute',
  LLM_CALL: 'spirit_llm-call'
};

export class SpiritQueue {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
    this.initializeQueues();
  }

  private get connection() {
    return {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db
    };
  }

  private initializeQueues() {
    Object.values(QUEUE_NAMES).forEach(name => {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
        }
      });
      this.queues.set(name, queue);
    });
  }

  public getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  public registerWorker(name: string, processor: (job: Job) => Promise<any>) {
    if (this.workers.has(name)) {
      this.logger.warn(`Worker for ${name} already registered`);
      return;
    }

    const worker = new Worker(name, processor, {
      connection: this.connection,
      concurrency: 5
    });

    worker.on('completed', (job) => {
      this.logger.debug({ jobId: job.id, queue: name }, 'Job completed');
    });

    worker.on('failed', (job, err) => {
      this.logger.error({ jobId: job?.id, queue: name, err }, 'Job failed');
    });

    this.workers.set(name, worker);
    this.logger.info(`Worker registered for ${name}`);
  }

  public async close() {
    await Promise.all(Array.from(this.queues.values()).map(q => q.close()));
    await Promise.all(Array.from(this.workers.values()).map(w => w.close()));
  }
}


