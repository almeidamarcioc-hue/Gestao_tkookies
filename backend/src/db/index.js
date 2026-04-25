import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL:', err.message);
});

console.log('🔌 PostgreSQL (Neon):', process.env.DATABASE_URL ? 'DATABASE_URL configurada ✅' : '❌ DATABASE_URL não definida');
