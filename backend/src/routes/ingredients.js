import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ingredientes ORDER BY nome ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar ingredientes" });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, unidade, custo, estoque, usado_para_revenda } = req.body;
  try {
    await pool.query(
      "INSERT INTO ingredientes (nome, unidade, custo, estoque, usado_para_revenda) VALUES ($1, $2, $3, $4, $5)",
      [nome, unidade, custo, estoque, usado_para_revenda === undefined ? true : usado_para_revenda]
    );
    res.status(201).json({ message: "Ingrediente criado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar ingrediente" });
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, unidade, custo, estoque, usado_para_revenda } = req.body;
  try {
    await pool.query(
      "UPDATE ingredientes SET nome = $1, unidade = $2, custo = $3, estoque = $4, usado_para_revenda = $5 WHERE id = $6",
      [nome, unidade, custo, estoque, usado_para_revenda, id]
    );
    res.json({ message: "Ingrediente atualizado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar ingrediente" });
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Remove referências na tabela de ligação primeiro (caso o CASCADE não esteja configurado no banco)
    await pool.query("DELETE FROM produto_ingredientes WHERE ingrediente_id = $1", [id]);
    
    await pool.query("DELETE FROM ingredientes WHERE id = $1", [id]);
    res.json({ message: "Ingrediente removido!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao remover ingrediente" });
  }
});

export default router;