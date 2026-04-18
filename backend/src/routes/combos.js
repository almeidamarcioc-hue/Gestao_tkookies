import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// Cache em memória para listagem de combos
let combosCache = null;
let combosCacheAt = 0;
const COMBOS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function invalidateCombosCache() {
  combosCache = null;
  combosCacheAt = 0;
}

// LISTAR
router.get("/", async (req, res) => {
  const { apenas_ativos } = req.query;
  try {
    // Serve do cache se ainda válido (apenas sem filtros)
    if (!apenas_ativos && combosCache && (Date.now() - combosCacheAt) < COMBOS_CACHE_TTL) {
      return res.json(combosCache);
    }

    let query = `
      SELECT c.*,
             ci.id as item_id, ci.quantidade as item_quantidade,
             p.id as produto_id, p.nome as produto_nome, p.preco_venda as produto_preco,
             cing.id as cing_id, cing.ingrediente_id, cing.quantidade as cing_quantidade, cing.preco_venda as cing_preco,
             ing.nome as ingrediente_nome
      FROM combos c
      LEFT JOIN combo_itens ci ON c.id = ci.combo_id
      LEFT JOIN produtos p ON ci.produto_id = p.id
      LEFT JOIN combo_ingredientes cing ON c.id = cing.combo_id
      LEFT JOIN ingredientes ing ON cing.ingrediente_id = ing.id
    `;
    
    const params = [];

    if (apenas_ativos === 'true') {
      // Filtra apenas combos ativos (MySQL utiliza 1 para true)
      query += " WHERE c.ativo = 1";
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
          estoque: row.estoque || 0,
          imagem: row.imagem,
          ativo: !!row.ativo, // Converte 1/0 ou Buffer para boolean real
          itens: [],
          ingredientes: []
        });
      }
      
      // Correção: Verifica se o item já foi adicionado para evitar duplicatas causadas pelo JOIN dos ingredientes
      if (row.item_id && !combosMap.get(row.id).itens.some(i => i.id === row.item_id)) {
        combosMap.get(row.id).itens.push({
          id: row.item_id,
          produto_id: row.produto_id,
          nome: row.produto_nome,
          quantidade: row.item_quantidade,
          preco_original: row.produto_preco
        });
      }

      // Correção: Verifica se o ingrediente extra já foi adicionado
      if (row.cing_id && !combosMap.get(row.id).ingredientes.some(i => i.id === row.cing_id)) {
        combosMap.get(row.id).ingredientes.push({
          id: row.cing_id,
          ingrediente_id: row.ingrediente_id,
          nome: row.ingrediente_nome,
          quantidade: row.cing_quantidade,
          preco_venda: row.cing_preco
        });
      }
    });
    
    const result_list = Array.from(combosMap.values());
    if (!apenas_ativos) {
      combosCache = result_list;
      combosCacheAt = Date.now();
    }
    res.json(result_list);
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
    
    // Garante que ativo seja booleano
    combo.ativo = !!combo.ativo;

    // Buscar itens do combo
    const itensRes = await pool.query(`
      SELECT ci.*, p.nome 
      FROM combo_itens ci
      JOIN produtos p ON ci.produto_id = p.id
      WHERE ci.combo_id = $1
    `, [id]);
    
    combo.itens = itensRes.rows;
    
    const ingRes = await pool.query(`
      SELECT ci.*, i.nome 
      FROM combo_ingredientes ci
      JOIN ingredientes i ON ci.ingrediente_id = i.id
      WHERE ci.combo_id = $1
    `, [id]);
    combo.ingredientes = ingRes.rows;

    res.json(combo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar combo" });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, preco_venda, imagem, itens, ingredientes, ativo, estoque } = req.body;
  const qtdProduzir = Number(estoque) || 0;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Valida e debita estoque dos produtos (se houver quantidade a produzir)
    if (qtdProduzir > 0 && itens && itens.length > 0) {
      for (const item of itens) {
        const res = await client.query("SELECT nome, estoque FROM produtos WHERE id = $1", [item.produto_id]);
        if (!res.rows[0]) throw new Error(`Produto ID ${item.produto_id} não encontrado`);
        const estoqueDisp = Number(res.rows[0].estoque) || 0;
        const necessario = Number(item.quantidade) * qtdProduzir;
        if (estoqueDisp < necessario) {
          throw new Error(`Estoque insuficiente de "${res.rows[0].nome}": disponível ${estoqueDisp}, necessário ${necessario}`);
        }
      }
      for (const item of itens) {
        const deducao = Number(item.quantidade) * qtdProduzir;
        await client.query("UPDATE produtos SET estoque = estoque - $1 WHERE id = $2", [deducao, item.produto_id]);
      }
    }

    // Insere o combo com estoque
    const resCombo = await client.query(
      "INSERT INTO combos (nome, preco_venda, imagem, ativo, estoque) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [nome, preco_venda, imagem, (ativo === true || ativo === 1 || ativo === "true") ? 1 : 0, qtdProduzir]
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
      const vals = [];
      const ph = itens.map((item, i) => {
        const b = i * 3;
        vals.push(comboId, item.produto_id, item.quantidade);
        return `($${b+1}, $${b+2}, $${b+3})`;
      });
      await client.query(
        `INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES ${ph.join(', ')}`,
        vals
      );
    }

    // Insere os ingredientes extras
    if (ingredientes && ingredientes.length > 0) {
      const vals = [];
      const ph = ingredientes.map((ing, i) => {
        const b = i * 4;
        vals.push(comboId, ing.ingrediente_id, ing.quantidade, ing.preco_venda);
        return `($${b+1}, $${b+2}, $${b+3}, $${b+4})`;
      });
      await client.query(
        `INSERT INTO combo_ingredientes (combo_id, ingrediente_id, quantidade, preco_venda) VALUES ${ph.join(', ')}`,
        vals
      );
    }

    await client.query("COMMIT");
    invalidateCombosCache();
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
  const { nome, preco_venda, imagem, itens, ingredientes, ativo, estoque } = req.body;
  const qtdNova = Number(estoque) || 0;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Busca o estado atual do combo (estoque e itens) para restaurar estoques de produtos
    const oldComboRes = await client.query("SELECT estoque FROM combos WHERE id = $1", [id]);
    const estoqueAntigo = Number(oldComboRes.rows[0]?.estoque) || 0;
    const oldItensRes = await client.query("SELECT produto_id, quantidade FROM combo_itens WHERE combo_id = $1", [id]);

    // Devolve o consumo anterior aos produtos
    if (estoqueAntigo > 0) {
      for (const oldItem of oldItensRes.rows) {
        const restore = Number(oldItem.quantidade) * estoqueAntigo;
        await client.query("UPDATE produtos SET estoque = estoque + $1 WHERE id = $2", [restore, oldItem.produto_id]);
      }
    }

    // Valida e debita o novo consumo
    if (qtdNova > 0 && itens && itens.length > 0) {
      for (const item of itens) {
        const res = await client.query("SELECT nome, estoque FROM produtos WHERE id = $1", [item.produto_id]);
        if (!res.rows[0]) throw new Error(`Produto ID ${item.produto_id} não encontrado`);
        const estoqueDisp = Number(res.rows[0].estoque) || 0;
        const necessario = Number(item.quantidade) * qtdNova;
        if (estoqueDisp < necessario) {
          throw new Error(`Estoque insuficiente de "${res.rows[0].nome}": disponível ${estoqueDisp}, necessário ${necessario}`);
        }
      }
      for (const item of itens) {
        const deducao = Number(item.quantidade) * qtdNova;
        await client.query("UPDATE produtos SET estoque = estoque - $1 WHERE id = $2", [deducao, item.produto_id]);
      }
    }

    await client.query(
      "UPDATE combos SET nome = $1, preco_venda = $2, imagem = $3, ativo = $4, estoque = $5 WHERE id = $6",
      [nome, preco_venda, imagem, (ativo === true || ativo === 1 || ativo === "true") ? 1 : 0, qtdNova, id]
    );

    // Remove itens antigos e insere os novos
    await client.query("DELETE FROM combo_itens WHERE combo_id = $1", [id]);
    
    if (Array.isArray(itens) && itens.length > 0) {
      const vals = [];
      const ph = itens.map((item, i) => {
        const b = i * 3;
        vals.push(id, item.produto_id, item.quantidade);
        return `($${b+1}, $${b+2}, $${b+3})`;
      });
      await client.query(
        `INSERT INTO combo_itens (combo_id, produto_id, quantidade) VALUES ${ph.join(', ')}`,
        vals
      );
    }

    // Atualiza ingredientes extras
    await client.query("DELETE FROM combo_ingredientes WHERE combo_id = $1", [id]);
    if (Array.isArray(ingredientes) && ingredientes.length > 0) {
      const vals = [];
      const ph = ingredientes.map((ing, i) => {
        const b = i * 4;
        vals.push(id, ing.ingrediente_id, ing.quantidade, ing.preco_venda);
        return `($${b+1}, $${b+2}, $${b+3}, $${b+4})`;
      });
      await client.query(
        `INSERT INTO combo_ingredientes (combo_id, ingrediente_id, quantidade, preco_venda) VALUES ${ph.join(', ')}`,
        vals
      );
    }

    await client.query("COMMIT");
    invalidateCombosCache();
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
    
    // 1. Remover itens e ingredientes do combo primeiro
    await client.query("DELETE FROM combo_ingredientes WHERE combo_id = $1", [id]);
    await client.query("DELETE FROM combo_itens WHERE combo_id = $1", [id]);
    
    // 2. Remover o combo
    await client.query("DELETE FROM combos WHERE id = $1", [id]);
    
    await client.query("COMMIT");
    invalidateCombosCache();
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