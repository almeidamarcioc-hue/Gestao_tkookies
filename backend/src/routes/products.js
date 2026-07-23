import { Router } from "express";
import { pool } from "../db/index.js";
import { initDatabase } from "../db/init.js";
import { authenticateToken, requireRole } from "../middlewares/auth.js";

const router = Router();

// Cache em memória para listagem de produtos
let productsCache = null;
let productsCacheAt = 0;
const PRODUCTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function invalidateProductsCache() {
  productsCache = null;
  productsCacheAt = 0;
}

// Função auxiliar para buscar produtos (evita duplicação de código)
async function fetchProducts() {
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
             pagg_img.imagem as agg_imagem,
             pb.brinde_produto_id as brinde_id,
             pbp.nome as brinde_nome,
             pb.tipo_quantidade as brinde_tipo_quantidade,
             pbp.estoque as brinde_estoque,
             pbp_img.imagem as brinde_imagem
      FROM produtos p
      LEFT JOIN produto_ingredientes pi ON p.id = pi.produto_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      LEFT JOIN produto_imagens pim ON p.id = pim.produto_id
      LEFT JOIN produto_agregados pa ON p.id = pa.produto_id
      LEFT JOIN produtos pagg ON pa.agregado_id = pagg.id
      LEFT JOIN produto_imagens pagg_img ON pagg.id = pagg_img.produto_id AND pagg_img.eh_capa = TRUE
      LEFT JOIN produto_brindes pb ON p.id = pb.produto_id
      LEFT JOIN produtos pbp ON pb.brinde_produto_id = pbp.id
      LEFT JOIN produto_imagens pbp_img ON pbp.id = pbp_img.produto_id AND pbp_img.eh_capa = TRUE
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
        validade.setHours(0, 0, 0, 0);
        if (validade < today) {
          isDestaque = false;
        }
      }

      productsMap.set(row.id, {
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        preco_venda: row.preco_venda,
        margem_venda: row.margem_venda,
        margem_revenda: row.margem_revenda,
        preco_revenda: row.preco_revenda,
        rendimento: row.rendimento,
        estoque: row.estoque,
        ativo: row.ativo !== 0 && row.ativo !== false,
        eh_agregado: row.eh_agregado === 1 || row.eh_agregado === true,
        custo: row.custo || 0,
        eh_destaque: isDestaque,
        desconto_destaque: row.desconto_destaque,
        validade_promocao: row.validade_promocao ? new Date(row.validade_promocao).toISOString().split('T')[0] : null,
        ocasiao: row.ocasiao || null,
        eh_brinde: row.eh_brinde === 1 || row.eh_brinde === true,
        disponivel_revenda: row.disponivel_revenda === 1 || row.disponivel_revenda === true,
        created_at: row.created_at,
        ingredientes: [],
        imagens: [],
        agregados: [],
        brindes: []
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

    if (row.brinde_id && !productsMap.get(row.id).brindes.some(b => b.id === row.brinde_id)) {
      productsMap.get(row.id).brindes.push({
        id: row.brinde_id,
        nome: row.brinde_nome,
        tipo_quantidade: row.brinde_tipo_quantidade || 'unidade',
        estoque: row.brinde_estoque,
        imagem: row.brinde_imagem
      });
    }
  });

  return Array.from(productsMap.values());
}

// LISTAR PRODUTOS (Com ingredientes e custos base)
router.get("/", async (req, res) => {
  try {
    // Serve do cache se ainda válido
    if (productsCache && (Date.now() - productsCacheAt) < PRODUCTS_CACHE_TTL) {
      return res.json(productsCache);
    }
    const produtos = await fetchProducts();
    productsCache = produtos;
    productsCacheAt = Date.now();
    res.json(produtos);
  } catch (error) {
    // Se o erro for de coluna desconhecida, tenta rodar a migração e tenta de novo
    if (error.code === 'ER_BAD_FIELD_ERROR' || (error.message && error.message.includes("Unknown column"))) {
      console.warn("⚠️ Detectado esquema de banco desatualizado. Tentando migração automática...");
      try {
        await initDatabase();
        console.log("✅ Migração concluída. Tentando buscar produtos novamente...");
        const produtosRetry = await fetchProducts();
        return res.json(produtosRetry);
      } catch (retryError) {
        console.error("❌ Erro fatal após tentativa de migração:", retryError);
        return res.status(500).json({ error: "Erro ao listar produtos após migração", details: retryError.message });
      }
    }

    console.error("Erro detalhado ao listar produtos:", error);
    res.status(500).json({ error: "Erro ao procurar produtos", details: error.message });
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
             pagg_img.imagem as agg_imagem,
             pb.brinde_produto_id as brinde_id,
             pbp.nome as brinde_nome,
             pb.tipo_quantidade as brinde_tipo_quantidade,
             pbp.estoque as brinde_estoque,
             pbp_img.imagem as brinde_imagem
      FROM produtos p
      LEFT JOIN produto_ingredientes pi ON p.id = pi.produto_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      LEFT JOIN produto_imagens pim ON p.id = pim.produto_id
      LEFT JOIN produto_agregados pa ON p.id = pa.produto_id
      LEFT JOIN produtos pagg ON pa.agregado_id = pagg.id
      LEFT JOIN produto_imagens pagg_img ON pagg.id = pagg_img.produto_id AND pagg_img.eh_capa = TRUE
      LEFT JOIN produto_brindes pb ON p.id = pb.produto_id
      LEFT JOIN produtos pbp ON pb.brinde_produto_id = pbp.id
      LEFT JOIN produto_imagens pbp_img ON pbp.id = pbp_img.produto_id AND pbp_img.eh_capa = TRUE
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Produto não encontrado" });

    const row = result.rows[0];
    const product = {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      preco_venda: row.preco_venda,
      margem_venda: row.margem_venda,
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
      ocasiao: row.ocasiao || null,
      eh_brinde: row.eh_brinde === 1 || row.eh_brinde === true,
      disponivel_revenda: row.disponivel_revenda === 1 || row.disponivel_revenda === true,
      created_at: row.created_at,
      ingredientes: [],
      imagens: [],
      agregados: [],
      brindes: []
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
      if (r.brinde_id && !product.brindes.some(b => b.id === r.brinde_id)) {
        product.brindes.push({
          id: r.brinde_id,
          nome: r.brinde_nome,
          tipo_quantidade: r.brinde_tipo_quantidade || 'unidade',
          estoque: r.brinde_estoque,
          imagem: r.brinde_imagem
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
router.post("/", authenticateToken, requireRole('admin'), async (req, res) => {
  const { nome, descricao, preco_venda, margem_venda, margem_revenda, preco_revenda, ingredientes, rendimento, imagens, eh_destaque, desconto_destaque, validade_promocao, agregados, ativo, eh_agregado, custo, estoque, ocasiao, eh_brinde, brindes, disponivel_revenda } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const isDestaque = eh_destaque === true || eh_destaque === 1 || eh_destaque === 'true';
    const validadeFinal = isDestaque ? (validade_promocao || null) : null;
    const descontoFinal = isDestaque ? (desconto_destaque || 0) : 0;

    let insertFields = ["nome", "descricao", "preco_venda", "margem_venda", "margem_revenda", "preco_revenda", "rendimento", "eh_destaque", "desconto_destaque", "validade_promocao", "ativo", "eh_agregado", "ocasiao", "eh_brinde", "disponivel_revenda"];
    let insertValues = ["$1", "$2", "$3", "$4", "$5", "$6", "$7", "$8", "$9", "$10", "$11", "$12", "$13", "$14", "$15"];
    let insertParams = [
      nome,
      descricao || null,
      preco_venda,
      margem_venda || 0,
      margem_revenda || 0,
      preco_revenda || 0,
      rendimento || 1,
      isDestaque,
      descontoFinal,
      validadeFinal,
      (ativo === false ? false : true),
      eh_agregado || false,
      ocasiao || null,
      eh_brinde || false,
      (disponivel_revenda === true || disponivel_revenda === 1 || disponivel_revenda === 'true')
    ];
    let paramIndex = insertParams.length + 1;

    if (eh_agregado) {
      insertFields.push("custo");
      insertValues.push(`$${paramIndex++}`);
      insertParams.push(custo || 0);
      insertFields.push("estoque");
      insertValues.push(`$${paramIndex++}`);
      insertParams.push(estoque || 0);
    }

    const resProd = await client.query(
      `INSERT INTO produtos (${insertFields.join(", ")}) VALUES (${insertValues.join(", ")}) RETURNING id`,
      insertParams
    );
    const produtoId = resProd.rows[0].id;

    if (ingredientes && ingredientes.length > 0) {
      const vals = [];
      const placeholders = ingredientes.map((ing, i) => {
        const b = i * 4;
        vals.push(produtoId, ing.ingrediente_id, ing.quantidade, ing.apenas_revenda || false);
        return `($${b+1}, $${b+2}, $${b+3}, $${b+4})`;
      });
      await client.query(
        `INSERT INTO produto_ingredientes (produto_id, ingrediente_id, quantidade, apenas_revenda) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    if (imagens && imagens.length > 0) {
      const vals = [];
      const placeholders = imagens.map((img, i) => {
        const b = i * 3;
        vals.push(produtoId, img.imagem, img.eh_capa || false);
        return `($${b+1}, $${b+2}, $${b+3})`;
      });
      await client.query(
        `INSERT INTO produto_imagens (produto_id, imagem, eh_capa) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    if (agregados && agregados.length > 0) {
      const vals = [];
      const placeholders = agregados.map((agg, i) => {
        const b = i * 3;
        vals.push(produtoId, agg.id, agg.preco);
        return `($${b+1}, $${b+2}, $${b+3})`;
      });
      await client.query(
        `INSERT INTO produto_agregados (produto_id, agregado_id, preco) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    if (brindes && brindes.length > 0) {
      const vals = [];
      const placeholders = brindes.map((b, i) => {
        const base = i * 3;
        vals.push(produtoId, b.id, b.tipo_quantidade || 'unidade');
        return `($${base+1}, $${base+2}, $${base+3})`;
      });
      await client.query(
        `INSERT INTO produto_brindes (produto_id, brinde_produto_id, tipo_quantidade) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    await client.query("COMMIT");
    invalidateProductsCache();
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
router.put("/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco_venda, margem_venda, margem_revenda, preco_revenda, ingredientes, rendimento, imagens, eh_destaque, desconto_destaque, validade_promocao, agregados, ativo, eh_agregado, custo, estoque, ocasiao, eh_brinde, brindes, disponivel_revenda } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const isDestaque = eh_destaque === true || eh_destaque === 1 || eh_destaque === 'true';
    const validadeFinal = isDestaque ? (validade_promocao || null) : null;
    const descontoFinal = isDestaque ? (desconto_destaque || 0) : 0;

    let updateFields = [
      "nome = $1",
      "descricao = $2",
      "preco_venda = $3",
      "margem_venda = $4",
      "margem_revenda = $5",
      "preco_revenda = $6",
      "rendimento = $7",
      "eh_destaque = $8",
      "desconto_destaque = $9",
      "validade_promocao = $10",
      "ativo = $11",
      "eh_agregado = $12",
      "ocasiao = $13",
      "eh_brinde = $14",
      "disponivel_revenda = $15"
    ];
    let updateParams = [
      nome,
      descricao || null,
      preco_venda,
      margem_venda || 0,
      margem_revenda || 0,
      preco_revenda || 0,
      rendimento || 1,
      isDestaque,
      descontoFinal,
      validadeFinal,
      (ativo === false ? false : true),
      eh_agregado || false,
      ocasiao || null,
      eh_brinde || false,
      (disponivel_revenda === true || disponivel_revenda === 1 || disponivel_revenda === 'true')
    ];
    let paramIndex = updateParams.length + 1;

    if (eh_agregado) {
      updateFields.push(`custo = $${paramIndex++}`);
      updateParams.push(custo || 0);
      updateFields.push(`estoque = $${paramIndex++}`);
      updateParams.push(estoque || 0);
    }

    updateParams.push(id); // Add product ID for WHERE clause

    await client.query(
      `UPDATE produtos SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
      updateParams
    );

    // Remove ingredientes antigos para reinserir os atualizados
    await client.query("DELETE FROM produto_ingredientes WHERE produto_id = $1", [id]);

    if (ingredientes && ingredientes.length > 0) {
      const vals = [];
      const placeholders = ingredientes.map((ing, i) => {
        const b = i * 4;
        vals.push(id, ing.ingrediente_id, ing.quantidade, ing.apenas_revenda || false);
        return `($${b+1}, $${b+2}, $${b+3}, $${b+4})`;
      });
      await client.query(
        `INSERT INTO produto_ingredientes (produto_id, ingrediente_id, quantidade, apenas_revenda) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    // Atualiza imagens (remove antigas e insere novas para simplificar)
    await client.query("DELETE FROM produto_imagens WHERE produto_id = $1", [id]);

    const imagensValidas = (imagens || []).filter(img => img.imagem);
    if (imagensValidas.length > 0) {
      const vals = [];
      const placeholders = imagensValidas.map((img, i) => {
        const b = i * 3;
        vals.push(id, img.imagem, img.eh_capa || false);
        return `($${b+1}, $${b+2}, $${b+3})`;
      });
      await client.query(
        `INSERT INTO produto_imagens (produto_id, imagem, eh_capa) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    // Atualiza agregados (remove antigos e insere novos)
    await client.query("DELETE FROM produto_agregados WHERE produto_id = $1", [id]);
    if (agregados && agregados.length > 0) {
      const vals = [];
      const placeholders = agregados.map((agg, i) => {
        const b = i * 3;
        vals.push(id, agg.id, agg.preco);
        return `($${b+1}, $${b+2}, $${b+3})`;
      });
      await client.query(
        `INSERT INTO produto_agregados (produto_id, agregado_id, preco) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    await client.query("DELETE FROM produto_brindes WHERE produto_id = $1", [id]);
    if (brindes && brindes.length > 0) {
      const vals = [];
      const placeholders = brindes.map((b, i) => {
        const base = i * 3;
        vals.push(id, b.id, b.tipo_quantidade || 'unidade');
        return `($${base+1}, $${base+2}, $${base+3})`;
      });
      await client.query(
        `INSERT INTO produto_brindes (produto_id, brinde_produto_id, tipo_quantidade) VALUES ${placeholders.join(', ')}`,
        vals
      );
    }

    await client.query("COMMIT");
    invalidateProductsCache();
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
router.patch("/:id/destaque", authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { eh_destaque } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("UPDATE produtos SET eh_destaque = $1 WHERE id = $2", [eh_destaque, id]);

    await client.query("COMMIT");
    invalidateProductsCache();
    res.json({ message: "Destaque atualizado!" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Erro ao atualizar destaque" });
  } finally {
    client.release();
  }
});

// ALTERAR STATUS ATIVO/INATIVO (PATCH)
router.patch("/:id/ativo", authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Garante conversão segura para booleano
    const ativoStatus = ativo === true || ativo === 'true' || ativo === 1;

    await client.query("UPDATE produtos SET ativo = $1 WHERE id = $2", [ativoStatus, id]);

    await client.query("COMMIT");
    invalidateProductsCache();
    res.json({ message: "Status do produto atualizado!" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Erro ao atualizar status do produto" });
  } finally {
    client.release();
  }
});

// APLICAR / REMOVER DESCONTO EM LOTE
// Não altera eh_destaque — desconto é independente do status de destaque
router.patch("/bulk-desconto", authenticateToken, requireRole('admin'), async (req, res) => {
  const { ids, desconto, ativo } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Informe ao menos um produto." });
  }
  const descontoNum = Number(desconto) || 0;
  const aplicando = ativo === true;

  try {
    if (aplicando) {
      // Aplica apenas o desconto, sem mexer em eh_destaque
      await pool.query(
        `UPDATE produtos SET desconto_destaque = $1 WHERE id = ANY($2::int[])`,
        [descontoNum, ids]
      );
    } else {
      // Remove desconto E desfaz destaque que possa ter sido aplicado incorretamente por versões anteriores
      await pool.query(
        `UPDATE produtos SET desconto_destaque = 0, eh_destaque = false WHERE id = ANY($1::int[])`,
        [ids]
      );
    }
    invalidateProductsCache();
    res.json({ message: `Desconto ${aplicando ? `de ${descontoNum}%` : "removido"} em ${ids.length} produto(s).` });
  } catch (error) {
    console.error("Erro bulk-desconto:", error);
    res.status(500).json({ error: "Erro ao atualizar descontos." });
  }
});

// DELETAR PRODUTO
router.delete("/:id", authenticateToken, requireRole('admin'), async (req, res) => {
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
    invalidateProductsCache();
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