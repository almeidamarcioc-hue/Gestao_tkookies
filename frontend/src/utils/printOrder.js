export function printOrder(pedido) {
  const janela = window.open('', '', 'width=800,height=600');
  
  // Normalização dos dados (pois podem vir do Form ou da API)
  const clienteNome = pedido.cliente_nome || (pedido.cliente ? pedido.cliente.nome : 'Consumidor');
  const clienteTel = pedido.telefone || (pedido.cliente ? pedido.cliente.telefone : '');
  const clienteEnd = pedido.endereco ? `${pedido.endereco}, ${pedido.numero} - ${pedido.bairro}` : (pedido.cliente ? `${pedido.cliente.endereco}, ${pedido.cliente.numero} - ${pedido.cliente.bairro}` : '');
  const clienteCidade = pedido.cidade || (pedido.cliente ? pedido.cliente.cidade : '');

  const itensHtml = pedido.itens.map(item => `
    <div style="margin-bottom: 5px; border-bottom: 1px dashed #eee; padding-bottom: 2px;">
      <div style="font-weight: bold;">${item.nome || item.produto_nome}</div>
      <div style="display: flex; justify-content: space-between;">
        <span>${Number(item.quantidade).toFixed(2)} x R$ ${Number(item.valor_unitario).toFixed(2)}</span>
        <span>R$ ${(Number(item.quantidade) * Number(item.valor_unitario)).toFixed(2)}</span>
      </div>
    </div>
  `).join('');

  const subtotal = pedido.itens.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario)), 0);
  const total = Number(pedido.valor_total || (subtotal + Number(pedido.frete || 0)));

  const html = `
    <html>
      <head>
        <title>Pedido #${pedido.id || 'NOVO'}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 72mm; 
            margin: 0; 
            padding: 5px; 
            font-size: 12px;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 10px; }
          .title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .info { margin-bottom: 5px; font-size: 11px; }
          .flex-between { display: flex; justify-content: space-between; }
          .total { font-size: 14px; font-weight: bold; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Gestão Tkookies</div>
          <div>Pedido #${pedido.id || '---'}</div>
        </div>
        
        <div class="info">
          <div><b>Data:</b> ${new Date(pedido.data_pedido).toLocaleDateString()}</div>
          <div><b>Cliente:</b> ${clienteNome}</div>
          ${clienteTel ? `<div><b>Tel:</b> ${clienteTel}</div>` : ''}
          ${clienteEnd ? `<div><b>End:</b> ${clienteEnd}</div>` : ''}
          ${clienteCidade ? `<div><b>Cidade:</b> ${clienteCidade}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          ${itensHtml}
        </div>

        <div class="divider"></div>

        <div class="flex-between">
          <span>Subtotal:</span>
          <span>R$ ${subtotal.toFixed(2)}</span>
        </div>
        <div class="flex-between">
          <span>Frete:</span>
          <span>R$ ${Number(pedido.frete || 0).toFixed(2)}</span>
        </div>
        <div class="flex-between total">
          <span>TOTAL:</span>
          <span>R$ ${total.toFixed(2)}</span>
        </div>

        <div class="divider"></div>
        
        <div class="info">
          <div><b>Pagamento:</b> ${pedido.forma_pagamento}</div>
          ${pedido.observacao ? `<div><b>Obs:</b> ${pedido.observacao}</div>` : ''}
        </div>

        <div class="footer">
          Jeová Jireh
        </div>
      </body>
    </html>
  `;

  janela.document.write(html);
  janela.document.close();
  janela.focus();
  setTimeout(() => {
    janela.print();
    janela.close();
  }, 500);
}