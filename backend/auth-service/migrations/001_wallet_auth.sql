-- Delta Terminal 钱包认证系统
-- 基于以太坊钱包地址的用户认证

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表（钱包为主键）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,  -- 以太坊地址格式: 0x...
    nonce VARCHAR(64) NOT NULL,                   -- 签名验证用的随机数
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT check_wallet_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT check_role CHECK (role IN ('user', 'admin', 'moderator'))
);

-- 钱包地址索引
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    wallet_address VARCHAR(42),
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_wallet ON audit_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 注释
COMMENT ON TABLE users IS '用户表 - 基于钱包地址认证';
COMMENT ON COLUMN users.wallet_address IS '以太坊钱包地址 (0x...)';
COMMENT ON COLUMN users.nonce IS '用于签名验证的随机数，每次登录后更新';
COMMENT ON COLUMN users.role IS '用户角色: user, admin, moderator';

COMMENT ON TABLE audit_logs IS '审计日志 - 记录用户操作';
