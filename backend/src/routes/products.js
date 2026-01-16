import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR PRODUTOS (Com ingredientes e custos base)
router.get("/", async (req, res) => {
  try {
    // Busca dados planos para evitar incompatibilidade de funções JSON entre Postgres e MySQL/TiDB
    const result = await pool.query(`
      SELECT p.*, 
             i.id as ing_id, 
             i.nome as ing_nome, 
             pi.quantidade as ing_quantidade, 
             i.unidade as ing_unidade,
             i.custo as ing_custo, 
             i.estoque as ing_estoque, 
             i.usado_para_revenda as ing_usado_para_revenda,
             pi.apenas_revenda as ing_apenas_revenda,
             pim.id as img_id,
             pim.imagem as img_conteudo,
             pim.eh_capa as img_eh_capa
      FROM produtos p
      LEFT JOIN produto_ingredientes pi ON p.id = pi.produto_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      LEFT JOIN produto_imagens pim ON p.id = pim.produto_id
      ORDER BY p.nome ASC
    `);

    // Agrupa os ingredientes por produto via Javascript
    const productsMap = new Map();

    result.rows.forEach(row => {
      if (!productsMap.has(row.id)) {
        productsMap.set(row.id, {
          id: row.id,
          nome: row.nome,
          preco_venda: row.preco_venda,
          margem_revenda: row.margem_revenda,
          preco_revenda: row.preco_revenda,
          rendimento: row.rendimento,
          estoque: row.estoque,
          eh_destaque: row.eh_destaque === 1 || row.eh_destaque === true,
          desconto_destaque: row.desconto_destaque,
          created_at: row.created_at,
          ingredientes: [],
          imagens: []
        });
      }

      if (row.ing_id && !productsMap.get(row.id).ingredientes.some(i => i.ingrediente_id === row.ing_id)) {
        productsMap.get(row.id).ingredientes.push({
          ingrediente_id: row.ing_id,
          nome: row.ing_nome,
          quantidade: row.ing_quantidade,
          unidade: row.ing_unidade,
          custo_base: row.ing_custo,
          estoque_base: row.ing_estoque,
          usado_para_revenda: row.ing_usado_para_revenda === 1 || row.ing_usado_para_revenda === true,
          apenas_revenda: row.ing_apenas_revenda === 1 || row.ing_apenas_revenda === true
        });
      }

      if (row.img_id && !productsMap.get(row.id).imagens.some(img => img.id === row.img_id)) {
        productsMap.get(row.id).imagens.push({
          id: row.img_id,
          imagem: row.img_conteudo,
          eh_capa: row.img_eh_capa === 1 || row.img_eh_capa === true
        });
      }
    });

    res.json(Array.from(productsMap.values()));
  } catch (error) {
    console.error("Erro detalhado ao listar produtos:", error);
    res.status(500).json({ error: "Erro ao procurar produtos" });
  }
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  const { nome, preco_venda, margem_revenda, preco_revenda, ingredientes, rendimento, imagens, eh_destaque, desconto_destaque } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Se for destaque, remove o destaque dos outros
    if (eh_destaque) {
      await client.query("UPDATE produtos SET eh_destaque = FALSE");
    }

    const resProd = await client.query(
      "INSERT INTO produtos (nome, preco_venda, margem_revenda, preco_revenda, rendimento, eh_destaque, desconto_destaque) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [nome, preco_venda, margem_revenda || 0, preco_revenda || 0, rendimento || 1, eh_destaque || false, desconto_destaque || 0]
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

    if (imagens && imagens.length > 0) {
      for (const img of imagens) {
        await client.query(
          "INSERT INTO produto_imagens (produto_id, imagem, eh_capa) VALUES ($1, $2, $3)",
          [produtoId, img.imagem, img.eh_capa || false]
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
  const { nome, preco_venda, margem_revenda, preco_revenda, ingredientes, rendimento, imagens, eh_destaque, desconto_destaque } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Se for destaque, remove o destaque dos outros
    if (eh_destaque) {
      await client.query("UPDATE produtos SET eh_destaque = FALSE WHERE id != $1", [id]);
    }

    // Atualiza dados básicos do produto
    await client.query(
      "UPDATE produtos SET nome = $1, preco_venda = $2, margem_revenda = $3, preco_revenda = $4, rendimento = $5, eh_destaque = $6, desconto_destaque = $7 WHERE id = $8",
      [nome, preco_venda, margem_revenda || 0, preco_revenda || 0, rendimento || 1, eh_destaque || false, desconto_destaque || 0, id]
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

    // Atualiza imagens (remove antigas e insere novas para simplificar)
    await client.query("DELETE FROM produto_imagens WHERE produto_id = $1", [id]);
    
    if (imagens && imagens.length > 0) {
      for (const img of imagens) {
        if (img.imagem) {
          await client.query(
            "INSERT INTO produto_imagens (produto_id, imagem, eh_capa) VALUES ($1, $2, $3)",
            [id, img.imagem, img.eh_capa || false]
          );
        }
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

// ALTERAR DESTAQUE (PATCH)
router.patch("/:id/destaque", async (req, res) => {
  const { id } = req.params;
  const { eh_destaque } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (eh_destaque) {
      // Se estiver ativando, desativa todos os outros primeiro
      await client.query("UPDATE produtos SET eh_destaque = FALSE");
    }

    await client.query("UPDATE produtos SET eh_destaque = $1 WHERE id = $2", [eh_destaque, id]);

    await client.query("COMMIT");
    res.json({ message: "Destaque atualizado!" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Erro ao atualizar destaque" });
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