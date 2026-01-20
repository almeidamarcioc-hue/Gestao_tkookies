import { Router } from "express";
import { pool } from "../db/index.js";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { EventEmitter } from "events";

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
    // Tenta importar a lib USB diretamente para listar dispositivos
    const usb = await import('usb');
    
    // Compatibilidade entre versões diferentes da lib 'usb'
    const getDeviceList = usb.getDeviceList || (usb.default && usb.default.getDeviceList);
    
    if (!getDeviceList) {
      return res.status(500).json({ ok: false, error: "Driver USB não carregou corretamente." });
    }

    const list = getDeviceList();
    
    // Filtra dispositivos que se identificam como Impressora (Classe 7)
    const printers = list.filter(d => {
      try {
        return d.configDescriptor?.interfaces?.some(iface => 
          iface.some(conf => conf.bInterfaceClass === 7)
        );
      } catch { return false; }
    }).map(d => ({
      vid: '0x' + d.deviceDescriptor.idVendor.toString(16).toUpperCase(),
      pid: '0x' + d.deviceDescriptor.idProduct.toString(16).toUpperCase()
    }));

    res.json({ ok: true, printers, count: printers.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
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

// Adapter para Impressora do Sistema (Mac/Linux via lp)
class SystemAdapter extends EventEmitter {
  constructor() {
    super();
    this.buffer = [];
  }
  open(callback) {
    console.log("SystemAdapter: Abrindo conexão...");
    if (callback) callback();
  }
  write(data, callback) {
    // console.log("SystemAdapter: Escrevendo dados...", data.length, "bytes");
    this.buffer.push(data);
    if (callback) callback();
  }
  close(callback) {
    const buffer = Buffer.concat(this.buffer);
    const tempPath = path.join(os.tmpdir(), `print-${Date.now()}.bin`);
    
    try {
      fs.writeFileSync(tempPath, buffer);
      // Envia para a impressora padrão do sistema usando o comando 'lp'
      // '-o raw' envia os comandos ESC/POS diretamente sem processamento do driver
      console.log(`Enviando arquivo ${tempPath} para impressora do sistema (lp)...`);
      exec(`lp -o raw "${tempPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error("Erro lp:", error);
          console.error("Stderr:", stderr);
        } else {
          console.log("Impressão enviada com sucesso:", stdout);
        }
        try { fs.unlinkSync(tempPath); } catch(e){}
        if (callback) callback();
      });
    } catch (e) {
      console.error("Erro ao gravar arquivo de impressão:", e);
      if (callback) callback();
    }
  }
}

// IMPRIMIR (USB Direto)
router.post("/:id/imprimir", async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Carregar bibliotecas dinamicamente (para não quebrar se não estiverem instaladas)
    // Nota: É necessário instalar: npm install escpos escpos-usb
    let escpos;
    try {
      escpos = await import('escpos');
    } catch (e) {
      return res.status(500).json({ error: "Módulo de impressão não instalado no servidor." });
    }
    
    // 2. Buscar dados do pedido
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

    // 3. Imprimir
    let device;
    let usingSystem = false;

    // No MacOS, o acesso direto USB é bloqueado pelo driver do sistema.
    // Se a impressora já está instalada no Mac, devemos usar o SystemAdapter (lp).
    if (os.platform() === 'darwin') {
        console.log("MacOS detectado. Usando adaptador de sistema (lp).");
        device = new SystemAdapter();
        usingSystem = true;
    } else {
        try {
            // Tenta carregar driver USB (apenas se não for Mac ou se quiser forçar)
            const { default: USB } = await import('escpos-usb');
            escpos.default.USB = USB;
            device = new escpos.default.USB(); 
        } catch (e) {
            console.log("USB direto indisponível (" + e.message + "). Usando adaptador de sistema.");
            device = new SystemAdapter();
            usingSystem = true;
        }
    }

    const printer = new escpos.default.Printer(device);

    device.open(function(error){
      // Se falhar ao abrir USB (ex: ocupado pelo sistema), faz fallback para SystemAdapter
      if (error && !usingSystem) {
        console.log("Falha ao abrir USB (Ocupado?). Tentando driver do sistema...");
        device = new SystemAdapter();
        const printerSys = new escpos.default.Printer(device);
        device.open(() => printContent(printerSys));
        return;
      }

      if (error) {
        console.error("Erro ao abrir impressora:", error);
        return res.status(500).json({ error: "Erro na impressora: " + error });
      }

      printContent(printer);
    });

    function printContent(p) {
    try {
      p
        .font('b')
        .align('ct')
        .style('b')
        .size(1, 1)
        .text('TKokies')
        .style('normal')
        .size(1, 1) // Retornando ao tamanho padrão para o corpo do texto
        .text(`Pedido #${pedido.id}`)
        .text('--------------------------------')
        .align('lt')
        // Data com "Data:" em negrito
        .style('b').print('Data: ').style('normal').text(`${new Date(pedido.data_pedido).toLocaleDateString()}`)
        // Espaço entre Data e Cliente
        .text(' ') 
        // Cliente com "Cliente:" em negrito
        .style('b').print('Cliente: ').style('normal').text(`${pedido.cliente_nome}`)
        
        .text('--------------------------------');
         // itens.forEach(item => {
         //   p.text(item.produto_nome);
         //   p.text(`${Number(item.quantidade).toFixed(2)} x R$ ${Number(item.valor_unitario).toFixed(2)} = R$ ${Number(item.valor_total).toFixed(2)}`);
          //  p.text('');
         // });

         // --- Início do Cabeçalho de Itens ---
p.size(1, 1) // Garante que a fonte esteja no tamanho padrão/mínimo
 .font('b')  // Fonte 'b' é mais estreita, ideal para colunas
 .align('lt')
 .text('Prod.     Qtd.   V.Unit   Total'); 
p.text('--------------------------------'); // Linha separadora

// --- Loop dos Itens ---
itens.forEach(item => {
    // Nome do produto (pode ocupar uma linha inteira se for longo)
    p.style('b').text(item.produto_nome.toUpperCase()).style('normal');
    p.feed(0);

    // Valores formatados em uma linha logo abaixo do nome
    const qtd = Number(item.quantidade).toFixed(2);
    const unit = Number(item.valor_unitario).toFixed(2);
    const total = Number(item.valor_total).toFixed(2);

    // Exemplo de linha de detalhes: "2.00 x 10.00 = 20.00"
    p.text(`          ${qtd}  R$${unit}  R$${total}`);
    p.text(' '); // Espaço entre itens
});

p.font('a'); // Retorna para a fonte padrão se desejar

          p.text('------------------------');
          p.align('rt');
          if (Number(pedido.frete) > 0) p.text(`Frete: R$ ${Number(pedido.frete).toFixed(2)}`);
          p.style('b').size(1, 1).text(`TOTAL: R$ ${Number(pedido.valor_total).toFixed(2)}`);
          
          p.align('ct').text('').text('TKookies');
          p.align('ct').text('').text('');
          
          p.cut().close();

          res.json({ message: "Enviado para impressora" });
      } catch (printError) {
          console.error("Erro durante a geração do comando de impressão:", printError);
          res.status(500).json({ error: "Erro ao gerar impressão" });
      }
    }

  } catch (error) {
    console.error("Erro geral na rota de impressão:", error);
    res.status(500).json({ error: "Erro ao processar impressão." });
  }
});

export default router;