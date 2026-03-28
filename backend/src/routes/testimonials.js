import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// Função auxiliar para garantir que a tabela exista (Auto-migração)
async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS depoimentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      cargo VARCHAR(100) DEFAULT 'Cliente',
      texto TEXT NOT NULL,
      imagem TEXT,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// LISTAR (Público - Apenas ativos para a Home)
router.get("/public", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM depoimentos WHERE ativo = TRUE ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    // Se o erro for tabela inexistente, tenta criar e não retorna erro (retorna array vazio)
    if (error.code === 'ER_NO_SUCH_TABLE' || (error.message && (error.message.includes("doesn't exist") || error.message.includes("does not exist")))) {
      await ensureTableExists();
      return res.json([]); 
    }
    res.status(500).json({ error: "Erro ao listar depoimentos públicos", details: error.message });
  }
});

// LISTAR (Admin - Todos para o painel de configuração)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM depoimentos ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || (error.message && (error.message.includes("doesn't exist") || error.message.includes("does not exist")))) {
      await ensureTableExists();
      return res.json([]);
    }
    res.status(500).json({ error: "Erro ao listar todos depoimentos", details: error.message });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, cargo, texto, imagem, ativo } = req.body;

  if (!nome || !texto) {
    return res.status(400).json({ error: "Nome e Texto são obrigatórios." });
  }

  try {
    await pool.query(
      "INSERT INTO depoimentos (nome, cargo, texto, imagem, ativo) VALUES ($1, $2, $3, $4, $5)",
      [nome, cargo || 'Cliente', texto, imagem || null, ativo === undefined ? true : ativo]
    );
    res.status(201).json({ message: "Depoimento criado com sucesso!" });
  } catch (error) {
    // Se falhar na inserção por tabela inexistente, cria e tenta de novo uma vez
    if (error.code === 'ER_NO_SUCH_TABLE' || (error.message && (error.message.includes("doesn't exist") || error.message.includes("does not exist")))) {
      await ensureTableExists();
      await pool.query(
        "INSERT INTO depoimentos (nome, cargo, texto, imagem, ativo) VALUES ($1, $2, $3, $4, $5)",
        [nome, cargo || 'Cliente', texto, imagem || null, ativo === undefined ? true : ativo]
      );
      return res.status(201).json({ message: "Depoimento criado com sucesso!" });
    }
    console.error("Erro ao criar depoimento:", error);
    res.status(500).json({ error: "Erro ao criar depoimento", details: error.message });
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, cargo, texto, imagem, ativo } = req.body;
  try {
    await pool.query(
      "UPDATE depoimentos SET nome = $1, cargo = $2, texto = $3, imagem = $4, ativo = $5 WHERE id = $6",
      [nome, cargo, texto, imagem, ativo, id]
    );
    res.json({ message: "Depoimento atualizado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar depoimento", details: error.message });
  }
});

// ALTERAR STATUS (Toggle Ativo/Inativo)
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;
  try {
    await pool.query("UPDATE depoimentos SET ativo = $1 WHERE id = $2", [ativo, id]);
    res.json({ message: "Status atualizado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar status", details: error.message });
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM depoimentos WHERE id = $1", [id]);
    res.json({ message: "Depoimento removido!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover depoimento", details: error.message });
  }
});

export default router;