import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR FAVORITOS DO CLIENTE
router.get("/:clienteId", async (req, res) => {
  const { clienteId } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, f.created_at as favoritado_em
      FROM favoritos f
      JOIN produtos p ON f.produto_id = p.id
      WHERE f.cliente_id = $1
      ORDER BY f.created_at DESC
    `, [clienteId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar favoritos" });
  }
});

// ADICIONAR FAVORITO
router.post("/", async (req, res) => {
  const { cliente_id, produto_id } = req.body;
  try {
    // INSERT IGNORE para MySQL evita erro se já existir
    await pool.query("INSERT IGNORE INTO favoritos (cliente_id, produto_id) VALUES ($1, $2)", [cliente_id, produto_id]);
    res.json({ message: "Adicionado aos favoritos" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao adicionar favorito" });
  }
});

// REMOVER FAVORITO
router.delete("/:clienteId/:produtoId", async (req, res) => {
  const { clienteId, produtoId } = req.params;
  try {
    await pool.query("DELETE FROM favoritos WHERE cliente_id = $1 AND produto_id = $2", [clienteId, produtoId]);
    res.json({ message: "Removido dos favoritos" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover favorito" });
  }
});

export default router;