import { Router } from "express";
import { pool } from "../db/index.js";
import { requireRole } from "../middlewares/auth.js";
import Groq from "groq-sdk";

const router = Router();

// Modelo da Groq. Configurável por env para não exigir deploy quando a Groq
// descontinuar um modelo (foi o caso do antigo llama-3.3-70b-versatile).
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// Teto de tokens por minuto da conta Groq (conta prompt + resposta) e margem de segurança
const TPM_LIMITE = Number(process.env.GROQ_TPM_LIMITE) || 8000;
const MARGEM_TPM = 400;

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
    comprasRevendedores,
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
      LEFT JOIN revendedores r ON r.id = COALESCE(p.revendedor_id, CASE WHEN p.tipo_cliente = 'revendedor' THEN p.cliente_id END)
      WHERE p.data_pedido >= NOW() - INTERVAL '30 days'
        AND p.status != 'Cancelado'
      GROUP BY p.cliente_id, p.revendedor_id, p.tipo_cliente, c.nome, r.razao_social, c.telefone, r.telefone
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
      LEFT JOIN revendedores r ON r.id = COALESCE(p.revendedor_id, CASE WHEN p.tipo_cliente = 'revendedor' THEN p.cliente_id END)
      WHERE p.status != 'Cancelado'
      GROUP BY p.cliente_id, p.revendedor_id, p.tipo_cliente, c.nome, r.razao_social, c.telefone, r.telefone
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

    // Compras por revendedor x produto (90 dias) — base do resumo de revenda.
    // O join aceita o formato novo (revendedor_id) e o antigo (cliente_id).
    pool.query(`
      SELECT
        COALESCE(r.razao_social, r.nome_contato, 'Revendedor #' || r.id) AS revendedor,
        pr.nome AS produto,
        COALESCE(SUM(ip.quantidade), 0) AS total_un,
        COUNT(DISTINCT ped.id) AS pedidos
      FROM pedidos ped
      JOIN revendedores r
        ON r.id = COALESCE(ped.revendedor_id, CASE WHEN ped.tipo_cliente = 'revendedor' THEN ped.cliente_id END)
      JOIN itens_pedido ip ON ip.pedido_id = ped.id
      JOIN produtos pr ON pr.id = ip.produto_id
      WHERE ped.data_pedido >= NOW() - INTERVAL '90 days'
        AND ped.status != 'Cancelado'
        AND pr.eh_agregado IS NOT TRUE
      GROUP BY r.id, r.razao_social, r.nome_contato, pr.id, pr.nome
      ORDER BY revendedor, total_un DESC
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
    comprasRevendedores: comprasRevendedores.rows,
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

  // Não há venda no domingo — ele fica fora da demanda e do planejamento
  const diasOrdem = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Previsão de DUAS semanas, com todos os números calculados aqui no servidor.
  // Produção concentrada no SÁBADO anterior a cada semana, considerando o saldo
  // de estoque: a sobra da Semana 1 abate a produção da Semana 2.
  const linhasPrevisao = Object.entries(porProduto).map(([nome, dias]) => {
    const rend = rendimentoPorNome[nome] || 1;
    const colsUn = diasOrdem.map(d => dias[d]?.mediaCeil ?? 0);
    // soma das médias brutas (evita acumular overcounting dos CEILs diários)
    const demandaSemana = diasOrdem.reduce((acc, d) => acc + (dias[d]?.media ?? 0), 0);
    const estoqueUn = estoquePorNome[nome] ?? 0;

    // Arredonda a demanda ANTES de calcular as receitas: assim as unidades
    // exibidas e as receitas batem entre si (evita casos como "0un → 1 rec").
    const demandaArred = Math.round(demandaSemana);

    // ── SEMANA 1 — produzir no sábado anterior, cobrindo o que falta no estoque
    const faltaS1 = Math.max(0, demandaArred - estoqueUn); // quantidade faltante
    const recS1 = faltaS1 > 0 ? Math.ceil(faltaS1 / rend) : 0;
    const produzidoS1 = recS1 * rend;
    const saldoFimS1 = estoqueUn + produzidoS1 - demandaArred; // sobra que entra na S2

    // ── SEMANA 2 — parte do saldo que sobrou da semana 1
    const faltaS2 = Math.max(0, demandaArred - saldoFimS1);
    const recS2 = faltaS2 > 0 ? Math.ceil(faltaS2 / rend) : 0;
    const produzidoS2 = recS2 * rend;
    const saldoFimS2 = saldoFimS1 + produzidoS2 - demandaArred;

    return {
      nome, rend, estoqueUn, colsUn,
      demandaSemana: demandaArred,
      faltaS1, recS1, saldoFimS1,
      faltaS2, recS2, saldoFimS2,
      recTotal: recS1 + recS2,
    };
  });

  const tabelaVendas = linhasPrevisao.map(l =>
    `${l.nome} | Rend: ${l.rend}un/rec | Estoque: ${l.estoqueUn}un | ${l.colsUn.join(' | ')} | Demanda/sem: ${l.demandaSemana}un | SEMANA 1: falta ${l.faltaS1}un → produzir ${l.recS1} rec (sobra ${l.saldoFimS1}un) | SEMANA 2: falta ${l.faltaS2}un → produzir ${l.recS2} rec (sobra ${l.saldoFimS2}un) | Total 2 semanas: ${l.recTotal} rec`
  ).join('\n');

  const totalRecS1 = linhasPrevisao.reduce((a, l) => a + l.recS1, 0);
  const totalRecS2 = linhasPrevisao.reduce((a, l) => a + l.recS2, 0);
  // Produtos cujo estoque atual não cobre a semana (precisam de produção)
  const faltantesS1 = linhasPrevisao.filter(l => l.faltaS1 > 0);

  // ── RESUMO POR REVENDEDOR ────────────────────────────────────────────────
  // Converte o histórico de 90 dias em média semanal por revendedor/produto e
  // mede quanto dessa demanda consome a produção sugerida de cada produto.
  const SEMANAS_90D = 90 / 7; // ~12,86 semanas
  const demandaPorProduto = {};
  linhasPrevisao.forEach(l => { demandaPorProduto[l.nome] = l.demandaSemana; });

  const porRevendedor = {};
  (dados.comprasRevendedores || []).forEach(c => {
    const unSemana = Number(c.total_un) / SEMANAS_90D;
    if (unSemana < 0.5) return; // ignora compras irrisórias (arredondariam para 0)
    if (!porRevendedor[c.revendedor]) porRevendedor[c.revendedor] = { itens: [], totalUn: 0, pedidos: 0 };
    const rend = rendimentoPorNome[c.produto] || 1;
    porRevendedor[c.revendedor].itens.push({
      produto: c.produto,
      unSemana: Math.round(unSemana),
      rend,
      // fatia da demanda semanal daquele produto que vem deste revendedor
      pctDemanda: demandaPorProduto[c.produto] > 0
        ? Math.round((unSemana / demandaPorProduto[c.produto]) * 100)
        : null,
    });
    porRevendedor[c.revendedor].totalUn += unSemana;
    porRevendedor[c.revendedor].pedidos += Number(c.pedidos);
  });

  const totalUnRevenda = Object.values(porRevendedor).reduce((a, r) => a + r.totalUn, 0);
  const totalDemandaSemana = linhasPrevisao.reduce((a, l) => a + l.demandaSemana, 0);
  const pctRevendaTotal = totalDemandaSemana > 0
    ? Math.round((totalUnRevenda / totalDemandaSemana) * 100) : 0;

  const tabelaRevendedores = Object.entries(porRevendedor)
    .sort((a, b) => b[1].totalUn - a[1].totalUn)
    .map(([nome, r]) => {
      const itens = r.itens
        .filter(i => i.unSemana > 0)
        .sort((a, b) => b.unSemana - a.unSemana)
        .map(i => `    - ${i.produto}: ${i.unSemana}un/sem (${i.pctDemanda ?? '?'}% da demanda semanal do produto; ~${(i.unSemana / i.rend).toFixed(1)} receita)`)
        .join('\n');
      return `- ${nome} | ${Math.round(r.totalUn)}un/semana | ${r.pedidos} pedidos em 90 dias\n${itens}`;
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

Você DEVE produzir exatamente 7 blocos na ordem abaixo. Nenhum bloco pode ser omitido.

**⚠️ REGRA GLOBAL: a loja NÃO vende no domingo.** Nunca cite domingo como dia de
venda, nunca sugira promoção ou ação no domingo e nunca inclua domingo em tabelas.
A semana comercial vai de **segunda a sábado**; o sábado também é o dia de produção.

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

### 🏭 BLOCO 4 — PREVISÃO DE VENDAS E PLANO DE PRODUÇÃO — PRÓXIMAS 2 SEMANAS

**⚠️ OBRIGATÓRIO: este bloco tem TRÊS tabelas — Passo 1 (previsão 2 semanas),
Passo 2 (produção da SEMANA 1) e Passo 3 (produção da SEMANA 2).
NUNCA omita o Passo 3. Mantenha os títulos "Passo 1", "Passo 2" e "Passo 3".**

**Regras de operação:**
- **NÃO há venda no domingo** — nunca inclua domingo em tabelas, previsões ou promoções
- **A produção da semana é feita no SÁBADO anterior**, em um único lote por produto
  (sábado produz o que será vendido de segunda a sábado da semana seguinte)

**⚠️ REGRA DE CÁLCULO OBRIGATÓRIA:**
- Os valores por dia são em **UNIDADES** (demanda média diária histórica), de segunda a sábado
- Tudo já vem calculado em "SEMANA 1: falta Xun → produzir Y rec (sobra Zun)" — **copie, NÃO recalcule**
- "falta" = quanto o estoque NÃO cobre da demanda da semana (é o que deve ser produzido)
- A Semana 1 desconta o estoque atual; a Semana 2 parte da **sobra** da Semana 1
- **NUNCA** aplique CEIL por dia e some depois — isso superestima a produção

**Dados de entrada (unidades/dia, 90 dias de histórico, seg–sáb):**
Formato: Produto | Rend: Nun/rec | Estoque: Xun | Seg | Ter | Qua | Qui | Sex | Sáb | Demanda/sem | SEMANA 1 | SEMANA 2 | Total 2 semanas

${tabelaVendas || 'Sem histórico de vendas por dia suficiente.'}

Totais já calculados: **Semana 1 = ${totalRecS1} receitas** | **Semana 2 = ${totalRecS2} receitas** | **Total 2 semanas = ${totalRecS1 + totalRecS2} receitas**

**Passo 1 — Tabela PREVISÃO DE VENDAS (2 semanas):**

| Produto | Rend (un/rec) | Estoque (un) | Seg | Ter | Qua | Qui | Sex | Sáb | Demanda/sem (un) | Falta S1 (un) | Receitas S1 | Sobra S1 (un) | Falta S2 (un) | Receitas S2 | Total 2 sem |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
(copie exatamente os valores da tabela acima — NÃO recalcule nenhum número)

**Passo 2 — PRODUÇÃO DO SÁBADO — para a SEMANA 1** (use "Receitas S1"):

| Produto | Falta (un) | Receitas a produzir | Rende (un) | Cobre a semana? |
|---|---|---|---|---|
(inclua apenas produtos com receitas > 0; tudo é produzido no sábado anterior)

**Passo 3 — PRODUÇÃO DO SÁBADO — para a SEMANA 2** (use "Receitas S2"):

| Produto | Falta (un) | Receitas a produzir | Rende (un) | Cobre a semana? |
|---|---|---|---|---|
(mesma lógica da Semana 1, já considerando a sobra da semana anterior)

**Passo 4 — REPOSIÇÃO (se o estoque não cobrir a semana):**
${faltantesS1.length
  ? `Estes produtos NÃO têm estoque suficiente para a Semana 1 — informe a quantidade faltante a produzir:\n${faltantesS1.map(l => `- ${l.nome}: faltam ${l.faltaS1}un (produzir ${l.recS1} receita(s) de ${l.rend}un)`).join('\n')}`
  : 'Nenhum produto ficou descoberto: o estoque atual cobre toda a demanda da Semana 1. Informe isso ao usuário.'}

**Após as tabelas:** uma linha comparando as duas semanas + mensagem motivadora curta + versículo bíblico sobre trabalho e colheita.

---

### 🤝 BLOCO 5 — RESUMO POR REVENDEDOR (previsão semanal)

Mostre **um item por revendedor, individualmente** — nunca agrupe todos numa linha só.
Para cada revendedor, com base no histórico de compras dos últimos 90 dias:
- Quantidade prevista por produto para a semana (un/semana)
- Quanto isso representa da demanda semanal daquele produto (%)
- Quanto consome da produção sugerida no BLOCO 4

**Dados já calculados (NÃO recalcule, apenas organize em tabela):**
${tabelaRevendedores || 'Nenhum revendedor com histórico de compras nos últimos 90 dias.'}

Participação da revenda no total: **${Math.round(totalUnRevenda)}un/semana de ${totalDemandaSemana}un (${pctRevendaTotal}% da demanda semanal)**

Formato da tabela (uma seção por revendedor):

| Revendedor | Produto | Previsão (un/sem) | % da demanda do produto | Receitas consumidas |
|---|---|---|---|---|

Depois da tabela, acrescente:
- Qual revendedor mais pesa na produção da semana
- Se a produção sugerida no BLOCO 4 já cobre a demanda da revenda (compare os números)
- Uma observação prática (ex.: reservar parte do lote de sábado para o revendedor X)

---

### 💰 BLOCO 6 — INTELIGÊNCIA FINANCEIRA

Use a tabela abaixo com os dados REAIS de margem de cada produto.

**TABELA DE MARGENS E PREÇOS PROMOCIONAIS PRÉ-CALCULADOS:**
${tabelaMargens || 'Dados de custo não disponíveis — use estimativas conservadoras.'}

- **Dia ideal para promoção:** indique o(s) dia(s) com menor movimento (baseie-se nos dados de dia da semana)
- **Produtos para promoção:** escolha produtos com margem suficiente e use os preços já calculados acima
- **Formato sugerido:** ex. "Quinta-feira: Produto X de R$X,XX por R$X,XX (Y% off) — ainda gera R$X,XX de lucro por unidade"
- **Para quem:** direcione ao perfil de cliente mais adequado (revendedor ou consumidor)
- **NÃO invente preços:** use exatamente os valores da tabela acima

---

### ⚠️ BLOCO 7 — DECISÕES DIFÍCEIS

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

**PEDIDOS POR DIA DA SEMANA (90 dias, seg–sáb — domingo não há venda):**
${dados.pedidosPorDia.filter(d => d.dia_nome !== 'Sunday').map(d =>
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

    // O limite da conta Groq (8.000 tokens/min) conta prompt + max_tokens juntos.
    // Estima o tamanho do prompt (~3,5 caracteres por token em pt-BR) e ajusta o
    // teto da resposta: se o catálogo crescer, a resposta encolhe em vez de falhar
    // com "Request too large".
    const promptTokensEstimado = Math.ceil(prompt.length / 3.5);
    const maxTokens = Math.max(1500, Math.min(4096, TPM_LIMITE - MARGEM_TPM - promptTokensEstimado));
    console.log(`[IA vendas] prompt ~${promptTokensEstimado} tokens | max_tokens ${maxTokens}`);

    const stream = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: maxTokens,
      reasoning_effort: "low",
      // Baixa temperatura: o relatório deve COPIAR os números já calculados no
      // servidor, não variar. Reduz erro de transcrição e deixa o resultado estável.
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Erro na inteligência de vendas:", err);
    // Traduz erros comuns da Groq para algo acionável na tela
    const raw = err.message || "";
    let amigavel = raw;
    if (raw.includes("rate_limit_exceeded") || err.status === 429 || err.status === 413) {
      amigavel = "Limite de uso da IA atingido no momento. Aguarde 1 minuto e gere a análise novamente.";
    } else if (raw.includes("model_not_found") || raw.includes("does not exist")) {
      amigavel = "O modelo de IA configurado não está mais disponível. Ajuste a variável GROQ_MODEL no servidor.";
    }
    res.write(`data: ${JSON.stringify({ error: amigavel })}\n\n`);
    res.end();
  }
});

export default router;
