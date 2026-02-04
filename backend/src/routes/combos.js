import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR
router.get("/", async (req, res) => {
  const { apenas_ativos } = req.query;
  try {
    let query = `
      SELECT c.*, 
             ci.id as item_id, ci.quantidade as item_quantidade,
             p.id as produto_id, p.nome as produto_nome, p.preco_venda as produto_preco
      FROM combos c
      LEFT JOIN combo_itens ci ON c.id = ci.combo_id
      LEFT JOIN produtos p ON ci.produto_id = p.id
    `;
    
    const params = [];
    
    if (apenas_ativos === 'true') {
      query += " WHERE c.ativo = TRUE";
    }
    
    query += " ORDER BY c.nome ASC";
    
    const result = await pool.query(query, params);
    
    const combosMap = new Map();
    
    result.rows.forEach(row => {
      if (!combosMap.has(row.id)) {
        combosMap.set(row.id, {
          id: row.id,
          nome: row.nome,
          preco_venda: row.preco_venda,
          imagem: row.imagem,
          ativo: row.ativo,
          itens: [] // Garante que itens seja um array, evitando o erro de reduce
        });
      }
      
      if (row.item_id) {
        combosMap.get(row.id).itens.push({
          id: row.item_id,
          produto_id: row.produto_id,
          nome: row.produto_nome,
          quantidade: row.item_quantidade,
          preco_original: row.produto_preco
        });
      }
    });
    
    res.json(Array.from(combosMap.values()));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar combos" });
  }
});

// OBTER UM
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM combos WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Combo não encontrado" });
    
    const combo = result.rows[0];
    
    // Buscar itens do combo
    const itensRes = await pool.query(`
      SELECT ci.*, p.nome 
      FROM combo_itens ci
      JOIN produtos p ON ci.produto_id = p.id
      WHERE ci.combo_id = $1
    `, [id]);
    
    combo.itens = itensRes.rows;
    
    res.json(combo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar combo" });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, preco_venda, imagem, itens, ativo } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Insere o combo
    const resCombo = await client.query(
      "INSERT INTO combos (nome, preco_venda, imagem, ativo) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, preco_venda, imagem, (ativo === undefined || ativo === true || ativo === 1 || ativo === "true") ? 1 : 0]
    );
    
    // Compatibilidade para pegar o ID gerado
    let comboId;
    if (resCombo.rows && resCombo.rows.length > 0) {
        comboId = resCombo.rows[0].id;
    } else if (resCombo.insertId) {
        comboId = resCombo.insertId;
    }

    // Insere os itens
    if (itens && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          "INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES ($1, $2, $3)",
          [comboId, item.produto_id, item.quantidade]
        );
      }
    }
    
    await client.query("COMMIT");
    res.status(201).json({ message: "Combo criado!", id: comboId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao criar combo:", error);
    res.status(500).json({ error: "Erro ao criar combo", details: error.message });
  } finally {
    client.release();
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, preco_venda, imagem, itens, ativo } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    await client.query(
      "UPDATE combos SET nome = $1, preco_venda = $2, imagem = $3, ativo = $4 WHERE id = $5",
      [nome, preco_venda, imagem, (ativo === true || ativo === 1 || ativo === "true") ? 1 : 0, id]
    );
    
    // Remove itens antigos e insere os novos
    await client.query("DELETE FROM combo_itens WHERE combo_id = $1", [id]);
    
    if (Array.isArray(itens) && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          "INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES ($1, $2, $3)",
          [id, item.produto_id, item.quantidade]
        );
      }
    }
    
    await client.query("COMMIT");
    res.json({ message: "Combo atualizado!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao atualizar combo:", error);
    res.status(500).json({ error: "Erro ao atualizar combo", details: error.message });
  } finally {
    client.release();
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Remover itens do combo primeiro (Correção do erro 500)
    await client.query("DELETE FROM combo_itens WHERE combo_id = $1", [id]);
    
    // 2. Remover o combo
    await client.query("DELETE FROM combos WHERE id = $1", [id]);
    
    await client.query("COMMIT");
    res.json({ message: "Combo removido!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao deletar combo:", error);
    res.status(500).json({ error: "Erro ao remover combo" });
  } finally {
    client.release();
  }
});

export default router;