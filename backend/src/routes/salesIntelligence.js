import { Router } from "express";
import { pool } from "../db/index.js";
import { requireRole } from "../middlewares/auth.js";
import Groq from "groq-sdk";

const router = Router();

async function coletarDados() {
  const [pedidos, topProdutos, topClientes, clientesSumidos, pedidosPorDia, financeiro, vendasPorProdutoDia] = await Promise.all([
    // Resumo de pedidos dos últimos 30 dias
    pool.query(`
      SELECT
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(valor_total), 0) AS receita_total,
        COALESCE(AVG(valor_total), 0) AS ticket_medio,
        COALESCE(SUM(frete), 0) AS total_frete
      FROM pedidos
      WHERE data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status != 'Cancelado'
    `),

    // Produtos mais vendidos com estoque atual
    pool.query(`
      SELECT
        pr.nome,
        pr.preco_venda,
        pr.custo,
        COALESCE(pr.estoque, 0) AS estoque_atual,
        COALESCE(SUM(ip.quantidade), 0) AS total_vendido,
        COALESCE(SUM(ip.valor_total), 0) AS receita,
        COALESCE(SUM(ip.quantidade) * (pr.preco_venda - COALESCE(pr.custo, 0)), 0) AS lucro_estimado
      FROM produtos pr
      LEFT JOIN itens_pedido ip ON pr.id = ip.produto_id
      LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
        AND ped.data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND ped.status != 'Cancelado'
      WHERE pr.ativo = TRUE
      GROUP BY pr.id, pr.nome, pr.preco_venda, pr.custo, pr.estoque
      ORDER BY total_vendido DESC
      LIMIT 15
    `),

    // Top clientes + revendedores
    pool.query(`
      SELECT
        COALESCE(c.nome, r.razao_social) AS nome,
        COALESCE(c.telefone, r.telefone) AS telefone,
        p.tipo_cliente,
        COUNT(p.id) AS total_pedidos,
        COALESCE(SUM(p.valor_total), 0) AS total_gasto,
        MAX(p.data_pedido) AS ultimo_pedido
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id AND (p.tipo_cliente IS NULL OR p.tipo_cliente = 'consumidor')
      LEFT JOIN revendedores r ON p.cliente_id = r.id AND p.tipo_cliente = 'revendedor'
      WHERE p.data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND p.status != 'Cancelado'
      GROUP BY p.cliente_id, p.tipo_cliente, c.nome, r.razao_social, c.telefone, r.telefone
      ORDER BY total_gasto DESC
      LIMIT 10
    `),

    // Clientes e revendedores que sumiram (sem pedidos nos últimos 15 dias)
    pool.query(`
      SELECT
        COALESCE(c.nome, r.razao_social) AS nome,
        COALESCE(c.telefone, r.telefone) AS telefone,
        p.tipo_cliente,
        MAX(p.data_pedido) AS ultimo_pedido
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id AND (p.tipo_cliente IS NULL OR p.tipo_cliente = 'consumidor')
      LEFT JOIN revendedores r ON p.cliente_id = r.id AND p.tipo_cliente = 'revendedor'
      WHERE p.status != 'Cancelado'
      GROUP BY p.cliente_id, p.tipo_cliente, c.nome, r.razao_social, c.telefone, r.telefone
      HAVING MAX(p.data_pedido) < DATE_SUB(NOW(), INTERVAL 15 DAY)
        AND MAX(p.data_pedido) >= DATE_SUB(NOW(), INTERVAL 60 DAY)
      ORDER BY ultimo_pedido DESC
      LIMIT 10
    `),

    // Pedidos por dia da semana
    pool.query(`
      SELECT
        DAYOFWEEK(data_pedido) AS dia_num,
        DAYNAME(data_pedido) AS dia_nome,
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(valor_total), 0) AS receita
      FROM pedidos
      WHERE data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status != 'Cancelado'
      GROUP BY DAYOFWEEK(data_pedido), DAYNAME(data_pedido)
      ORDER BY dia_num
    `),

    // Resumo financeiro
    pool.query(`
      SELECT
        forma_pagamento,
        COUNT(*) AS qtd,
        COALESCE(SUM(valor_total), 0) AS total
      FROM pedidos
      WHERE data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status != 'Cancelado'
      GROUP BY forma_pagamento
      ORDER BY total DESC
    `),

    // Vendas por produto por dia da semana (últimos 30 dias) — base do Bloco 4
    pool.query(`
      SELECT
        pr.nome,
        DAYOFWEEK(ped.data_pedido) AS dia_num,
        DAYNAME(ped.data_pedido) AS dia_nome,
        COUNT(DISTINCT DATE(ped.data_pedido)) AS semanas_com_venda,
        COALESCE(SUM(ip.quantidade), 0) AS total_vendido_dia
      FROM produtos pr
      JOIN itens_pedido ip ON pr.id = ip.produto_id
      JOIN pedidos ped ON ip.pedido_id = ped.id
      WHERE ped.data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND ped.status != 'Cancelado'
        AND pr.ativo = TRUE
      GROUP BY pr.id, pr.nome, DAYOFWEEK(ped.data_pedido), DAYNAME(ped.data_pedido)
      ORDER BY pr.nome, dia_num
    `),
  ]);

  return {
    resumo: pedidos.rows[0],
    topProdutos: topProdutos.rows,
    topClientes: topClientes.rows,
    clientesSumidos: clientesSumidos.rows,
    pedidosPorDia: pedidosPorDia.rows,
    financeiro: financeiro.rows,
    vendasPorProdutoDia: vendasPorProdutoDia.rows,
    dataAnalise: new Date().toLocaleDateString('pt-BR'),
  };
}

function montarPrompt(dados) {
  const diasPT = { Sunday:'Domingo', Monday:'Segunda', Tuesday:'Terça', Wednesday:'Quarta', Thursday:'Quinta', Friday:'Sexta', Saturday:'Sábado' };

  return `Você é uma inteligência de vendas especializada em negócios de confeitaria artesanal.
Seu tom é direto, acolhedor e motivador — você celebra conquistas reais, mas nunca esconde a verdade.
Você analisa dados com precisão e transforma números em decisões claras.

## CONTEXTO
Você recebe dados de um sistema de gestão de uma empresa de venda de cookies.

---

## SUA ANÁLISE DEVE COBRIR 6 BLOCOS:

### BLOCO 1 — PODER DE COMPRA DOS CLIENTES E REVENDEDORES
Com base nos pedidos dos últimos 30 dias (inclui clientes diretos e revendedores):
- Classifique em 3 grupos: Alto, Médio e Baixo volume de compra
- Destaque os TOP 3 que mais compraram (indique se é CLIENTE ou REVENDEDOR)
- Identifique quem sumiu há mais de 15 dias (indique o tipo e sugira ação de reativação)

### BLOCO 2 — COOKIES MAIS VENDIDOS (ÚLTIMOS 30 DIAS)
- Liste os produtos em ordem de quantidade vendida
- Informe qual representa maior receita
- Destaque qual tem melhor margem se disponível
- Seja celebrativo!

### BLOCO 3 — DIAS DE MAIOR SAÍDA
- Identifique os dias da semana com maior volume de pedidos
- Identifique os dias com menor movimento
- Apresente como um mapa de energia da semana

### BLOCO 4 — ESTIMATIVA DE PRODUÇÃO PARA A PRÓXIMA SEMANA
Considere: Segunda a Sábado.

Use a seção **VENDAS POR PRODUTO POR DIA** para calcular:
- Para cada produto e cada dia da semana: média de unidades vendidas = total_vendido_dia ÷ semanas_com_venda
- Arredonde para cima (ex: 1.3 → 2)
- Se um produto não teve vendas em determinado dia, coloque 0
- Considere o **estoque atual** de cada produto (coluna ESTOQUE nos dados): se o estoque já cobre a demanda prevista, a produção pode ser reduzida

Apresente OBRIGATORIAMENTE em formato de tabela markdown com esta estrutura exata:

| Produto | Estoque Atual | Seg | Ter | Qua | Qui | Sex | Sáb | TOTAL a Produzir |
|---------|--------------|-----|-----|-----|-----|-----|-----|-----------------|
| Nome do produto | X | X | X | X | X | X | X | X |

- IMPORTANTE: cada produto em uma linha separada, nunca em linha única
- TOTAL a Produzir = soma dos dias menos o estoque atual (mínimo 0)
- Após a tabela, adicione uma mensagem de encorajamento curta e um versículo bíblico relacionado ao trabalho, dedicação ou colheita, com referência (ex: Provérbios 14:23)

### BLOCO 5 — INTELIGÊNCIA FINANCEIRA E PROMOÇÕES
**5.1 — Dia ideal para promoção:**
- Sugira o(s) dia(s) com menor movimento para aplicar desconto

**5.2 — Para quem aplicar:**
- Direcione baseado nos perfis de clientes

**5.3 — Percentual de desconto sugerido:**
- Calcule desconto que preserve margem positiva

### BLOCO 6 — PRODUTO QUE DEVE SAIR DA PRODUÇÃO
- Identifique produto(s) com menor saída nos últimos 30 dias
- Compare custo/esforço se disponível
- Sugira: pausar, reformular ou substituir

---

## FORMATO
Sempre use emojis, negrito e estruture assim:

🍪 **INTELIGÊNCIA DE VENDAS — ${dados.dataAnalise}**

> [Uma frase de abertura motivadora]

[BLOCOS 1 a 6]

> [Frase de fechamento encorajadora para a próxima semana]

> 📖 *"[Versículo bíblico relacionado a propósito, bênção ou abundância]"* — **Referência (ex: Filipenses 4:13)**

---

## DADOS DO SISTEMA

**RESUMO GERAL (últimos 30 dias):**
- Total de pedidos: ${dados.resumo.total_pedidos}
- Receita total: R$ ${Number(dados.resumo.receita_total).toFixed(2)}
- Ticket médio: R$ ${Number(dados.resumo.ticket_medio).toFixed(2)}

**PRODUTOS (do mais para o menos vendido):**
${dados.topProdutos.map((p, i) =>
  `${i+1}. ${p.nome} — Vendido: ${p.total_vendido} un | Estoque: ${p.estoque_atual} un | Preço: R$ ${Number(p.preco_venda).toFixed(2)} | Custo: R$ ${Number(p.custo || 0).toFixed(2)}`
).join('\n')}

**VENDAS POR PRODUTO POR DIA (últimos 30 dias — use para calcular médias do Bloco 4):**
${(() => {
  const diasPTLocal = { Sunday:'Dom', Monday:'Seg', Tuesday:'Ter', Wednesday:'Qua', Thursday:'Qui', Friday:'Sex', Saturday:'Sáb' };
  // Agrupa por produto
  const porProduto = {};
  dados.vendasPorProdutoDia.forEach(r => {
    if (!porProduto[r.nome]) porProduto[r.nome] = [];
    porProduto[r.nome].push(`${diasPTLocal[r.dia_nome] || r.dia_nome}: ${r.total_vendido_dia} un em ${r.semanas_com_venda} dias`);
  });
  return Object.entries(porProduto)
    .map(([nome, dias]) => `- ${nome}: ${dias.join(' | ')}`)
    .join('\n') || 'Sem dados de venda por dia.';
})()}

**TOP CLIENTES E REVENDEDORES:**
${dados.topClientes.length ? dados.topClientes.map((c, i) =>
  `${i+1}. ${c.nome} [${c.tipo_cliente === 'revendedor' ? 'REVENDEDOR' : 'CLIENTE'}] — ${c.total_pedidos} pedidos | R$ ${Number(c.total_gasto).toFixed(2)} | Último: ${new Date(c.ultimo_pedido).toLocaleDateString('pt-BR')}`
).join('\n') : 'Nenhum cliente ou revendedor com pedidos no período.'}

**CLIENTES/REVENDEDORES QUE SUMIRAM (sem pedidos há 15+ dias):**
${dados.clientesSumidos.length ? dados.clientesSumidos.map(c =>
  `- ${c.nome} [${c.tipo_cliente === 'revendedor' ? 'REVENDEDOR' : 'CLIENTE'}] (tel: ${c.telefone}) — último pedido: ${new Date(c.ultimo_pedido).toLocaleDateString('pt-BR')}`
).join('\n') : 'Nenhum.'}

**PEDIDOS POR DIA DA SEMANA:**
${dados.pedidosPorDia.map(d =>
  `- ${diasPT[d.dia_nome] || d.dia_nome}: ${d.total_pedidos} pedidos | R$ ${Number(d.receita).toFixed(2)}`
).join('\n')}

**FORMAS DE PAGAMENTO:**
${dados.financeiro.map(f =>
  `- ${f.forma_pagamento}: ${f.qtd} pedidos | R$ ${Number(f.total).toFixed(2)}`
).join('\n')}`;
}

// Rota SSE — streaming da análise
router.get("/", requireRole('admin'), async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada no servidor." });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const dados = await coletarDados();
    const prompt = montarPrompt(dados);

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const stream = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 4096,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Erro na inteligência de vendas:", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
