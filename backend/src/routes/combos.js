import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'produto_id', p.id, 
            'nome', p.nome, 
            'quantidade', ic.quantidade,
            'preco_original', p.preco_venda
          )
        ) FILTER (WHERE p.id IS NOT NULL), '[]'
      ) as itens
      FROM combos c
      LEFT JOIN itens_combo ic ON c.id = ic.combo_id
      LEFT JOIN produtos p ON ic.produto_id = p.id
      GROUP BY c.id
      ORDER BY c.nome ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar combos" });
  }
});

// OBTER UM COMBO
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT c.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'produto_id', p.id, 
            'nome', p.nome, 
            'quantidade', ic.quantidade,
            'preco_original', p.preco_venda
          )
        ) FILTER (WHERE p.id IS NOT NULL), '[]'
      ) as itens
      FROM combos c
      LEFT JOIN itens_combo ic ON c.id = ic.combo_id
      LEFT JOIN produtos p ON ic.produto_id = p.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Combo não encontrado" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar combo" });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, preco_venda, itens } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resCombo = await client.query(
      "INSERT INTO combos (nome, preco_venda) VALUES ($1, $2) RETURNING id",
      [nome, preco_venda]
    );
    const comboId = resCombo.rows[0].id;

    if (itens && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          "INSERT INTO itens_combo (combo_id, produto_id, quantidade) VALUES ($1, $2, $3)",
          [comboId, item.produto_id, item.quantidade]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Combo criado com sucesso!", id: comboId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao criar combo" });
  } finally {
    client.release();
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, preco_venda, itens } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE combos SET nome = $1, preco_venda = $2 WHERE id = $3",
      [nome, preco_venda, id]
    );

    await client.query("DELETE FROM itens_combo WHERE combo_id = $1", [id]);

    if (itens && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          "INSERT INTO itens_combo (combo_id, produto_id, quantidade) VALUES ($1, $2, $3)",
          [id, item.produto_id, item.quantidade]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Combo atualizado com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar combo" });
  } finally {
    client.release();
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM combos WHERE id = $1", [id]);
    res.json({ message: "Combo removido com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao remover combo" });
  }
});

export default router;