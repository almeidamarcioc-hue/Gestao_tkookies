import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// OBTER CONFIGURAÇÕES
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT chave, valor FROM configuracoes");
    const config = {};
    result.rows.forEach(row => {
      config[row.chave] = row.valor;
    });
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao carregar configurações" });
  }
});

// SALVAR CONFIGURAÇÕES
router.post("/", async (req, res) => {
  const configs = req.body; // Espera objeto { home_title: "...", home_bg: "..." }
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const [key, value] of Object.entries(configs)) {
      // Upsert (Insert or Update) - Sintaxe compatível com MySQL/TiDB
      await client.query(
        `INSERT INTO configuracoes (chave, valor) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [key, value]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Configurações salvas!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao salvar configurações" });
  } finally {
    client.release();
  }
});

export default router;