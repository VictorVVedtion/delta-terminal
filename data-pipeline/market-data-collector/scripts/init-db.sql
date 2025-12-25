-- Market Data Collector 数据库初始化脚本

-- 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 创建 tickers 表
CREATE TABLE IF NOT EXISTS tickers (
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    last_price NUMERIC(20, 8) NOT NULL,
    bid_price NUMERIC(20, 8),
    ask_price NUMERIC(20, 8),
    high_24h NUMERIC(20, 8),
    low_24h NUMERIC(20, 8),
    volume_24h NUMERIC(20, 8),
    quote_volume_24h NUMERIC(20, 8),
    price_change_24h NUMERIC(20, 8),
    price_change_percent_24h NUMERIC(10, 4),
    PRIMARY KEY (timestamp, exchange, symbol)
);

-- 创建 trades 表
CREATE TABLE IF NOT EXISTS trades (
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    trade_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    side VARCHAR(10) NOT NULL,
    is_buyer_maker BOOLEAN,
    PRIMARY KEY (timestamp, exchange, symbol, trade_id)
);

-- 创建 klines 表
CREATE TABLE IF NOT EXISTS klines (
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open_price NUMERIC(20, 8) NOT NULL,
    high_price NUMERIC(20, 8) NOT NULL,
    low_price NUMERIC(20, 8) NOT NULL,
    close_price NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 8) NOT NULL,
    quote_volume NUMERIC(20, 8),
    trades_count INTEGER,
    PRIMARY KEY (timestamp, exchange, symbol, interval)
);

-- 转换为 Hypertables
SELECT create_hypertable('tickers', 'timestamp',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

SELECT create_hypertable('trades', 'timestamp',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

SELECT create_hypertable('klines', 'timestamp',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '7 days'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tickers_exchange_symbol
    ON tickers (exchange, symbol, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_trades_exchange_symbol
    ON trades (exchange, symbol, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_klines_exchange_symbol_interval
    ON klines (exchange, symbol, interval, timestamp DESC);

-- 创建连续聚合（用于快速查询统计数据）
CREATE MATERIALIZED VIEW IF NOT EXISTS ticker_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    exchange,
    symbol,
    FIRST(last_price, timestamp) AS open_price,
    MAX(high_24h) AS high_price,
    MIN(low_24h) AS low_price,
    LAST(last_price, timestamp) AS close_price,
    AVG(volume_24h) AS avg_volume
FROM tickers
GROUP BY hour, exchange, symbol;

-- 添加刷新策略
SELECT add_continuous_aggregate_policy('ticker_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- 创建数据保留策略（可选，保留最近90天数据）
-- SELECT add_retention_policy('tickers', INTERVAL '90 days', if_not_exists => TRUE);
-- SELECT add_retention_policy('trades', INTERVAL '90 days', if_not_exists => TRUE);
-- SELECT add_retention_policy('klines', INTERVAL '365 days', if_not_exists => TRUE);

-- 创建压缩策略（节省存储空间）
ALTER TABLE tickers SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'exchange, symbol'
);

ALTER TABLE trades SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'exchange, symbol'
);

ALTER TABLE klines SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'exchange, symbol, interval'
);

-- 添加压缩策略（压缩7天前的数据）
SELECT add_compression_policy('tickers', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('trades', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('klines', INTERVAL '30 days', if_not_exists => TRUE);

-- 授予权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- 完成
DO $$
BEGIN
    RAISE NOTICE 'Market Data Collector 数据库初始化完成！';
END $$;
