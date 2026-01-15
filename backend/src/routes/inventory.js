import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR ESTOQUE DE PRODUTOS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nome, estoque, preco_venda FROM produtos ORDER BY nome ASC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar estoque" });
  }
});

// LANÇAR ESTOQUE (SOMAR AO ATUAL)
router.post("/lancar", async (req, res) => {
  const { produto_id, quantidade } = req.body;
  
  if (!produto_id || !quantidade) {
    return res.status(400).json({ error: "Produto e quantidade são obrigatórios" });
  }

  try {
    await pool.query(
      "UPDATE produtos SET estoque = estoque + $1 WHERE id = $2",
      [Number(quantidade), produto_id]
    );
    res.json({ message: "Estoque atualizado com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar estoque" });
  }
});

export default router;