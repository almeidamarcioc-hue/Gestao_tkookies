import { Router } from "express";
import { pool } from "../db/index.js";
import { checkUsb, printUsb } from "../utils/printer.js"; // Importa as funções do utilitário


const router = Router();

// LISTAR
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nome as cliente_nome 
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
});

// OBTER VALOR DO FRETE (Configuração)
router.get("/config/frete", async (req, res) => {
  try {
    const result = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'valor_frete'");
    const valor = result.rows.length > 0 ? Number(result.rows[0].valor) : 0;
    res.json({ valor });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar valor do frete" });
  }
});

// OBTER UM PEDIDO (para edição)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pedidoRes = await pool.query(`
      SELECT p.*, c.nome as cliente_nome, c.telefone, c.endereco, c.numero, c.bairro, c.cidade
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (pedidoRes.rows.length === 0) return res.status(404).json({ error: "Pedido não encontrado" });

    const itensRes = await pool.query(`
      SELECT ip.*, p.nome as produto_nome,
      (SELECT imagem FROM produto_imagens pi WHERE pi.produto_id = p.id ORDER BY pi.eh_capa DESC LIMIT 1) as imagem
      FROM itens_pedido ip
      LEFT JOIN produtos p ON ip.produto_id = p.id
      WHERE ip.pedido_id = $1
    `, [id]);

    res.json({ ...pedidoRes.rows[0], itens: itensRes.rows });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { cliente_id, data_pedido, forma_pagamento, observacao, frete, itens, status } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    let valorTotalItens = 0;
    itens.forEach(i => valorTotalItens += (Number(i.quantidade) * Number(i.valor_unitario)));
    const valorTotalPedido = valorTotalItens + Number(frete || 0);

    const resPedido = await client.query(
      `INSERT INTO pedidos (cliente_id, data_pedido, forma_pagamento, observacao, frete, valor_total, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [cliente_id, data_pedido, forma_pagamento, observacao, frete || 0, valorTotalPedido, status || 'Novo']
    );
    const pedidoId = resPedido.rows[0].id;

    for (const item of itens) {
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, item.produto_id, item.quantidade, item.valor_unitario, (item.quantidade * item.valor_unitario)]
      );

      // Baixar estoque do produto
      await client.query(
        "UPDATE produtos SET estoque = estoque - $1 WHERE id = $2",
        [item.quantidade, item.produto_id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Pedido criado!", id: pedidoId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao criar pedido" });
  } finally {
    client.release();
  }
});

// ATUALIZAR (Edição completa)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { cliente_id, data_pedido, forma_pagamento, observacao, frete, itens, status } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar se o pedido já está cancelado
    const checkStatus = await client.query("SELECT status FROM pedidos WHERE id = $1", [id]);
    if (checkStatus.rows.length > 0 && checkStatus.rows[0].status === 'Cancelado') {
      throw new Error("Não é possível alterar um pedido cancelado.");
    }

    let valorTotalItens = 0;
    itens.forEach(i => valorTotalItens += (Number(i.quantidade) * Number(i.valor_unitario)));
    const valorTotalPedido = valorTotalItens + Number(frete || 0);

    await client.query(
      `UPDATE pedidos SET cliente_id = $1, data_pedido = $2, forma_pagamento = $3, observacao = $4, frete = $5, valor_total = $6, status = $7
       WHERE id = $8`,
      [cliente_id, data_pedido, forma_pagamento, observacao, frete || 0, valorTotalPedido, status, id]
    );

    // Devolver estoque dos itens antigos antes de remover
    const itensAntigos = await client.query("SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1", [id]);
    for (const item of itensAntigos.rows) {
      await client.query(
        "UPDATE produtos SET estoque = estoque + $1 WHERE id = $2",
        [item.quantidade, item.produto_id]
      );
    }

    await client.query("DELETE FROM itens_pedido WHERE pedido_id = $1", [id]);

    for (const item of itens) {
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, item.produto_id, item.quantidade, item.valor_unitario, (item.quantidade * item.valor_unitario)]
      );

      // Baixar estoque dos novos itens
      await client.query(
        "UPDATE produtos SET estoque = estoque - $1 WHERE id = $2",
        [item.quantidade, item.produto_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Pedido atualizado!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(400).json({ error: error.message || "Erro ao atualizar pedido" });
  } finally {
    client.release();
  }
});

// DIAGNÓSTICO USB (Verifica se acha impressoras)
router.get("/usb-check", async (req, res) => {
  try {
    const count = await checkUsb();
    res.json({ ok: true, count });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Erro ao verificar USB." });
  }
});

// ATUALIZAR STATUS
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pedido = await client.query("SELECT status FROM pedidos WHERE id = $1", [id]);
    
    // Verificar se já está cancelado (impede reabertura ou qualquer mudança)
    if (pedido.rows.length > 0 && pedido.rows[0].status === 'Cancelado') {
       throw new Error("Este pedido está cancelado e não pode ser alterado.");
    }

    // Se for cancelar, devolver estoque
    if (status === 'Cancelado') {
      if (pedido.rows.length > 0 && pedido.rows[0].status !== 'Cancelado') {
        const itens = await client.query("SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1", [id]);
        for (const item of itens.rows) {
          await client.query(
            "UPDATE produtos SET estoque = estoque + $1 WHERE id = $2",
            [item.quantidade, item.produto_id]
          );
        }
      }
    }

    await client.query("UPDATE pedidos SET status = $1 WHERE id = $2", [status, id]);
    await client.query("COMMIT");
    res.json({ message: "Status atualizado!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(400).json({ error: error.message || "Erro ao atualizar status" });
  } finally {
    client.release();
  }
});

// DELETAR PEDIDO (Devolve estoque e remove)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificar status para saber se precisa devolver estoque
    const pedidoRes = await client.query("SELECT status FROM pedidos WHERE id = $1", [id]);
    if (pedidoRes.rows.length > 0 && pedidoRes.rows[0].status !== 'Cancelado') {
        const itens = await client.query("SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1", [id]);
        for (const item of itens.rows) {
            await client.query("UPDATE produtos SET estoque = estoque + $1 WHERE id = $2", [item.quantidade, item.produto_id]);
        }
    }

    await client.query("DELETE FROM itens_pedido WHERE pedido_id = $1", [id]);
    await client.query("DELETE FROM pedidos WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({ message: "Pedido removido com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao remover pedido" });
  } finally {
    client.release();
  }
});

// IMPRIMIR (USB Direto)
router.post("/:id/imprimir", async (req, res) => {
  const { id } = req.params;
  
  try {
    // Buscar dados do pedido
    const pedidoRes = await pool.query(`
      SELECT p.*, c.nome as cliente_nome
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (pedidoRes.rows.length === 0) return res.status(404).json({ error: "Pedido não encontrado" });
    const pedido = pedidoRes.rows[0];
    const itensRes = await pool.query(`
      SELECT ip.*, p.nome as produto_nome
      FROM itens_pedido ip
      LEFT JOIN produtos p ON ip.produto_id = p.id
      WHERE ip.pedido_id = $1
    `, [id]);
    const itens = itensRes.rows;
    
    // Usa a função printUsb do utilitário
    await printUsb(printer => {
      printer
        .font('b')
        .align('ct')
        .style('b')
        .size(1, 1)
        .text('TKokies')
        .style('normal')
        .size(1, 1)
        .text(`Pedido #${pedido.id}`)
        .text('--------------------------------')
        .align('lt')
        .style('b').print('Data: ').style('normal').text(`${new Date(pedido.data_pedido).toLocaleDateString()}`)
        .text(' ') 
        .style('b').print('Cliente: ').style('normal').text(`${pedido.cliente_nome}`)
        .text('--------------------------------');

      printer.size(1, 1)
       .font('b')
       .align('lt')
       .text('Prod.     Qtd.   V.Unit   Total'); 
      printer.text('--------------------------------');

      itens.forEach(item => {
          printer.style('b').text(item.produto_nome.toUpperCase()).style('normal');
          printer.feed(0);
          const qtd = Number(item.quantidade).toFixed(2);
          const unit = Number(item.valor_unitario).toFixed(2);
          const total = Number(item.valor_total).toFixed(2);
          printer.text(`          ${qtd}  R$${unit}  R$${total}`);
          printer.text(' ');
      });

      printer.font('a');
      printer.text('------------------------');
      printer.align('rt');
      if (Number(pedido.frete) > 0) printer.text(`Frete: R$ ${Number(pedido.frete).toFixed(2)}`);
      printer.style('b').size(1, 1).text(`TOTAL: R$ ${Number(pedido.valor_total).toFixed(2)}`);
      printer.align('ct').text('').text('TKookies');
      printer.align('ct').text('').text('');
    });
    res.json({ message: "Enviado para impressora" });
  } catch (error) {
    console.error("Erro geral na rota de impressão:", error);
    res.status(500).json({ error: error.message || "Erro ao processar impressão." });
  }
});

export default router;