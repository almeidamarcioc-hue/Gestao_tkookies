import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR PRODUTOS (Com ingredientes e custos base)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'ingrediente_id', i.id, 
            'nome', i.nome, 
            'quantidade', pi.quantidade, 
            'unidade', i.unidade,
            'custo_base', i.custo,
            'estoque_base', i.estoque,
            'usado_para_revenda', i.usado_para_revenda,
            'apenas_revenda', pi.apenas_revenda
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]'
      ) as ingredientes
      FROM produtos p
      LEFT JOIN produto_ingredientes pi ON p.id = pi.produto_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      GROUP BY p.id
      ORDER BY p.nome ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro detalhado ao listar produtos:", error);
    res.status(500).json({ error: "Erro ao procurar produtos" });
  }
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  const { nome, preco_venda, margem_revenda, preco_revenda, ingredientes, rendimento } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resProd = await client.query(
      "INSERT INTO produtos (nome, preco_venda, margem_revenda, preco_revenda, rendimento) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [nome, preco_venda, margem_revenda || 0, preco_revenda || 0, rendimento || 1]
    );
    const produtoId = resProd.rows[0].id;

    if (ingredientes && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        await client.query(
          "INSERT INTO produto_ingredientes (produto_id, ingrediente_id, quantidade, apenas_revenda) VALUES ($1, $2, $3, $4)",
          [produtoId, ing.ingrediente_id, ing.quantidade, ing.apenas_revenda || false]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Produto criado com sucesso!", id: produtoId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao criar produto" });
  } finally {
    client.release();
  }
});

// ATUALIZAR PRODUTO (Edição total)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, preco_venda, margem_revenda, preco_revenda, ingredientes, rendimento } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Atualiza dados básicos do produto
    await client.query(
      "UPDATE produtos SET nome = $1, preco_venda = $2, margem_revenda = $3, preco_revenda = $4, rendimento = $5 WHERE id = $6",
      [nome, preco_venda, margem_revenda || 0, preco_revenda || 0, rendimento || 1, id]
    );

    // Remove ingredientes antigos para reinserir os atualizados
    await client.query("DELETE FROM produto_ingredientes WHERE produto_id = $1", [id]);

    if (ingredientes && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        await client.query(
          "INSERT INTO produto_ingredientes (produto_id, ingrediente_id, quantidade, apenas_revenda) VALUES ($1, $2, $3, $4)",
          [id, ing.ingrediente_id, ing.quantidade, ing.apenas_revenda || false]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Produto atualizado com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  } finally {
    client.release();
  }
});

// DELETAR PRODUTO
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM produtos WHERE id = $1", [id]);
    res.json({ message: "Produto removido com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao remover produto" });
  }
});

export default router;