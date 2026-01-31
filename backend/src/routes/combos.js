import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             c.produto_id as produto_vinculado_id,
             p.id as prod_id, 
             p.nome as prod_nome, 
             ic.quantidade as prod_quantidade,
             p.preco_venda as prod_preco_original
      FROM combos c
      LEFT JOIN combo_itens ic ON c.id = ic.combo_id
      LEFT JOIN produtos p ON ic.produto_id = p.id
      ORDER BY c.nome ASC
    `);

    const combosMap = new Map();

    result.rows.forEach(row => {
      if (!combosMap.has(row.id)) {
        combosMap.set(row.id, {
          id: row.id,
          nome: row.nome,
          preco_venda: row.preco_venda,
          estoque: row.estoque,
          created_at: row.created_at,
          produto_vinculado_id: row.produto_vinculado_id,
          itens: []
        });
      }

      if (row.prod_id) {
        combosMap.get(row.id).itens.push({
          produto_id: row.prod_id,
          nome: row.prod_nome,
          quantidade: row.prod_quantidade,
          preco_original: row.prod_preco_original
        });
      }
    });

    res.json(Array.from(combosMap.values()));
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
             c.produto_id as produto_vinculado_id,
             p.id as prod_id, 
             p.nome as prod_nome, 
             ic.quantidade as prod_quantidade,
             p.preco_venda as prod_preco_original
      FROM combos c
      LEFT JOIN combo_itens ic ON c.id = ic.combo_id
      LEFT JOIN produtos p ON ic.produto_id = p.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Combo não encontrado" });
    
    const combo = {
      id: result.rows[0].id,
      nome: result.rows[0].nome,
      preco_venda: result.rows[0].preco_venda,
      estoque: result.rows[0].estoque,
      created_at: result.rows[0].created_at,
      produto_vinculado_id: result.rows[0].produto_vinculado_id,
      itens: []
    };

    result.rows.forEach(row => {
      if (row.prod_id) {
        combo.itens.push({
          produto_id: row.prod_id,
          nome: row.prod_nome,
          quantidade: row.prod_quantidade,
          preco_original: row.prod_preco_original
        });
      }
    });

    res.json(combo);
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

    // 1. Criar o Combo como um Produto (para ser usado no pedido)
    const resProd = await client.query(
      "INSERT INTO produtos (nome, preco_venda, estoque, rendimento) VALUES ($1, $2, 9999, 1) RETURNING id",
      [nome, preco_venda]
    );
    const produtoId = resProd.rows[0].id;

    const resCombo = await client.query(
      "INSERT INTO combos (nome, preco_venda, produto_id) VALUES ($1, $2, $3) RETURNING id",
      [nome, preco_venda, produtoId]
    );
    const comboId = resCombo.rows[0].id;

    if (itens && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          "INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES ($1, $2, $3)",
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

    // Buscar produto_id vinculado
    const resBusca = await client.query("SELECT produto_id FROM combos WHERE id = $1", [id]);
    if (resBusca.rows.length > 0 && resBusca.rows[0].produto_id) {
      const produtoId = resBusca.rows[0].produto_id;
      // Atualizar Produto vinculado
      await client.query("UPDATE produtos SET nome = $1, preco_venda = $2 WHERE id = $3", [nome, preco_venda, produtoId]);
    }

    await client.query(
      "UPDATE combos SET nome = $1, preco_venda = $2 WHERE id = $3",
      [nome, preco_venda, id]
    );

    await client.query("DELETE FROM combo_itens WHERE combo_id = $1", [id]);

    if (itens && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          "INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES ($1, $2, $3)",
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
    // Buscar produto vinculado para deletar também
    const resBusca = await pool.query("SELECT produto_id FROM combos WHERE id = $1", [id]);
    if (resBusca.rows.length > 0 && resBusca.rows[0].produto_id) {
      const produtoId = resBusca.rows[0].produto_id;
      await pool.query("DELETE FROM produtos WHERE id = $1", [produtoId]);
    }

    await pool.query("DELETE FROM combo_itens WHERE combo_id = $1", [id]);
    await pool.query("DELETE FROM combos WHERE id = $1", [id]);
    res.json({ message: "Combo removido com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao remover combo" });
  }
});

export default router;