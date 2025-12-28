-- Spirit Events Table
-- 用于 Spirit Daemon 事件广播 (替代 Redis Pub/Sub)
-- Supabase Realtime 会自动监听此表的 INSERT 操作

CREATE TABLE IF NOT EXISTS spirit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 事件类型: heartbeat, signal_detected, risk_alert, etc.
  type TEXT NOT NULL,
  
  -- 优先级: p0 (critical) to p4 (silent)
  priority TEXT NOT NULL DEFAULT 'p4',
  
  -- Spirit 状态: dormant, monitoring, analyzing, executing, alerting, error
  spirit_state TEXT NOT NULL DEFAULT 'monitoring',
  
  -- 事件内容
  title TEXT NOT NULL,
  content TEXT,
  
  -- 元数据 (JSON)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 可选: 用户 ID (如果事件是针对特定用户的)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 创建索引以加速查询
CREATE INDEX idx_spirit_events_created_at ON spirit_events(created_at DESC);
CREATE INDEX idx_spirit_events_type ON spirit_events(type);
CREATE INDEX idx_spirit_events_user_id ON spirit_events(user_id);

-- 启用 RLS (Row Level Security)
ALTER TABLE spirit_events ENABLE ROW LEVEL SECURITY;

-- 允许所有已认证用户读取全局事件 (user_id IS NULL)
CREATE POLICY "Allow read global events" ON spirit_events
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- 允许服务端插入事件 (通过 service_role key)
CREATE POLICY "Allow service insert" ON spirit_events
  FOR INSERT
  WITH CHECK (true);

-- 自动清理旧事件 (保留最近 24 小时)
-- 注意: 需要在 Supabase Dashboard 中启用 pg_cron 扩展
-- SELECT cron.schedule('cleanup-spirit-events', '0 * * * *', $$
--   DELETE FROM spirit_events WHERE created_at < NOW() - INTERVAL '24 hours';
-- $$);

-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE spirit_events;

COMMENT ON TABLE spirit_events IS 'Spirit Daemon 事件流 - 用于实时推送系统状态到前端';

