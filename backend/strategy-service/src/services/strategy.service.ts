import { StrategyRepository } from '../repositories/strategy.repository.js';
import { StrategyStatus } from '@prisma/client';
import type { CreateStrategyRequest, UpdateStrategyRequest, ListStrategiesQuery } from '../types/strategy.js';

export class StrategyService {
  constructor(private repository: StrategyRepository) {}

  async createStrategy(userId: string, data: CreateStrategyRequest) {
    return this.repository.create(userId, data);
  }

  async getStrategy(id: string) {
    return this.repository.findById(id);
  }

  async getUserStrategies(userId: string, query: ListStrategiesQuery) {
    return this.repository.findByUserId(userId, query);
  }

  async updateStrategy(id: string, data: UpdateStrategyRequest) {
    return this.repository.update(id, data);
  }

  async startStrategy(id: string) {
    return this.repository.updateStatus(id, StrategyStatus.ACTIVE);
  }

  async pauseStrategy(id: string) {
    return this.repository.updateStatus(id, StrategyStatus.PAUSED);
  }

  async stopStrategy(id: string) {
    return this.repository.updateStatus(id, StrategyStatus.STOPPED);
  }

  async deleteStrategy(id: string) {
    return this.repository.delete(id);
  }

  async shareStrategy(id: string) {
    return this.repository.generateShareCode(id);
  }
}
