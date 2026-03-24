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
             pim.eh_capa as img_eh_capa,
             pagg.id as agg_id,
             pagg.nome as agg_nome,
             pa.preco as agg_preco,
             pagg.estoque as agg_estoque,
             pagg_img.imagem as agg_imagem
      FROM produtos p
      LEFT JOIN produto_ingredientes pi ON p.id = pi.produto_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      LEFT JOIN produto_imagens pim ON p.id = pim.produto_id
      LEFT JOIN produto_agregados pa ON p.id = pa.produto_id
      LEFT JOIN produtos pagg ON pa.agregado_id = pagg.id
      LEFT JOIN produto_imagens pagg_img ON pagg.id = pagg_img.produto_id AND pagg_img.eh_capa = 1
      ORDER BY p.nome ASC
    `);

    // Agrupa os ingredientes por produto via Javascript
    const productsMap = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    result.rows.forEach(row => {
      if (!productsMap.has(row.id)) {
        let isDestaque = row.eh_destaque === 1 || row.eh_destaque === true;
        
        // Lógica para expirar promoção automaticamente na listagem
        if (isDestaque && row.validade_promocao) {
          const validade = new Date(row.validade_promocao);
          // Ajusta para comparar apenas datas (ignora hora)
          validade.setHours(0, 0, 0, 0);
          // Se a validade for menor que hoje, a promoção expirou
          if (validade < today) {
            isDestaque = false;
          }
        }

        productsMap.set(row.id, {
          id: row.id,
          nome: row.nome,
          descricao: row.descricao,
          preco_venda: row.preco_venda,
          margem_revenda: row.margem_revenda,
          preco_revenda: row.preco_revenda,
          rendimento: row.rendimento,
          estoque: row.estoque,
          ativo: row.ativo !== 0 && row.ativo !== false, // Garante booleano
          eh_agregado: row.eh_agregado === 1 || row.eh_agregado === true,
          custo: row.custo || 0,
          eh_destaque: isDestaque,
          desconto_destaque: row.desconto_destaque,
          validade_promocao: row.validade_promocao ? new Date(row.validade_promocao).toISOString().split('T')[0] : null,
          created_at: row.created_at,
          ingredientes: [],
          imagens: [],
          agregados: []
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

      if (row.agg_id && !productsMap.get(row.id).agregados.some(a => a.id === row.agg_id)) {
        productsMap.get(row.id).agregados.push({
          id: row.agg_id,
          nome: row.agg_nome,
          preco: row.agg_preco,
          estoque: row.agg_estoque,
          imagem: row.agg_imagem
        });
      }
    });

    res.json(Array.from(productsMap.values()));
  } catch (error) {
    console.error("Erro detalhado ao listar produtos:", error);
    res.status(500).json({ error: "Erro ao procurar produtos" });
  }
});

// OBTER UM PRODUTO (Para edição)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
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
             pim.eh_capa as img_eh_capa,
             pagg.id as agg_id,
             pagg.nome as agg_nome,
             pa.preco as agg_preco,
             pagg.estoque as agg_estoque,
             pagg_img.imagem as agg_imagem
      FROM produtos p
      LEFT JOIN produto_ingredientes pi ON p.id = pi.produto_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      LEFT JOIN produto_imagens pim ON p.id = pim.produto_id
      LEFT JOIN produto_agregados pa ON p.id = pa.produto_id
      LEFT JOIN produtos pagg ON pa.agregado_id = pagg.id
      LEFT JOIN produto_imagens pagg_img ON pagg.id = pagg_img.produto_id AND pagg_img.eh_capa = 1
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Produto não encontrado" });

    const row = result.rows[0];
    const product = {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      preco_venda: row.preco_venda,
      margem_revenda: row.margem_revenda,
      preco_revenda: row.preco_revenda,
      rendimento: row.rendimento,
      estoque: row.estoque,
      ativo: row.ativo !== 0 && row.ativo !== false,
      eh_agregado: row.eh_agregado === 1 || row.eh_agregado === true,
      custo: row.custo || 0,
      eh_destaque: row.eh_destaque === 1 || row.eh_destaque === true,
      desconto_destaque: row.desconto_destaque,
      validade_promocao: row.validade_promocao ? new Date(row.validade_promocao).toISOString().split('T')[0] : null,
      created_at: row.created_at,
      ingredientes: [],
      imagens: [],
      agregados: []
    };

    const ingMap = new Map();
    const imgMap = new Map();
    const aggMap = new Map();

    result.rows.forEach(r => {
      if (r.ing_id && !ingMap.has(r.ing_id)) {
        ingMap.set(r.ing_id, true);
        product.ingredientes.push({
          ingrediente_id: r.ing_id,
          nome: r.ing_nome,
          quantidade: r.ing_quantidade,
          unidade: r.ing_unidade,
          custo_base: r.ing_custo,
          estoque_base: r.ing_estoque,
          usado_para_revenda: r.ing_usado_para_revenda === 1 || r.ing_usado_para_revenda === true,
          apenas_revenda: r.ing_apenas_revenda === 1 || r.ing_apenas_revenda === true
        });
      }
      if (r.img_id && !imgMap.has(r.img_id)) {
        imgMap.set(r.img_id, true);
        product.imagens.push({
          id: r.img_id,
          imagem: r.img_conteudo,
          eh_capa: r.img_eh_capa === 1 || r.img_eh_capa === true
        });
      }
      if (r.agg_id && !aggMap.has(r.agg_id)) {
        aggMap.set(r.agg_id, true);
        product.agregados.push({
          id: r.agg_id,
          nome: r.agg_nome,
          preco: r.agg_preco,
          estoque: r.agg_estoque,
          imagem: r.agg_imagem
        });
      }
    });

    res.json(product);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  const { nome, descricao, preco_venda, margem_revenda, preco_revenda, ingredientes, rendimento, imagens, eh_destaque, desconto_destaque, validade_promocao, agregados, ativo, eh_agregado, custo, estoque } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const isDestaque = eh_destaque === true || eh_destaque === 1 || eh_destaque === 'true';
    const validadeFinal = isDestaque ? (validade_promocao || null) : null;
    const descontoFinal = isDestaque ? (desconto_destaque || 0) : 0;

    const resProd = await client.query(
      "INSERT INTO produtos (nome, descricao, preco_venda, margem_revenda, preco_revenda, rendimento, eh_destaque, desconto_destaque, validade_promocao, ativo, eh_agregado, custo, estoque) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id",
      [nome, descricao || null, preco_venda, margem_revenda || 0, preco_revenda || 0, rendimento || 1, isDestaque, descontoFinal, validadeFinal, (ativo === false ? false : true), eh_agregado || false, custo || 0, estoque || 0]
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

    if (agregados && agregados.length > 0) {
      for (const agg of agregados) {
        await client.query(
          "INSERT INTO produto_agregados (produto_id, agregado_id, preco) VALUES ($1, $2, $3)",
          [produtoId, agg.id, agg.preco]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Produto criado com sucesso!", id: produtoId });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rbError) {
      console.error("Erro no Rollback (conexão perdida?):", rbError.message);
    }
    console.error("Erro ao criar produto:", error);
    if (error.message && error.message.includes("Unknown column")) {
      return res.status(500).json({ 
        error: "Banco de dados desatualizado", 
        details: "Acesse /api/migrate para criar as novas colunas (validade_promocao).",
        technical: error.message
      });
    }
    res.status(500).json({ error: "Erro ao criar produto", details: error.message });
  } finally {
    client.release();
  }
});

// ATUALIZAR PRODUTO (Edição total)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco_venda, margem_revenda, preco_revenda, ingredientes, rendimento, imagens, eh_destaque, desconto_destaque, validade_promocao, agregados, ativo, eh_agregado, custo, estoque } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const isDestaque = eh_destaque === true || eh_destaque === 1 || eh_destaque === 'true';
    const validadeFinal = isDestaque ? (validade_promocao || null) : null;
    const descontoFinal = isDestaque ? (desconto_destaque || 0) : 0;

    // Atualiza dados básicos do produto
    await client.query(
      "UPDATE produtos SET nome = $1, descricao = $2, preco_venda = $3, margem_revenda = $4, preco_revenda = $5, rendimento = $6, eh_destaque = $7, desconto_destaque = $8, validade_promocao = $9, ativo = $10, eh_agregado = $11, custo = $12, estoque = $13 WHERE id = $14",
      [nome, descricao || null, preco_venda, margem_revenda || 0, preco_revenda || 0, rendimento || 1, isDestaque, descontoFinal, validadeFinal, (ativo === false ? false : true), eh_agregado || false, custo || 0, estoque || 0, id]
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

    // Atualiza agregados (remove antigos e insere novos)
    await client.query("DELETE FROM produto_agregados WHERE produto_id = $1", [id]);
    if (agregados && agregados.length > 0) {
      for (const agg of agregados) {
        await client.query(
          "INSERT INTO produto_agregados (produto_id, agregado_id, preco) VALUES ($1, $2, $3)",
          [id, agg.id, agg.preco]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Produto atualizado com sucesso!" });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rbError) {
      console.error("Erro no Rollback (conexão perdida?):", rbError.message);
    }
    console.error("Erro ao atualizar produto:", error);
    if (error.message && error.message.includes("Unknown column")) {
      return res.status(500).json({ 
        error: "Banco de dados desatualizado", 
        details: "Acesse /api/migrate para criar as novas colunas (validade_promocao).",
        technical: error.message
      });
    }
    res.status(500).json({ error: "Erro ao atualizar produto", details: error.message });
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

// ALTERAR STATUS ATIVO/INATIVO (PATCH)
router.patch("/:id/ativo", async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Garante conversão segura para booleano
    const ativoStatus = ativo === true || ativo === 'true' || ativo === 1;

    await client.query("UPDATE produtos SET ativo = $1 WHERE id = $2", [ativoStatus, id]);

    await client.query("COMMIT");
    res.json({ message: "Status do produto atualizado!" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Erro ao atualizar status do produto" });
  } finally {
    client.release();
  }
});

// DELETAR PRODUTO
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { confirm } = req.query; // ?confirm=true para forçar exclusão
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verifica se o produto está em uso (Pedidos ou Combos)
    const checkPedidos = await client.query("SELECT COUNT(*) as total FROM itens_pedido WHERE produto_id = $1", [id]);
    const checkCombos = await client.query("SELECT COUNT(*) as total FROM combo_itens WHERE produto_id = $1", [id]);
    const checkAgregados = await client.query("SELECT COUNT(*) as total FROM produto_agregados WHERE agregado_id = $1", [id]);
    
    const totalUsos = Number(checkPedidos.rows[0].total) + Number(checkCombos.rows[0].total) + Number(checkAgregados.rows[0].total);

    if (totalUsos > 0 && confirm !== 'true') {
      await client.query("ROLLBACK");
      return res.status(409).json({ 
        error: "Este produto está vinculado a pedidos, combos ou é agregado de outro produto.",
        confirmationRequired: true,
        message: `Este item aparece em ${totalUsos} registros (pedidos, combos ou agregados). Excluí-lo removerá esses vínculos. Deseja continuar?`
      });
    }

    // 2. Se confirmado ou sem uso, remove as dependências manuais (caso o banco não tenha CASCADE configurado)
    await client.query("DELETE FROM itens_pedido WHERE produto_id = $1", [id]);
    await client.query("DELETE FROM combo_itens WHERE produto_id = $1", [id]);
    await client.query("DELETE FROM produto_agregados WHERE produto_id = $1 OR agregado_id = $1", [id]);
    
    // 3. Remove o produto
    await client.query("DELETE FROM produtos WHERE id = $1", [id]);
    
    await client.query("COMMIT");
    res.json({ message: "Produto removido com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao deletar produto:", error);
    res.status(500).json({ error: "Erro ao remover produto" });
  } finally {
    client.release();
  }
});

export default router;