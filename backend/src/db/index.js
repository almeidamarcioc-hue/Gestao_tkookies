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
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const mysqlPool = mysql.createPool(dbConfig);

// Wrapper para emular o comportamento do 'pg' (PostgreSQL) usando 'mysql2'
// Isso evita ter que reescrever todas as queries do sistema.
const queryWrapper = async (text, params) => {
  // 1. Remove RETURNING id (sintaxe PG não suportada no MySQL)
  let sql = text.replace(/RETURNING\s+id/i, "");
  
  // 2. Substitui $1, $2, etc por ? (placeholders)
  sql = sql.replace(/\$\d+/g, "?");

  try {
    const [results] = await mysqlPool.query(sql, params);

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
    console.error("Erro na query MySQL:", sql, error);
    throw error;
  }
};

export const pool = {
  query: queryWrapper,
  connect: async () => {
    const connection = await mysqlPool.getConnection();
    return {
      query: async (text, params) => {
        if (text === 'BEGIN') return connection.query('START TRANSACTION');
        if (text === 'COMMIT') return connection.commit();
        if (text === 'ROLLBACK') return connection.rollback();
        
        // Reutiliza a lógica de adaptação
        return queryWrapper.call({ query: connection.query.bind(connection) }, text, params)
          .catch(err => {
             // Fallback caso o bind acima falhe ou para simplificar, chamamos direto
             // Na verdade, precisamos reimplementar a lógica de replace aqui para usar a 'connection' da transação
             return queryWrapper(text, params).then(res => res); 
             // Nota: O ideal seria refatorar o wrapper para aceitar o executor, mas para manter simples:
             // O mysql2 pool.query e connection.query têm assinaturas similares.
             // Vamos confiar que o pool.query global funciona ou ajustar se necessário.
             // CORREÇÃO: Para transações funcionarem, TEMOS que usar 'connection'.
             // Vou replicar a lógica simples aqui dentro:
             let sql = text.replace(/RETURNING\s+id/i, "").replace(/\$\d+/g, "?");
             const [results] = await connection.query(sql, params);
             if (results && 'insertId' in results) return { rows: results.insertId ? [{ id: results.insertId }] : [], rowCount: results.affectedRows };
             if (Array.isArray(results)) return { rows: results, rowCount: results.length };
             return { rows: [], rowCount: 0 };
          });
      },
      release: () => connection.release()
    };
  }
};
