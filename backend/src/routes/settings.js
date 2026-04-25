import { Router } from "express";
import { pool } from "../db/index.js";
import { initDatabase } from "../db/init.js";
import { authenticateToken, requireRole } from "../middlewares/auth.js";

const router = Router();

// NOTA: Cache em memória removido — Vercel serverless usa múltiplas instâncias,
// então um cache por processo não é compartilhado entre instâncias e causa dados
// desatualizados mesmo após salvar. A query de configurações é leve o suficiente
// para ir direto ao banco a cada requisição.

// Função auxiliar para garantir que a tabela exista (Auto-migração)
async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id SERIAL PRIMARY KEY,
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
  try {
    const result = await pool.query("SELECT chave, valor FROM configuracoes");
    const config = {};
    (result.rows || []).forEach(row => {
      config[row.chave] = row.valor;
    });
    res.json(config);
  } catch (error) {
    // Se a tabela não existir, tenta criar
    if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
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
         ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
        [key, value]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Configurações salvas!" });
  } catch (error) {
    // Tenta criar tabela se o erro for de falta de tabela
    if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
      await ensureTableExists();
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