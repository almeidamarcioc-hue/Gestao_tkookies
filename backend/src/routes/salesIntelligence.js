import { Router } from "express";
import { pool } from "../db/index.js";
import { requireRole } from "../middlewares/auth.js";
import Groq from "groq-sdk";

const router = Router();

const CACHE_TTL_MS = 10 * 60 * 1000;
let dadosCache = null;
let cacheTimestamp = 0;

async function coletarDados() {
  const agora = Date.now();
  if (dadosCache && (agora - cacheTimestamp) < CACHE_TTL_MS) return dadosCache;
  const dados = await coletarDadosBanco();
  dadosCache = dados;
  cacheTimestamp = agora;
  return dados;
}

// Helper: dia da semana em inglês (para mapeamento do frontend)
const DOW_SQL = `CASE EXTRACT(DOW FROM {col})::int
  WHEN 0 THEN 'Sunday'
  WHEN 1 THEN 'Monday'
  WHEN 2 THEN 'Tuesday'
  WHEN 3 THEN 'Wednesday'
  WHEN 4 THEN 'Thursday'
  WHEN 5 THEN 'Friday'
  WHEN 6 THEN 'Saturday'
END`;

function dowExpr(col) {
  return DOW_SQL.replace(/{col}/g, col);
}

async function coletarDadosBanco() {
  const [
    pedidos30,
    pedidos90,
    topProdutos,
    topClientes,
    clientesSumidos,
    pedidosPorDia,
    financeiro,
    vendasPorProdutoDia,
    ocorrenciasDias,
  ] = await Promise.all([

    // Resumo últimos 30 dias
    pool.query(`
      SELECT
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(valor_total), 0) AS receita_total,
        COALESCE(AVG(valor_total), 0) AS ticket_medio,
        COALESCE(SUM(frete), 0) AS total_frete
      FROM pedidos
      WHERE data_pedido >= NOW() - INTERVAL '30 days'
        AND status != 'Cancelado'
    `),

    // Resumo últimos 90 dias (tendência)
    pool.query(`
      SELECT
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(valor_total), 0) AS receita_total,
        COALESCE(AVG(valor_total), 0) AS ticket_medio,
        COUNT(DISTINCT DATE_TRUNC('week', data_pedido)) AS semanas_com_pedido
      FROM pedidos
      WHERE data_pedido >= NOW() - INTERVAL '90 days'
        AND status != 'Cancelado'
    `),

    // Produtos mais vendidos — últimos 90 dias
    pool.query(`
      SELECT
        pr.id,
        pr.nome,
        pr.preco_venda,
        COALESCE(pr.custo, 0) AS custo,
        COALESCE(pr.estoque, 0) AS estoque_atual,
        COALESCE(SUM(ip.quantidade), 0) AS total_vendido,
        COALESCE(SUM(ip.valor_total), 0) AS receita,
        COALESCE(SUM(ip.quantidade) * (pr.preco_venda - COALESCE(pr.custo, 0)), 0) AS lucro_estimado
      FROM produtos pr
      LEFT JOIN itens_pedido ip ON pr.id = ip.produto_id
      LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
        AND ped.data_pedido >= NOW() - INTERVAL '90 days'
        AND ped.status != 'Cancelado'
      WHERE pr.ativo = TRUE AND pr.eh_agregado IS NOT TRUE
      GROUP BY pr.id, pr.nome, pr.preco_venda, pr.custo, pr.estoque
      ORDER BY total_vendido DESC
      LIMIT 20
    `),

    // Top clientes + revendedores (30 dias)
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
      WHERE p.data_pedido >= NOW() - INTERVAL '30 days'
        AND p.status != 'Cancelado'
      GROUP BY p.cliente_id, p.tipo_cliente, c.nome, r.razao_social, c.telefone, r.telefone
      ORDER BY total_gasto DESC
      LIMIT 10
    `),

    // Clientes/revendedores que sumiram (15 a 60 dias sem pedidos)
    pool.query(`
      SELECT
        COALESCE(c.nome, r.razao_social) AS nome,
        COALESCE(c.telefone, r.telefone) AS telefone,
        p.tipo_cliente,
        MAX(p.data_pedido) AS ultimo_pedido,
        COUNT(p.id) AS historico_pedidos,
        COALESCE(SUM(p.valor_total), 0) AS total_historico
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id AND (p.tipo_cliente IS NULL OR p.tipo_cliente = 'consumidor')
      LEFT JOIN revendedores r ON p.cliente_id = r.id AND p.tipo_cliente = 'revendedor'
      WHERE p.status != 'Cancelado'
      GROUP BY p.cliente_id, p.tipo_cliente, c.nome, r.razao_social, c.telefone, r.telefone
      HAVING MAX(p.data_pedido) < NOW() - INTERVAL '15 days'
        AND MAX(p.data_pedido) >= NOW() - INTERVAL '60 days'
      ORDER BY total_historico DESC
      LIMIT 10
    `),

    // Pedidos por dia da semana — últimos 90 dias
    pool.query(`
      SELECT
        EXTRACT(DOW FROM data_pedido)::int AS dia_num,
        ${dowExpr('data_pedido')} AS dia_nome,
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(valor_total), 0) AS receita,
        COALESCE(AVG(valor_total), 0) AS ticket_medio_dia,
        COUNT(DISTINCT data_pedido::date) AS dias_com_pedido
      FROM pedidos
      WHERE data_pedido >= NOW() - INTERVAL '90 days'
        AND status != 'Cancelado'
      GROUP BY EXTRACT(DOW FROM data_pedido)::int, ${dowExpr('data_pedido')}
      ORDER BY dia_num
    `),

    // Resumo financeiro (30 dias)
    pool.query(`
      SELECT
        forma_pagamento,
        COUNT(*) AS qtd,
        COALESCE(SUM(valor_total), 0) AS total
      FROM pedidos
      WHERE data_pedido >= NOW() - INTERVAL '30 days'
        AND status != 'Cancelado'
      GROUP BY forma_pagamento
      ORDER BY total DESC
    `),

    // Vendas por produto por dia da semana — últimos 90 dias (base do plano de produção)
    pool.query(`
      SELECT
        pr.nome,
        COALESCE(pr.rendimento, 1) AS rendimento,
        EXTRACT(DOW FROM ped.data_pedido)::int AS dia_num,
        ${dowExpr('ped.data_pedido')} AS dia_nome,
        COUNT(DISTINCT ped.data_pedido::date) AS dias_com_venda,
        COALESCE(SUM(ip.quantidade), 0) AS total_vendido_dia
      FROM produtos pr
      JOIN itens_pedido ip ON pr.id = ip.produto_id
      JOIN pedidos ped ON ip.pedido_id = ped.id
      WHERE ped.data_pedido >= NOW() - INTERVAL '90 days'
        AND ped.status != 'Cancelado'
        AND pr.ativo = TRUE
        AND pr.eh_agregado IS NOT TRUE
      GROUP BY pr.id, pr.nome, pr.rendimento, EXTRACT(DOW FROM ped.data_pedido)::int, ${dowExpr('ped.data_pedido')}
      ORDER BY pr.nome, dia_num
    `),

    // Quantidade real de ocorrências de cada dia da semana nos últimos 90 dias
    // (para calcular média correta: vendas ÷ total de vezes que aquele dia apareceu)
    pool.query(`
      SELECT
        EXTRACT(DOW FROM d)::int AS dia_num,
        COUNT(*) AS total_ocorrencias
      FROM generate_series(
        NOW() - INTERVAL '90 days',
        NOW(),
        '1 day'::interval
      ) AS d
      GROUP BY EXTRACT(DOW FROM d)::int
      ORDER BY dia_num
    `),
  ]);

  return {
    resumo30: pedidos30.rows[0],
    resumo90: pedidos90.rows[0],
    topProdutos: topProdutos.rows,
    topClientes: topClientes.rows,
    clientesSumidos: clientesSumidos.rows,
    pedidosPorDia: pedidosPorDia.rows,
    financeiro: financeiro.rows,
    vendasPorProdutoDia: vendasPorProdutoDia.rows,
    ocorrenciasDias: ocorrenciasDias.rows,
    dataAnalise: new Date().toLocaleDateString('pt-BR'),
  };
}

function montarPrompt(dados) {
  const diasPT = {
    Sunday: 'Domingo', Monday: 'Segunda', Tuesday: 'Terça',
    Wednesday: 'Quarta', Thursday: 'Quinta', Friday: 'Sexta', Saturday: 'Sábado',
  };
  const diasPTCurto = {
    Sunday: 'Dom', Monday: 'Seg', Tuesday: 'Ter',
    Wednesday: 'Qua', Thursday: 'Qui', Friday: 'Sex', Saturday: 'Sáb',
  };

  // Mapa de ocorrências por dia_num
  const ocorrencias = {};
  dados.ocorrenciasDias.forEach(o => { ocorrencias[o.dia_num] = Number(o.total_ocorrencias); });

  // Monta tabela de vendas por produto por dia com média real
  const porProduto = {};
  const rendimentoPorNome = {};
  dados.vendasPorProdutoDia.forEach(r => {
    if (!porProduto[r.nome]) porProduto[r.nome] = {};
    rendimentoPorNome[r.nome] = Math.max(1, Number(r.rendimento) || 1);
    const ocorr = ocorrencias[r.dia_num] || 13;
    const mediaPorOcorrencia = Number(r.total_vendido_dia) / ocorr;
    porProduto[r.nome][r.dia_nome] = {
      total: Number(r.total_vendido_dia),
      diasComVenda: Number(r.dias_com_venda),
      media: mediaPorOcorrencia,
      mediaCeil: Math.ceil(mediaPorOcorrencia),
    };
  });

  // Localiza estoque atual de cada produto
  const estoquePorNome = {};
  dados.topProdutos.forEach(p => { estoquePorNome[p.nome] = Number(p.estoque_atual); });

  const diasOrdem = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  // tabelaVendas em UNIDADES por dia + receitas calculadas UMA vez para a semana
  // Exibe mediaCeil por dia (para planejamento diário), mas soma media bruta para o total
  const tabelaVendas = Object.entries(porProduto).map(([nome, dias]) => {
    const rend = rendimentoPorNome[nome] || 1;
    // para exibição: unidades por dia arredondadas para cima (não subprovisionamento)
    const colsUn = diasOrdem.map(d => dias[d]?.mediaCeil ?? 0);
    // para o total: soma das médias brutas (evita acumular overcounting de 7 CEILs)
    const totalUnReal = diasOrdem.reduce((acc, d) => acc + (dias[d]?.media ?? 0), 0);
    // CEIL aplicado UMA vez ao total real
    const receitasSemana = totalUnReal > 0 ? Math.ceil(totalUnReal / rend) : 0;
    const estoqueUn = estoquePorNome[nome] ?? 0;
    return `${nome} | Rend: ${rend}un/rec | Estoque: ${estoqueUn}un | ${colsUn.join(' | ')} | Total: ${Math.round(totalUnReal)}un → ${receitasSemana} rec/sem`;
  }).join('\n');

  const tabelaMargens = dados.topProdutos
    .filter(p => Number(p.preco_venda) > 0 && Number(p.custo) > 0 && Number(p.total_vendido) > 0)
    .map(p => {
      const preco = Number(p.preco_venda);
      const custo = Number(p.custo);
      const margemR = preco - custo;
      const margemPct = ((margemR / preco) * 100).toFixed(1);
      // desconto máximo mantendo margem mínima de 20%
      const precoMin = custo / 0.80;
      const descMax = Math.max(0, Math.floor(((preco - precoMin) / preco) * 100));
      const descSug = Math.min(descMax, 15); // sugerir no máximo 15%
      const precoPromo = (preco * (1 - descSug / 100)).toFixed(2);
      return `${p.nome} | Preço: R$${preco.toFixed(2)} | Custo: R$${custo.toFixed(2)} | Margem: R$${margemR.toFixed(2)} (${margemPct}%) | Desconto máx seguro: ${descMax}% | Promoção sugerida: R$${precoPromo} (${descSug}% off)`;
    }).join('\n');

  return `Você é uma inteligência de vendas especializada em confeitaria artesanal.
Seu tom é direto, objetivo e motivador. Transforme dados reais em planos de ação concretos.
Data da análise: ${dados.dataAnalise}

---

## INSTRUÇÕES OBRIGATÓRIAS

Você DEVE produzir exatamente 6 blocos na ordem abaixo. Nenhum bloco pode ser omitido.

---

### 🏆 BLOCO 1 — CLIENTES E REVENDEDORES (últimos 30 dias)

- Classifique os compradores em: 🔴 Alto (top 3) | 🟡 Médio | 🟢 Baixo volume
- Destaque o TOP 3 (nome + tipo + valor gasto)
- Liste os que sumiram (>15 dias), com tipo, último pedido e sugestão direta de reativação (mensagem de WhatsApp pronta)

---

### 🍪 BLOCO 2 — COOKIES MAIS VENDIDOS (últimos 90 dias)

- Liste em ordem de quantidade vendida (TOP 5 no mínimo)
- Informe qual gera mais receita e qual tem melhor margem
- Identifique produto em baixa (pouco vendido mas no cardápio)

---

### 📅 BLOCO 3 — MAPA DE ENERGIA DA SEMANA (últimos 90 dias)

Com base nos pedidos por dia da semana:
- Dias QUENTES 🔥 (alta demanda): focar em vendas e disponibilidade
- Dias MORNOS 🌤 (média demanda)
- Dias FRIOS ❄️ (baixa demanda): ação promocional sugerida

---

### 🏭 BLOCO 4 — PLANO DE PRODUÇÃO — PRÓXIMA SEMANA

**Regra:** cookies produzidos 1 dia antes da venda.
- Para vender na Terça → produzir na Segunda
- Para vender na Segunda → produzir no Sábado anterior

**⚠️ REGRA DE CÁLCULO OBRIGATÓRIA:**
- Os valores por dia são em **UNIDADES** (demanda média diária histórica)
- O campo "Total: Xun → Y rec/sem" já mostra a conversão correta: CEIL(total_semana ÷ rendimento) — **use este número de receitas**
- **NUNCA** aplique CEIL por dia e some depois — isso superestima a produção
- Exemplo correto: demanda 5un/dia × 6 dias = 30un ÷ rend 11 = CEIL(2,7) = **3 receitas**, não 6

**Dados de entrada (unidades/dia, baseado em 90 dias de histórico):**
Formato: Produto | Rend: Nun/rec | Estoque: Xun | Seg | Ter | Qua | Qui | Sex | Sáb | Dom | Total: Xun → Y rec/sem

${tabelaVendas || 'Sem histórico de vendas por dia suficiente.'}

**Passo 1 — Tabela PREVISÃO DE VENDAS (próxima semana):**

| Produto | Rend (un/rec) | Estoque (un) | Seg | Ter | Qua | Qui | Sex | Sáb | Total (un) | Receitas/sem |
|---------|---------------|--------------|-----|-----|-----|-----|-----|-----|------------|--------------|
(use os valores da tabela acima; "Receitas/sem" = campo "Y rec/sem" já calculado — não recalcule)

**Passo 2 — Tabela PLANO DE PRODUÇÃO (em receitas, agrupando para minimizar dias de produção):**

| Dia de Produção | Para Vender em | Produto | Receitas | Rende (unidades) |
|-----------------|----------------|---------|----------|------------------|
(inclua apenas receitas > 0; desconte o estoque em unidades do total semanal antes de calcular receitas; prefira agrupar produção em 1-2 dias por produto quando viável)

**Após as tabelas:** mensagem motivadora curta + versículo bíblico sobre trabalho e colheita.

---

### 💰 BLOCO 5 — INTELIGÊNCIA FINANCEIRA

Use a tabela abaixo com os dados REAIS de margem de cada produto.

**TABELA DE MARGENS E PREÇOS PROMOCIONAIS PRÉ-CALCULADOS:**
${tabelaMargens || 'Dados de custo não disponíveis — use estimativas conservadoras.'}

- **Dia ideal para promoção:** indique o(s) dia(s) com menor movimento (baseie-se nos dados de dia da semana)
- **Produtos para promoção:** escolha produtos com margem suficiente e use os preços já calculados acima
- **Formato sugerido:** ex. "Quinta-feira: Produto X de R$X,XX por R$X,XX (Y% off) — ainda gera R$X,XX de lucro por unidade"
- **Para quem:** direcione ao perfil de cliente mais adequado (revendedor ou consumidor)
- **NÃO invente preços:** use exatamente os valores da tabela acima

---

### ⚠️ BLOCO 6 — DECISÕES DIFÍCEIS

- Produto(s) candidato(s) a pausar ou reformular (menor saída + baixa margem)
- Produto estrela em risco (alto volume mas estoque baixo)
- Uma ação imediata para esta semana

---

## DADOS DO SISTEMA

**DESEMPENHO RECENTE:**
- Últimos 30 dias: ${dados.resumo30.total_pedidos} pedidos | Receita: R$ ${Number(dados.resumo30.receita_total).toFixed(2)} | Ticket médio: R$ ${Number(dados.resumo30.ticket_medio).toFixed(2)}
- Últimos 90 dias: ${dados.resumo90.total_pedidos} pedidos | Receita: R$ ${Number(dados.resumo90.receita_total).toFixed(2)} | Semanas com pedido: ${dados.resumo90.semanas_com_pedido}

**PRODUTOS (ordenados por volume — 90 dias):**
${dados.topProdutos.map((p, i) =>
  `${i+1}. ${p.nome} — Vendido: ${p.total_vendido} un | Estoque: ${p.estoque_atual} un | Preço: R$ ${Number(p.preco_venda).toFixed(2)} | Custo: R$ ${Number(p.custo).toFixed(2)} | Lucro est.: R$ ${Number(p.lucro_estimado).toFixed(2)}`
).join('\n')}

**PEDIDOS POR DIA DA SEMANA (90 dias):**
${dados.pedidosPorDia.map(d =>
  `- ${diasPT[d.dia_nome] || d.dia_nome}: ${d.total_pedidos} pedidos | Receita: R$ ${Number(d.receita).toFixed(2)} | Ticket médio: R$ ${Number(d.ticket_medio_dia).toFixed(2)} | Dias com pedido: ${d.dias_com_pedido}`
).join('\n')}

**TOP CLIENTES/REVENDEDORES (30 dias):**
${dados.topClientes.length ? dados.topClientes.map((c, i) =>
  `${i+1}. ${c.nome || '(sem nome)'} [${c.tipo_cliente === 'revendedor' ? 'REVENDEDOR' : 'CLIENTE'}] — ${c.total_pedidos} pedidos | R$ ${Number(c.total_gasto).toFixed(2)} | Último: ${new Date(c.ultimo_pedido).toLocaleDateString('pt-BR')}`
).join('\n') : 'Nenhum.'}

**SUMIDOS (15–60 dias sem pedido):**
${dados.clientesSumidos.length ? dados.clientesSumidos.map(c =>
  `- ${c.nome || '(sem nome)'} [${c.tipo_cliente === 'revendedor' ? 'REVENDEDOR' : 'CLIENTE'}] | Tel: ${c.telefone || 'n/d'} | Último: ${new Date(c.ultimo_pedido).toLocaleDateString('pt-BR')} | Histórico: ${c.historico_pedidos} pedidos / R$ ${Number(c.total_historico).toFixed(2)}`
).join('\n') : 'Nenhum.'}

**FORMAS DE PAGAMENTO (30 dias):**
${dados.financeiro.map(f =>
  `- ${f.forma_pagamento || 'Não informado'}: ${f.qtd} pedidos | R$ ${Number(f.total).toFixed(2)}`
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
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Erro na inteligência de vendas:", err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
