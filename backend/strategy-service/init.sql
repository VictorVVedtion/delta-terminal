-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
    CREATE TYPE "StrategyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'STOPPED', 'ARCHIVED', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StrategyType" AS ENUM ('SPOT', 'FUTURES', 'GRID', 'DCA', 'ARBITRAGE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
