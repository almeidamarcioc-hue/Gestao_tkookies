import { Router } from "express";
import { pool } from "../db/index.js";
import { printUsb, checkUsb } from "../utils/printer.js";
import { requireRole } from "../middlewares/auth.js";

const router = Router();

// CONTAGEM PÚBLICA DE PEDIDOS REALIZADOS
router.get("/count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) AS total FROM pedidos");
    res.json({ total: Number(result.rows[0].total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LISTAR PEDIDOS (apenas admin)
router.get("/", requireRole('admin'), async (req, res) => {
  try {
    const { ativos, page, limit } = req.query;
    const params = [];
    let whereClause = '';

    if (ativos === 'true') {
      whereClause = "WHERE p.status NOT IN ('Finalizado', 'Cancelado')";
    }

    let paginationClause = '';
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;
      params.push(limitNum, offset);
      paginationClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const query = `
      SELECT p.*,
             COALESCE(c.nome, r.razao_social, 'Cliente Balcão') as cliente_nome,
             COALESCE(c.telefone, r.telefone) as cliente_telefone
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id AND (p.tipo_cliente IS NULL OR p.tipo_cliente = 'consumidor')
      LEFT JOIN revendedores r ON p.revendedor_id = r.id
      ${whereClause}
      ORDER BY p.data_pedido DESC, p.id DESC
      ${paginationClause}
    `;
    const result = await pool.query(query, params);
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
    // Busca primeiro para validar propriedade
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
      LEFT JOIN revendedores r ON p.revendedor_id = r.id
      WHERE p.id = $1
    `;
    const headerRes = await pool.query(queryHeader, [id]);
    
    if (headerRes.rows.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const pedido = headerRes.rows[0];

    // Clientes só podem ver seus próprios pedidos
    if (req.user.role !== 'admin' && pedido.cliente_id !== req.user.id) {
      return res.status(403).json({ error: "Permissão negada" });
    }

    // Buscar Itens (produtos e combos)
    const queryItens = `
      SELECT pi.*,
             COALESCE(p.nome, c.nome) as produto_nome,
             p.preco_revenda, p.eh_destaque, p.desconto_destaque,
             CASE WHEN pi.tipo = 'combo' THEN NULL
                  ELSE (SELECT imagem FROM produto_imagens WHERE produto_id = p.id ORDER BY eh_capa DESC LIMIT 1)
             END as imagem,
             COALESCE(p.estoque, c.estoque) as estoque
      FROM itens_pedido pi
      LEFT JOIN produtos p ON pi.produto_id = p.id AND pi.tipo != 'combo'
      LEFT JOIN combos c ON pi.combo_id = c.id AND pi.tipo = 'combo'
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
  const { cliente_id, data_pedido, forma_pagamento, observacao, frete, desconto, status, tipo_cliente, itens, origem, cupom_codigo, desconto_fidelidade, desconto_cupom, data_entrega_prevista, revendedor_id } = req.body;

  // Detalhamento do desconto. Se o cliente novo enviar o breakdown, usa-o; senão
  // infere pelo cupom_codigo (compatibilidade com pedidos/clientes antigos).
  const hasBreakdown = desconto_fidelidade != null || desconto_cupom != null;
  const dFidelidade = hasBreakdown
    ? Number(desconto_fidelidade || 0)
    : (cupom_codigo ? 0 : Number(desconto || 0));
  const dCupom = hasBreakdown
    ? Number(desconto_cupom || 0)
    : (cupom_codigo ? Number(desconto || 0) : 0);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Calcular total
    const totalItens = itens.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario)), 0);
    const valor_total = totalItens + Number(frete || 0) - Number(desconto || 0);

    const resPedido = await client.query(
      `INSERT INTO pedidos
       (cliente_id, data_pedido, forma_pagamento, observacao, frete, desconto, valor_total, status, tipo_cliente, cupom_codigo, desconto_fidelidade, desconto_cupom, data_entrega_prevista, revendedor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [cliente_id || null, data_pedido, forma_pagamento, observacao, frete || 0, desconto || 0, valor_total, status || 'Novo', tipo_cliente || 'consumidor', cupom_codigo || null, dFidelidade, dCupom, data_entrega_prevista || null, revendedor_id || null]
    );
    const pedidoId = resPedido.rows[0].id;

    const comboItens = itens.filter(i => i.tipo === 'combo');
    const produtoItens = itens.filter(i => i.tipo !== 'combo');

    if (comboItens.length > 0) {
      const vals = [];
      const ph = comboItens.map((item, i) => {
        const b = i * 5;
        vals.push(pedidoId, item.produto_id, item.quantidade, item.valor_unitario, Number(item.quantidade) * Number(item.valor_unitario));
        return `($${b+1}, NULL, $${b+2}, 'combo', $${b+3}, $${b+4}, $${b+5})`;
      });
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, combo_id, tipo, quantidade, valor_unitario, valor_total) VALUES ${ph.join(', ')}`,
        vals
      );
    }

    if (produtoItens.length > 0) {
      const vals = [];
      const ph = produtoItens.map((item, i) => {
        const b = i * 5;
        vals.push(pedidoId, item.produto_id, item.quantidade, item.valor_unitario, Number(item.quantidade) * Number(item.valor_unitario));
        return `($${b+1}, $${b+2}, 'produto', $${b+3}, $${b+4}, $${b+5})`;
      });
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, tipo, quantidade, valor_unitario, valor_total) VALUES ${ph.join(', ')}`,
        vals
      );

      // Baixar estoque apenas dos itens que não vieram do carrinho
      const stockItems = produtoItens.filter(item => (item.origem || origem) !== 'carrinho');
      if (stockItems.length > 0) {
        const caseClause = stockItems.map((_, i) => `WHEN $${i*2+1} THEN estoque - $${i*2+2}`).join(' ');
        const ids = stockItems.map((_, i) => `$${i*2+1}`).join(', ');
        const vals = stockItems.flatMap(item => [item.produto_id, item.quantidade]);
        await client.query(
          `UPDATE produtos SET estoque = CASE id ${caseClause} END WHERE id IN (${ids})`,
          vals
        );
      }
    }

    await client.query("COMMIT");

    // Incrementar uso do cupom (não bloqueia o pedido se falhar)
    if (cupom_codigo) {
      pool.query("UPDATE cupons SET usos_realizados = usos_realizados + 1 WHERE codigo = UPPER($1)", [cupom_codigo])
        .catch(e => console.error("Erro ao incrementar uso do cupom:", e.message));
    }

    // Pontos de fidelidade (não bloqueia o pedido se falhar)
    if (cliente_id) {
      try {
        const cfgRes = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'pontos_por_real'");
        const pontosPorReal = cfgRes.rows[0] ? Number(cfgRes.rows[0].valor) : 1;

        // Débito: subtrair APENAS os pontos efetivamente usados como desconto de fidelidade
        // (100 pontos = R$1). Desconto de cupom NÃO consome pontos do cliente.
        if (dFidelidade > 0) {
          const pontosUsados = Math.round(dFidelidade * 100);
          await pool.query(
            "INSERT INTO pontos_fidelidade (cliente_id, pedido_id, pontos, tipo, descricao) VALUES ($1, $2, $3, 'debito', $4)",
            [cliente_id, pedidoId, pontosUsados, `Pontos usados no Pedido #${pedidoId}`]
          );
        }

        // Crédito: pontuar sobre o valor efetivamente pago (já com desconto aplicado)
        const pontos = Math.floor(valor_total * pontosPorReal);
        if (pontos > 0) {
          await pool.query(
            "INSERT INTO pontos_fidelidade (cliente_id, pedido_id, pontos, tipo, descricao) VALUES ($1, $2, $3, 'credito', $4)",
            [cliente_id, pedidoId, pontos, `Pedido #${pedidoId}`]
          );
        }
      } catch (e) {
        console.error("Erro ao processar pontos de fidelidade (não bloqueante):", e.message);
      }
    }

    res.status(201).json({ id: pedidoId, message: "Pedido criado com sucesso" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao criar pedido" });
  } finally {
    client.release();
  }
});

// ATUALIZAR PEDIDO (apenas admin)
router.put("/:id", requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { cliente_id, data_pedido, forma_pagamento, observacao, frete, desconto, status, tipo_cliente, itens, revendedor_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Restaurar estoque dos itens antigos (apenas produtos, não combos)
    const oldItens = await client.query("SELECT produto_id, combo_id, tipo, quantidade FROM itens_pedido WHERE pedido_id = $1", [id]);
    const oldProdutos = oldItens.rows.filter(i => i.tipo !== 'combo');
    const oldCombos = oldItens.rows.filter(i => i.tipo === 'combo');

    if (oldProdutos.length > 0) {
      const caseClause = oldProdutos.map((_, i) => `WHEN $${i*2+1} THEN estoque + $${i*2+2}`).join(' ');
      const ids = oldProdutos.map((_, i) => `$${i*2+1}`).join(', ');
      const vals = oldProdutos.flatMap(item => [item.produto_id, item.quantidade]);
      await client.query(
        `UPDATE produtos SET estoque = CASE id ${caseClause} END WHERE id IN (${ids})`,
        vals
      );
    }
    if (oldCombos.length > 0) {
      const caseClause = oldCombos.map((_, i) => `WHEN $${i*2+1} THEN estoque + $${i*2+2}`).join(' ');
      const ids = oldCombos.map((_, i) => `$${i*2+1}`).join(', ');
      const vals = oldCombos.flatMap(item => [item.combo_id, item.quantidade]);
      await client.query(
        `UPDATE combos SET estoque = CASE id ${caseClause} END WHERE id IN (${ids})`,
        vals
      );
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
       frete = $5, desconto = $6, valor_total = $7, status = $8, tipo_cliente = $9, revendedor_id = $11
       WHERE id = $10`,
      [cliente_id || null, data_pedido, forma_pagamento, observacao, frete || 0, desconto || 0, valor_total, status, tipo_cliente, id, revendedor_id || null]
    );

    // 5. Inserir novos itens e baixar estoque
    const novosCombos = itens.filter(i => i.tipo === 'combo');
    const novosProdutos = itens.filter(i => i.tipo !== 'combo');

    if (novosCombos.length > 0) {
      const vals = [];
      const ph = novosCombos.map((item, i) => {
        const b = i * 5;
        vals.push(id, item.produto_id, item.quantidade, item.valor_unitario, Number(item.quantidade) * Number(item.valor_unitario));
        return `($${b+1}, NULL, $${b+2}, 'combo', $${b+3}, $${b+4}, $${b+5})`;
      });
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, combo_id, tipo, quantidade, valor_unitario, valor_total) VALUES ${ph.join(', ')}`,
        vals
      );
      const caseClause = novosCombos.map((_, i) => `WHEN $${i*2+1} THEN estoque - $${i*2+2}`).join(' ');
      const ids = novosCombos.map((_, i) => `$${i*2+1}`).join(', ');
      const stockVals = novosCombos.flatMap(item => [item.produto_id, item.quantidade]);
      await client.query(`UPDATE combos SET estoque = CASE id ${caseClause} END WHERE id IN (${ids})`, stockVals);
    }

    if (novosProdutos.length > 0) {
      const vals = [];
      const ph = novosProdutos.map((item, i) => {
        const b = i * 5;
        vals.push(id, item.produto_id, item.quantidade, item.valor_unitario, Number(item.quantidade) * Number(item.valor_unitario));
        return `($${b+1}, $${b+2}, 'produto', $${b+3}, $${b+4}, $${b+5})`;
      });
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, tipo, quantidade, valor_unitario, valor_total) VALUES ${ph.join(', ')}`,
        vals
      );
      const caseClause = novosProdutos.map((_, i) => `WHEN $${i*2+1} THEN estoque - $${i*2+2}`).join(' ');
      const ids = novosProdutos.map((_, i) => `$${i*2+1}`).join(', ');
      const stockVals = novosProdutos.flatMap(item => [item.produto_id, item.quantidade]);
      await client.query(`UPDATE produtos SET estoque = CASE id ${caseClause} END WHERE id IN (${ids})`, stockVals);
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

// ATUALIZAR STATUS (apenas admin)
router.patch("/:id/status", requireRole('admin'), async (req, res) => {
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