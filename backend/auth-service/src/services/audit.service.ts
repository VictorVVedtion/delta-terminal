/**
 * 审计日志服务
 * 记录用户操作和系统事件
 */

import { Pool } from 'pg';
import { AuditLog, CreateAuditLogInput } from '../types/index.js';

export class AuditService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * 创建审计日志
   */
  async createLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const {
      userId,
      walletAddress,
      action,
      ipAddress,
      userAgent,
      details,
      success = true,
      errorMessage,
    } = input;

    const result = await this.db.query(
      `INSERT INTO audit_logs
        (user_id, wallet_address, action, ip_address, user_agent, details, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId || null,
        walletAddress || null,
        action,
        ipAddress || null,
        userAgent || null,
        details ? JSON.stringify(details) : null,
        success,
        errorMessage || null,
      ]
    );

    return this.mapRowToAuditLog(result.rows[0] as Record<string, unknown>);
  }

  /**
   * 记录钱包连接
   */
  async logWalletConnect(
    walletAddress: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createLog({
      walletAddress,
      action: 'wallet_connect',
      ipAddress,
      userAgent,
      success: true,
      details: { message: '钱包连接成功' },
    });
  }

  /**
   * 记录登录成功
   */
  async logLoginSuccess(
    userId: string,
    walletAddress: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createLog({
      userId,
      walletAddress,
      action: 'wallet_login',
      ipAddress,
      userAgent,
      success: true,
      details: { message: '钱包登录成功' },
    });
  }

  /**
   * 记录登录失败
   */
  async logLoginFailed(
    walletAddress: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await this.createLog({
      walletAddress,
      action: 'wallet_login_failed',
      ipAddress,
      userAgent,
      success: false,
      errorMessage: reason,
    });
  }

  /**
   * 记录登出
   */
  async logLogout(
    userId: string,
    walletAddress: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createLog({
      userId,
      walletAddress,
      action: 'logout',
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * 记录角色变更
   */
  async logRoleChange(
    targetUserId: string,
    targetWalletAddress: string,
    oldRole: string,
    newRole: string,
    changedByUserId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.createLog({
      userId: changedByUserId,
      walletAddress: targetWalletAddress,
      action: 'role_change',
      ipAddress,
      success: true,
      details: { oldRole, newRole, targetUserId },
    });
  }

  /**
   * 查询审计日志
   */
  async getLogs(options: {
    userId?: string;
    walletAddress?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(options.userId);
    }

    if (options.walletAddress) {
      conditions.push(`wallet_address = $${paramIndex++}`);
      params.push(options.walletAddress);
    }

    if (options.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(options.action);
    }

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // 获取日志
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    params.push(limit, offset);

    const result = await this.db.query(
      `SELECT * FROM audit_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      logs: result.rows.map(this.mapRowToAuditLog),
      total,
    };
  }

  /**
   * 将数据库行映射为 AuditLog 对象
   */
  private mapRowToAuditLog(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as string,
      userId: row.user_id as string | null,
      walletAddress: row.wallet_address as string | undefined,
      action: row.action as AuditLog['action'],
      ipAddress: row.ip_address as string | undefined,
      userAgent: row.user_agent as string | undefined,
      details: row.details as Record<string, unknown> | undefined,
      success: row.success as boolean,
      errorMessage: row.error_message as string | undefined,
      createdAt: row.created_at as Date,
    };
  }
}
