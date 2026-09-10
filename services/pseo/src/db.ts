import { Pool, type PoolConfig } from "pg";

export function createDbPool(connectionString: string): Pool {
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const config: PoolConfig = {
    connectionString,
    max: 12,
    min: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: false,
    application_name: "bigsignal-pseo",
  };

  return new Pool(config);
}
