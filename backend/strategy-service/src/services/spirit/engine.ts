import { SpiritState } from '@delta/common-types';

export interface MarketSignal {
  symbol: string;
  price: number;
  indicators: {
    rsi?: number;
    macd?: {
      histogram: number;
      signal: number;
      value: number;
    };
    [key: string]: any;
  };
  timestamp: number;
}

export interface Rule {
  id: string;
  name: string;
  condition: (signal: MarketSignal) => boolean;
  action: 'buy' | 'sell' | 'alert' | 'ignore';
  priority: number; // Higher number = higher priority
  confidence: number; // 0.0 - 1.0
  description: string;
}

export interface Decision {
  action: 'buy' | 'sell' | 'alert' | 'ignore';
  ruleId: string;
  confidence: number;
  reason: string;
  suggestedState: SpiritState;
}

export class DecisionEngine {
  private rules: Rule[] = [];

  constructor() {
    // Initialize with some basic rules
    this.addDefaultRules();
  }

  private addDefaultRules() {
    // 1. RSI Oversold (Buy Signal)
    this.rules.push({
      id: 'rsi-oversold',
      name: 'RSI Oversold',
      condition: (s) => (s.indicators.rsi || 50) < 30,
      action: 'buy',
      priority: 10,
      confidence: 0.8,
      description: 'RSI indicates oversold conditions (< 30)'
    });

    // 2. RSI Overbought (Sell Signal)
    this.rules.push({
      id: 'rsi-overbought',
      name: 'RSI Overbought',
      condition: (s) => (s.indicators.rsi || 50) > 70,
      action: 'sell',
      priority: 10,
      confidence: 0.8,
      description: 'RSI indicates overbought conditions (> 70)'
    });

    // 3. High Volatility Risk (Alert)
    this.rules.push({
      id: 'high-volatility',
      name: 'High Volatility',
      condition: (s) => Math.abs(s.indicators.change24h || 0) > 10,
      action: 'alert',
      priority: 20,
      confidence: 0.9,
      description: '24h price change exceeds 10%'
    });
  }

  public evaluate(signal: MarketSignal): Decision {
    // Sort rules by priority
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        if (rule.condition(signal)) {
          return {
            action: rule.action,
            ruleId: rule.id,
            confidence: rule.confidence,
            reason: rule.description,
            suggestedState: this.mapActionToState(rule.action)
          };
        }
      } catch (err) {
        console.error(`Error evaluating rule ${rule.id}:`, err);
      }
    }

    return {
      action: 'ignore',
      ruleId: 'default',
      confidence: 0,
      reason: 'No rules matched',
      suggestedState: 'monitoring'
    };
  }

  private mapActionToState(action: string): SpiritState {
    switch (action) {
      case 'buy':
      case 'sell':
        return 'executing';
      case 'alert':
        return 'alerting';
      default:
        return 'monitoring';
    }
  }

  public addRule(rule: Rule) {
    this.rules.push(rule);
  }
}


