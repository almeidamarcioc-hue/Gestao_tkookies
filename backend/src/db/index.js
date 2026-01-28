import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Verifica se estamos em ambiente de produção/nuvem para forçar SSL
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const dbHost = process.env.DB_HOST || "localhost";

const dbConfig = {
  host: dbHost,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "root",
  database: process.env.DB_NAME || "cookie_erp",
  port: Number(process.env.DB_PORT) || 3306,
  // Ativa SSL se for produção OU se o host não for localhost
  ssl: (isProduction || (dbHost && dbHost !== "localhost" && dbHost !== "127.0.0.1")) ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // 10 segundos para timeout de conexão
};

// Log de diagnóstico para verificar variáveis no Vercel (sem expor senha)
console.log("🔌 Configuração do Banco:", {
  host: dbConfig.host || "❌ INDEFINIDO",
  user: dbConfig.user || "❌ INDEFINIDO",
  port: dbConfig.port,
  ssl: dbConfig.ssl ? "ATIVADO" : "DESATIVADO",
  password: dbConfig.password ? "******" : "❌ INDEFINIDA"
});

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
    if (error.code !== 'ER_DUP_FIELDNAME') {
      console.error("Erro na query MySQL:", error.message);
    }
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
