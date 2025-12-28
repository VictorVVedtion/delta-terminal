import { FastifyBaseLogger } from 'fastify';
import { SpiritQueue, QUEUE_NAMES } from './queue.js';
import { SpiritEmitter } from './emitter.js';
import { DecisionEngine, MarketSignal } from './engine.js';
import { LLMAnalyzer } from './llm_proxy.js';
import { SpiritEventType } from '@delta/common-types';

export class SpiritDaemon {
  private queue: SpiritQueue;
  private emitter: SpiritEmitter;
  private engine: DecisionEngine;
  private llm: LLMAnalyzer;
  private logger: FastifyBaseLogger;
  private isRunning = false;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
    this.queue = new SpiritQueue(logger);
    this.emitter = new SpiritEmitter(logger);
    this.engine = new DecisionEngine();
    this.llm = new LLMAnalyzer();
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.logger.info('👻 Spirit Daemon starting...');
    
    // 0. Register LLM Worker
    this.queue.registerWorker(QUEUE_NAMES.LLM_CALL, async (job) => {
      const { signal, reason } = job.data;
      
      // Notify user that we are analyzing
      await this.emitter.publish(
        SpiritEventType.SYSTEM_STATUS,
        'p2',
        'analyzing',
        'Spirit Analyzing',
        'Consulting LLM for complex signal...',
        { symbol: signal.symbol }
      );
      
      const analysis = await this.llm.analyzeSignal(signal);
      
      // Emit the LLM result
      await this.emitter.publish(
        SpiritEventType.STRATEGY_DECISION,
        'p1',
        analysis.suggestedAction === 'hold' ? 'monitoring' : 'executing',
        `AI Decision: ${analysis.suggestedAction.toUpperCase()}`,
        analysis.reasoning,
        { confidence: analysis.confidence, sentiment: analysis.sentiment }
      );
    });

    // 1. Register Heartbeat Worker
    this.queue.registerWorker(QUEUE_NAMES.HEARTBEAT, async (job) => {
      // Emit heartbeat event
      await this.emitter.publish(
        SpiritEventType.HEARTBEAT,
        'p4',
        'monitoring', // Heartbeat usually implies monitoring state
        'Heartbeat',
        'System active',
        { jobId: job.id }
      );
    });

    // 2. Register Market Scan Worker
    this.queue.registerWorker(QUEUE_NAMES.MARKET_SCAN, async (job) => {
      const signal = job.data as MarketSignal;
      this.logger.debug({ symbol: signal.symbol }, 'Processing market signal');
      
      const decision = this.engine.evaluate(signal);
      
      if (decision.action !== 'ignore') {
        // Emit relevant event
        if (decision.action === 'alert') {
          await this.emitter.publish(
            SpiritEventType.RISK_ALERT,
            'p0',
            'alerting',
            'Risk Alert',
            decision.reason,
            { symbol: signal.symbol, signal, decision }
          );
        } else {
          await this.emitter.publish(
            SpiritEventType.SIGNAL_DETECTED,
            'p1',
            decision.suggestedState,
            `Signal: ${decision.action.toUpperCase()} ${signal.symbol}`,
            decision.reason,
            { symbol: signal.symbol, signal, decision }
          );
        }
      } else {
        // If decision is ignore but confidence is low (ambiguous), ask LLM
        // Mock condition: if RSI is between 45-55 (very neutral)
        const rsi = signal.indicators.rsi || 50;
        if (rsi > 45 && rsi < 55 && Math.random() > 0.7) { // 30% chance to trigger LLM demo
             const llmQueue = this.queue.getQueue(QUEUE_NAMES.LLM_CALL);
             if (llmQueue) {
               await llmQueue.add('analyze-ambiguous', { 
                 signal, 
                 reason: 'Ambiguous market conditions' 
               });
             }
        }
      }
    });

    // 3. Schedule Jobs
    await this.scheduleJobs();

    this.logger.info('✨ Spirit Daemon is fully alive');
  }

  private async scheduleJobs() {
    const heartbeatQueue = this.queue.getQueue(QUEUE_NAMES.HEARTBEAT);
    if (heartbeatQueue) {
      const repeatables = await heartbeatQueue.getRepeatableJobs();
      for (const job of repeatables) {
        await heartbeatQueue.removeRepeatableByKey(job.key);
      }

      await heartbeatQueue.add('pulse', {}, {
        repeat: { pattern: '*/5 * * * * *' }
      });
      this.logger.info('💓 Spirit Heartbeat scheduled');
    }

    // Schedule Market Simulator (Mock Data for now)
    const scanQueue = this.queue.getQueue(QUEUE_NAMES.MARKET_SCAN);
    if (scanQueue) {
      // Clean old jobs
      const repeatables = await scanQueue.getRepeatableJobs();
      for (const job of repeatables) {
        await scanQueue.removeRepeatableByKey(job.key);
      }

      // Add a simulator job that runs every 10 seconds
      await scanQueue.add('simulate-btc', {
        symbol: 'BTC/USDT',
        price: 95000,
        indicators: {
          rsi: 25, // Oversold -> Should trigger BUY
          change24h: 2.5
        },
        timestamp: Date.now()
      }, {
        repeat: { pattern: '*/10 * * * * *' }
      });

       // Add a risk simulator job that runs every 30 seconds
       await scanQueue.add('simulate-risk', {
        symbol: 'ETH/USDT',
        price: 3500,
        indicators: {
          rsi: 50,
          change24h: -12.5 // Crash -> Should trigger ALERT
        },
        timestamp: Date.now()
      }, {
        repeat: { pattern: '*/30 * * * * *' }
      });
      
      this.logger.info('📈 Market Simulator scheduled');
    }
  }

  public async shutdown() {
    this.logger.info('Stopping Spirit Daemon...');
    await this.queue.close();
    await this.emitter.close();
    this.isRunning = false;
  }
}
