import pg from 'pg';

const { Pool } = pg;

// Cloud Run + Cloud SQL: when DB_SOCKET_PATH is set (the Unix socket the
// Cloud SQL Auth Proxy sidecar/connector exposes), connect over it instead
// of TCP host/port.
const socketPath = process.env.DB_SOCKET_PATH;

export const pool = new Pool(
  socketPath
    ? {
        host: socketPath,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    : {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }
);

export const query = (text, params) => pool.query(text, params);
