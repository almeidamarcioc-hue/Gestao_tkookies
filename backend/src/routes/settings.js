import { Router } from "express";
import { pool } from "../db/index.js";
import { initDatabase } from "../db/init.js";
import { authenticateToken, requireRole } from "../middlewares/auth.js";

const router = Router();

// Cache em memória para /configuracoes — evita bater no banco a cada request
let configCache = null;
let configCacheAt = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function invalidateConfigCache() {
  configCache = null;
  configCacheAt = 0;
}

// Função auxiliar para garantir que a tabela exista (Auto-migração)
async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chave VARCHAR(50) NOT NULL UNIQUE,
      valor TEXT
    )
  `);
}

// ROTA DE MIGRAÇÃO (Para garantir que tabelas/colunas existam no Vercel)
router.get("/migrate", authenticateToken, requireRole('admin'), async (req, res) => {
  console.log("Iniciando migração do banco de dados...");
  try {
    const logs = await initDatabase();
    
    // Diagnóstico Postgres: Busca colunas via information_schema
    const columnsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes'");
    res.json({ 
      message: "Banco de dados atualizado com sucesso!",
      logs: logs,
      estrutura_clientes: columnsRes.rows
    });
  } catch (error) {
    console.error("Erro na migração:", error);
    res.status(500).json({ error: "Erro ao migrar banco", details: error.message });
  }
});

// OBTER CONFIGURAÇÕES
router.get("/", async (req, res) => {
  // Serve do cache se ainda válido
  if (configCache && (Date.now() - configCacheAt) < CONFIG_CACHE_TTL) {
    return res.json(configCache);
  }
  try {
    const result = await pool.query("SELECT chave, valor FROM configuracoes");
    const config = {};
    (result.rows || []).forEach(row => {
      config[row.chave] = row.valor;
    });
    configCache = config;
    configCacheAt = Date.now();
    res.json(config);
  } catch (error) {
    // Se a tabela não existir (ER_NO_SUCH_TABLE ou mensagem de erro), tenta criar
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '1146' || (error.message && error.message.includes("doesn't exist"))) {
      await ensureTableExists();
      return res.json({});
    }
    console.error(error);
    res.status(500).json({ error: "Erro ao carregar configurações", details: error.message });
  }
});

// SALVAR CONFIGURAÇÕES
router.post("/", authenticateToken, requireRole('admin'), async (req, res) => {
  const configs = req.body; // Espera objeto { home_title: "...", home_bg: "..." }
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const [key, value] of Object.entries(configs)) {
      // Upsert (Insert or Update) - Sintaxe compatível com MySQL/TiDB (via wrapper)
      await client.query(
        `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) 
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [key, value]
      );
    }

    await client.query("COMMIT");
    invalidateConfigCache(); // força recarregar do banco na próxima leitura
    res.json({ message: "Configurações salvas!" });
  } catch (error) {
    // Tenta criar tabela se o erro for de falta de tabela
    if (error.code === 'ER_NO_SUCH_TABLE' || (error.message && error.message.includes("doesn't exist"))) {
      await ensureTableExists();
      // Após criar, você pode sugerir ao usuário tentar salvar novamente
    }
    if (client) {
      try { await client.query("ROLLBACK"); } catch (rbErr) {}
    }
    console.error("Erro ao salvar configurações:", error);
    res.status(500).json({ error: "Erro ao salvar configurações", details: error.message });
  } finally {
    client.release();
  }
});

export default router;