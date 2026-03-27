import { Router } from "express";
import { pool } from "../db/index.js";
import { printUsb, checkUsb } from "../utils/printer.js";

const router = Router();

// LISTAR PEDIDOS
router.get("/", async (req, res) => {
  try {
    // Busca nome do cliente ou razão social do revendedor baseado no tipo_cliente
    const query = `
      SELECT p.*,
             COALESCE(c.nome, r.razao_social, 'Cliente Balcão') as cliente_nome,
             COALESCE(c.telefone, r.telefone) as cliente_telefone
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id AND (p.tipo_cliente IS NULL OR p.tipo_cliente = 'consumidor')
      LEFT JOIN revendedores r ON p.cliente_id = r.id AND p.tipo_cliente = 'revendedor'
      ORDER BY p.id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar pedidos", details: error.message });
  }
});

// OBTER PEDIDO POR ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const queryHeader = `
      SELECT p.*,
             COALESCE(c.nome, r.razao_social, 'Cliente Balcão') as cliente_nome,
             COALESCE(c.telefone, r.telefone) as telefone,
             COALESCE(c.endereco, r.cidade) as endereco,
             COALESCE(c.numero, '') as numero,
             COALESCE(c.bairro, r.estado) as bairro,
             COALESCE(c.cidade, r.cidade) as cidade,
             CASE WHEN p.tipo_cliente = 'revendedor' THEN true ELSE false END as is_revendedor
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id AND (p.tipo_cliente IS NULL OR p.tipo_cliente = 'consumidor')
      LEFT JOIN revendedores r ON p.cliente_id = r.id AND p.tipo_cliente = 'revendedor'
      WHERE p.id = $1
    `;
    const headerRes = await pool.query(queryHeader, [id]);
    
    if (headerRes.rows.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const pedido = headerRes.rows[0];

    // Buscar Itens
    const queryItens = `
      SELECT pi.*, p.nome as produto_nome, p.preco_revenda, p.eh_destaque, p.desconto_destaque,
             (SELECT imagem FROM produto_imagens WHERE produto_id = p.id ORDER BY eh_capa DESC LIMIT 1) as imagem
      FROM itens_pedido pi
      JOIN produtos p ON pi.produto_id = p.id
      WHERE pi.pedido_id = $1
    `;
    const itensRes = await pool.query(queryItens, [id]);
    
    pedido.itens = itensRes.rows;
    res.json(pedido);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar pedido", details: error.message });
  }
});

// CRIAR PEDIDO
router.post("/", async (req, res) => {
  const { cliente_id, data_pedido, forma_pagamento, observacao, frete, desconto, status, tipo_cliente, itens } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Calcular total
    const totalItens = itens.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario)), 0);
    const valor_total = totalItens + Number(frete || 0) - Number(desconto || 0);

    const resPedido = await client.query(
      `INSERT INTO pedidos 
       (cliente_id, data_pedido, forma_pagamento, observacao, frete, desconto, valor_total, status, tipo_cliente) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [cliente_id, data_pedido, forma_pagamento, observacao, frete || 0, desconto || 0, valor_total, status || 'Novo', tipo_cliente || 'consumidor']
    );
    const pedidoId = resPedido.rows[0].id;

    for (const item of itens) {
      await client.query(
        "INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES ($1, $2, $3, $4, $5)",
        [pedidoId, item.produto_id, item.quantidade, item.valor_unitario, Number(item.quantidade) * Number(item.valor_unitario)]
      );
      
      // Baixar estoque do produto
      await client.query("UPDATE produtos SET estoque = estoque - $1 WHERE id = $2", [item.quantidade, item.produto_id]);
    }

    await client.query("COMMIT");
    res.status(201).json({ id: pedidoId, message: "Pedido criado com sucesso" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao criar pedido" });
  } finally {
    client.release();
  }
});

// ATUALIZAR PEDIDO
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { cliente_id, data_pedido, forma_pagamento, observacao, frete, desconto, status, tipo_cliente, itens } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Restaurar estoque dos itens antigos
    const oldItens = await client.query("SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1", [id]);
    for (const item of oldItens.rows) {
      await client.query("UPDATE produtos SET estoque = estoque + $1 WHERE id = $2", [item.quantidade, item.produto_id]);
    }

    // 2. Limpar itens antigos
    await client.query("DELETE FROM itens_pedido WHERE pedido_id = $1", [id]);

    // 3. Recalcular total
    const totalItens = itens.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario)), 0);
    const valor_total = totalItens + Number(frete || 0) - Number(desconto || 0);

    // 4. Atualizar Pedido
    await client.query(
      `UPDATE pedidos SET 
       cliente_id = $1, data_pedido = $2, forma_pagamento = $3, observacao = $4, 
       frete = $5, desconto = $6, valor_total = $7, status = $8, tipo_cliente = $9
       WHERE id = $10`,
      [cliente_id, data_pedido, forma_pagamento, observacao, frete || 0, desconto || 0, valor_total, status, tipo_cliente, id]
    );

    // 5. Inserir novos itens e baixar estoque
    for (const item of itens) {
      await client.query(
        "INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES ($1, $2, $3, $4, $5)",
        [id, item.produto_id, item.quantidade, item.valor_unitario, Number(item.quantidade) * Number(item.valor_unitario)]
      );
      await client.query("UPDATE produtos SET estoque = estoque - $1 WHERE id = $2", [item.quantidade, item.produto_id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Pedido atualizado" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar pedido" });
  } finally {
    client.release();
  }
});

// ATUALIZAR STATUS
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query("UPDATE pedidos SET status = $1 WHERE id = $2", [status, id]);
    res.json({ message: "Status atualizado" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// CONFIG FRETE
router.get("/config/frete", async (req, res) => {
  try {
    const result = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'valor_frete'");
    res.json({ valor: result.rows[0]?.valor || 0 });
  } catch (error) {
    res.json({ valor: 0 });
  }
});

export default router;