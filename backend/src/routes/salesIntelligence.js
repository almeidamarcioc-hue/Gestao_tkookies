import { Router } from "express";
import { pool } from "../db/index.js";
import { requireRole } from "../middlewares/auth.js";
import Groq from "groq-sdk";

const router = Router();

async function coletarDados() {
  const [pedidos, topProdutos, topClientes, clientesSumidos, pedidosPorDia, financeiro] = await Promise.all([
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

    // Produtos mais vendidos
    pool.query(`
      SELECT
        pr.nome,
        pr.preco_venda,
        pr.custo,
        COALESCE(SUM(ip.quantidade), 0) AS total_vendido,
        COALESCE(SUM(ip.valor_total), 0) AS receita,
        COALESCE(SUM(ip.quantidade) * (pr.preco_venda - COALESCE(pr.custo, 0)), 0) AS lucro_estimado
      FROM produtos pr
      LEFT JOIN itens_pedido ip ON pr.id = ip.produto_id
      LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
        AND ped.data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND ped.status != 'Cancelado'
      WHERE pr.ativo = TRUE
      GROUP BY pr.id, pr.nome, pr.preco_venda, pr.custo
      ORDER BY total_vendido DESC
      LIMIT 15
    `),

    // Top clientes
    pool.query(`
      SELECT
        c.nome, c.telefone,
        COUNT(p.id) AS total_pedidos,
        COALESCE(SUM(p.valor_total), 0) AS total_gasto,
        MAX(p.data_pedido) AS ultimo_pedido
      FROM clientes c
      JOIN pedidos p ON p.cliente_id = c.id
        AND p.data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND p.status != 'Cancelado'
      GROUP BY c.id, c.nome, c.telefone
      ORDER BY total_gasto DESC
      LIMIT 10
    `),

    // Clientes que sumiram (compraram antes, mas não nos últimos 15 dias)
    pool.query(`
      SELECT c.nome, c.telefone, MAX(p.data_pedido) AS ultimo_pedido
      FROM clientes c
      JOIN pedidos p ON p.cliente_id = c.id AND p.status != 'Cancelado'
      GROUP BY c.id, c.nome, c.telefone
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
  ]);

  return {
    resumo: pedidos.rows[0],
    topProdutos: topProdutos.rows,
    topClientes: topClientes.rows,
    clientesSumidos: clientesSumidos.rows,
    pedidosPorDia: pedidosPorDia.rows,
    financeiro: financeiro.rows,
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

### BLOCO 1 — PODER DE COMPRA DOS CLIENTES
Com base nos pedidos dos últimos 30 dias:
- Classifique os clientes em 3 grupos: Alto, Médio e Baixo poder de compra
- Destaque os TOP 3 clientes que mais compraram
- Identifique clientes que compravam e sumiram (sem pedidos nos últimos 15 dias)

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
Com base na média dos últimos 30 dias por dia da semana:
- Estime a quantidade a ser produzida de cada produto por dia
- Apresente OBRIGATORIAMENTE em formato de tabela markdown com esta estrutura exata (use | e --- para separadores):

| Produto | Seg | Ter | Qua | Qui | Sex | Sáb | TOTAL |
|---------|-----|-----|-----|-----|-----|-----|-------|
| Nome do produto | X | X | X | X | X | X | X |

- IMPORTANTE: cada produto em uma linha separada, nunca em linha única
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
  `${i+1}. ${p.nome} — Qtd: ${p.total_vendido} | Receita: R$ ${Number(p.receita).toFixed(2)} | Preço: R$ ${Number(p.preco_venda).toFixed(2)} | Custo: R$ ${Number(p.custo || 0).toFixed(2)}`
).join('\n')}

**TOP CLIENTES:**
${dados.topClientes.length ? dados.topClientes.map((c, i) =>
  `${i+1}. ${c.nome} — ${c.total_pedidos} pedidos | R$ ${Number(c.total_gasto).toFixed(2)} | Último: ${new Date(c.ultimo_pedido).toLocaleDateString('pt-BR')}`
).join('\n') : 'Nenhum cliente com pedidos no período.'}

**CLIENTES QUE SUMIRAM (compraram mas sem pedidos há 15+ dias):**
${dados.clientesSumidos.length ? dados.clientesSumidos.map(c =>
  `- ${c.nome} (tel: ${c.telefone}) — último pedido: ${new Date(c.ultimo_pedido).toLocaleDateString('pt-BR')}`
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
