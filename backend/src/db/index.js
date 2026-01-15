import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 4000,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false // Alterado para false para evitar problemas com CAs auto-assinados ou genéricos em serverless, a menos que tenha o CA exato
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const mysqlPool = mysql.createPool(dbConfig);

// Wrapper para emular o comportamento do 'pg' (PostgreSQL) usando 'mysql2'
// Aceita um 'executor' (pode ser o pool ou uma conexão específica)
const executeQuery = async (executor, text, params) => {
  // 1. Remove RETURNING id (sintaxe PG não suportada no MySQL)
  let sql = text.replace(/RETURNING\s+id/i, "");
  
  // 2. Substitui $1, $2, etc por ? (placeholders)
  sql = sql.replace(/\$\d+/g, "?");

  try {
    const [results] = await executor.query(sql, params);

    // 3. Adapta o retorno para o formato do 'pg' { rows: [], rowCount: 0 }
    
    // Se for um INSERT/UPDATE com resultado de metadados
    if (results && 'insertId' in results) {
      return { 
        rows: results.insertId ? [{ id: results.insertId }] : [], 
        rowCount: results.affectedRows 
      };
    }
    
    // Se for um SELECT (array de resultados)
    if (Array.isArray(results)) {
      return { rows: results, rowCount: results.length };
    }

    return { rows: [], rowCount: 0 };
  } catch (error) {
    console.error("Erro na query MySQL:", sql, "Params:", params, "Erro:", error);
    throw error;
  }
};

export const pool = {
  // Query simples usando o pool (pega uma conexão, executa e devolve)
  query: (text, params) => executeQuery(mysqlPool, text, params),
  
  // Conexão dedicada para transações (BEGIN/COMMIT/ROLLBACK)
  connect: async () => {
    const connection = await mysqlPool.getConnection();
    return {
      query: async (text, params) => {
        if (text === 'BEGIN') return connection.query('START TRANSACTION');
        if (text === 'COMMIT') return connection.commit();
        if (text === 'ROLLBACK') return connection.rollback();
        
        return executeQuery(connection, text, params);
      },
      release: () => connection.release()
    };
  }
};
