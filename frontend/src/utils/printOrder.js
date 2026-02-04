export const printOrder = (order) => {
  // Cria uma nova janela para impressão
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    alert("Por favor, permita popups para imprimir.");
    return;
  }

  // Formata os itens
  const itensHtml = (order.itens || []).map(item => `
    <div class="item">
      <span class="qty">${Number(item.quantidade)}x</span>
      <span class="name">${item.nome || item.produto_nome || 'Produto'}</span>
      <span class="price">R$ ${Number(item.valor_total).toFixed(2)}</span>
    </div>
  `).join('');

  // Calcula subtotal se não vier pronto
  const total = Number(order.valor_total) || 0;
  const frete = Number(order.frete) || 0;
  const subtotal = total - frete;

  // Conteúdo HTML com CSS otimizado para impressoras térmicas (Alto Contraste)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pedido #${order.id}</title>
      <style>
        @page {
          margin: 0;
          size: auto; /* Ajusta ao tamanho do papel da impressora */
        }
        body {
          font-family: 'Courier New', Courier, monospace; /* Fonte monoespaçada é melhor para térmicas */
          margin: 0;
          padding: 5px;
          width: 100%;
          max-width: 80mm; /* Largura padrão */
          color: #000;
          background: #fff;
        }
        /* Força preto puro e negrito para evitar impressão "apagada" */
        * {
          box-sizing: border-box;
          color: #000 !important;
          font-weight: 900 !important; 
        }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
        .brand { font-size: 20px; text-transform: uppercase; display: block; font-weight: 900 !important; }
        .meta { font-size: 12px; margin-top: 5px; }
        .section { margin-bottom: 10px; font-size: 12px; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
        .qty { width: 25px; }
        .name { flex: 1; padding-right: 5px; }
        .price { white-space: nowrap; }
        .totals { text-align: right; font-size: 12px; margin-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .final-total { font-size: 18px; font-weight: 900 !important; margin-top: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <span class="brand">TKookies</span>
        <div class="meta">Pedido #${order.id}</div>
        <div class="meta">${new Date(order.data_pedido).toLocaleString('pt-BR')}</div>
      </div>

      <div class="section">
        <div>Cliente: ${order.cliente_nome || order.cliente?.nome || 'Consumidor'}</div>
        <div>Tel: ${order.telefone || order.cliente?.telefone || '-'}</div>
        ${frete > 0 ? `<div>End: ${order.endereco}, ${order.numero} - ${order.bairro}</div>` : '<div>Retirada</div>'}
      </div>

      <div class="divider"></div>

      <div class="items">
        ${itensHtml}
      </div>

      <div class="divider"></div>

      <div class="totals">
        <div class="total-row"><span>Subtotal:</span><span>R$ ${subtotal.toFixed(2)}</span></div>
        ${frete > 0 ? `<div class="total-row"><span>Frete:</span><span>R$ ${frete.toFixed(2)}</span></div>` : ''}
        <div class="total-row final-total"><span>TOTAL:</span><span>R$ ${total.toFixed(2)}</span></div>
      </div>

      <div class="divider"></div>

      <div class="section">
        <div>Pagamento: ${order.forma_pagamento}</div>
        ${order.observacao ? `<div>Obs: ${order.observacao}</div>` : ''}
      </div>

      <div class="footer">Jeová Jireh</div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};