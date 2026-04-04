import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR
router.get("/", async (req, res) => {
  const { page, limit, search } = req.query;

  try {
    let query = "SELECT * FROM ingredientes";
    let countQuery = "SELECT COUNT(*) AS total FROM ingredientes";
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE LOWER(nome) LIKE LOWER($${paramIndex})`;
      countQuery += ` WHERE LOWER(nome) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += " ORDER BY nome ASC";

    if (page && limit) {
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const offset = (pageInt - 1) * limitInt;

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limitInt, offset);

      const countRes = await pool.query(countQuery, search ? [`%${search}%`] : []);
      const total = parseInt(countRes.rows[0].total || countRes.rows[0]['COUNT(*)'] || 0);
      const result = await pool.query(query, params);

      return res.json({
        data: result.rows,
        total,
        page: pageInt,
        totalPages: Math.ceil(total / limitInt)
      });
    }

    // Fallback: retorna tudo se não houver paginação (compatibilidade)
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar ingredientes" });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, unidade, custo, estoque, estoque_atual, usado_para_revenda } = req.body;
  try {
    await pool.query(
      "INSERT INTO ingredientes (nome, unidade, custo, estoque, estoque_atual, usado_para_revenda) VALUES ($1, $2, $3, $4, $5, $6)",
      [nome, unidade, custo, estoque, estoque_atual || 0, usado_para_revenda === undefined ? true : usado_para_revenda]
    );
    res.status(201).json({ message: "Ingrediente criado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar ingrediente" });
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, unidade, custo, estoque, estoque_atual, usado_para_revenda } = req.body;
  try {
    await pool.query(
      "UPDATE ingredientes SET nome = $1, unidade = $2, custo = $3, estoque = $4, estoque_atual = $5, usado_para_revenda = $6 WHERE id = $7",
      [nome, unidade, custo, estoque, estoque_atual || 0, usado_para_revenda, id]
    );
    res.json({ message: "Ingrediente atualizado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar ingrediente" });
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Remove referências na tabela de ligação primeiro (caso o CASCADE não esteja configurado no banco)
    await client.query("DELETE FROM produto_ingredientes WHERE ingrediente_id = $1", [id]);
    
    await client.query("DELETE FROM ingredientes WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.json({ message: "Ingrediente removido!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao deletar ingrediente:", error);
    res.status(500).json({ error: "Erro ao remover ingrediente" });
  } finally {
    client.release();
  }
});

export default router;