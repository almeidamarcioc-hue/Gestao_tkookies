import { Router } from "express";
import { pool } from "../db/index.js";
import { requireRole } from "../middlewares/auth.js";
import Groq from "groq-sdk";

const router = Router();

// ─── Municípios num raio de ~50 km de Três de Maio, RS ───────────────────────
const MUNICIPIOS_50KM = [
  { nome: "TRES DE MAIO",        dist: 0  },
  { nome: "HORIZONTINA",         dist: 18 },
  { nome: "TUPARENDI",           dist: 21 },
  { nome: "SANTA ROSA",          dist: 28 },
  { nome: "BOA VISTA DO BURICA", dist: 25 },
  { nome: "CAMPINA DAS MISSOES", dist: 22 },
  { nome: "CANDIDO GODOI",       dist: 25 },
  { nome: "TUCUNDUVA",           dist: 28 },
];

const TERMOS_BUSCA = ["padaria", "confeitaria"];

// ─── Temperatura por CNAE ────────────────────────────────────────────────────

function calcularTemperaturaCNAE(cnaeDescricao, nomeEmpresa) {
  const texto = [cnaeDescricao, nomeEmpresa].join(" ").toLowerCase();
  if (/padari|confeit|biscoito|cookie|doce|doceria|panific|bolo|torta|chocolate|brigadeiro/.test(texto))
    return { nivel: "QUENTE",    emoji: "🔥", cor: "#C62828", label: "Quente",    score: 90 };
  if (/caf[eé]|cafeter|coffee|bar |lanche|empório|mercearia|conveniên/.test(texto))
    return { nivel: "MORNO",     emoji: "🟡", cor: "#E65100", label: "Morno",     score: 65 };
  if (/supermercado|minimercado|alimento|distribui|varejo/.test(texto))
    return { nivel: "AQUECENDO", emoji: "🌤️", cor: "#F9A825", label: "Aquecendo", score: 50 };
  return   { nivel: "FRIO",      emoji: "❄️", cor: "#1565C0", label: "Frio",      score: 35 };
}

// ─── Formatter open.cnpja.com ─────────────────────────────────────────────────

function formatarOpenCNPJABusca(item) {
  const cnpj = (item.taxId || "").replace(/\D/g, "");
  const telefone = item.phones?.[0]
    ? `(${item.phones[0].area || ""}) ${item.phones[0].number || ""}`.trim()
    : null;
  return {
    cnpj,
    razao_social: item.company?.name || null,
    nome_fantasia: item.alias || null,
    situacao: item.status?.text || null,
    tipo: item.company?.entity?.text || null,
    natureza_juridica: item.company?.nature?.text || null,
    data_abertura: item.founded || null,
    atividade_principal: item.mainActivity?.text || null,
    cnae_codigo: item.mainActivity?.id || null,
    capital_social: item.company?.equity || null,
    email: item.emails?.[0]?.address || null,
    telefone,
    logradouro: [item.address?.street, item.address?.number, item.address?.details].filter(Boolean).join(", "),
    bairro: item.address?.district || null,
    municipio: item.address?.city || null,
    uf: item.address?.state || null,
    cep: item.address?.zip || null,
    qsa: [],  // não disponível na busca; carregado sob demanda via BrasilAPI
    fonte: "open.cnpja.com (dados Receita Federal)",
  };
}

// Helper: AbortSignal com timeout compatível com Node 16+
function makeTimeoutSignal(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error(`Timeout após ${ms}ms`)), ms);
  const clear = () => clearTimeout(id);
  return { signal: controller.signal, clear };
}

// ─── GET /prospeccao-revendedores/buscar ─────────────────────────────────────
// Busca empresas na Receita Federal via open.cnpja.com (6 municípios × 2 termos)

router.get("/buscar", requireRole("admin"), async (req, res) => {
  const CACHE_KEY    = "overpass_cache";
  const CACHE_TS_KEY = "overpass_cache_ts";
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

  // ── 1. Verificar cache ──────────────────────────────────────────────────────
  try {
    const cacheRows = await pool.query(
      "SELECT chave, valor FROM configuracoes WHERE chave = ANY($1)",
      [[CACHE_KEY, CACHE_TS_KEY]]
    );
    const cacheData = cacheRows.rows.find(r => r.chave === CACHE_KEY);
    const cacheTs   = cacheRows.rows.find(r => r.chave === CACHE_TS_KEY);
    if (cacheData && cacheTs) {
      const age = Date.now() - Number(cacheTs.valor);
      if (age < CACHE_TTL_MS) {
        console.log("[OpenCNPJA] Servindo do cache do banco");
        return res.json(JSON.parse(cacheData.valor));
      }
    }
  } catch (e) {
    console.warn("[OpenCNPJA] Falha ao ler cache:", e.message);
  }

  // ── 2. Montar as 12 requisições (6 municípios × 2 termos) ──────────────────
  const HEADERS = {
    "User-Agent": "TKookies-ERP/1.0 (contact: marcioalmeida@migrate.info)",
    "Accept": "application/json",
  };

  const requests = [];
  for (const municipio of MUNICIPIOS_50KM) {
    for (const termo of TERMOS_BUSCA) {
      requests.push({ municipio, termo });
    }
  }

  async function buscarUma({ municipio, termo }) {
    const url = `https://open.cnpja.com/office/search?name=${encodeURIComponent(termo)}&state=RS&city=${encodeURIComponent(municipio.nome)}&status=ATIVA&limit=10`;
    const { signal, clear } = makeTimeoutSignal(20_000);
    try {
      console.log(`[OpenCNPJA] ${termo} em ${municipio.nome}`);
      const resp = await fetch(url, { signal, headers: HEADERS });
      clear();
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const offices = data.offices || data.results || data.data || [];
      return { municipio, offices };
    } catch (err) {
      clear();
      console.warn(`[OpenCNPJA] Falhou ${municipio.nome}/${termo}: ${err.message}`);
      return { municipio, offices: [], erro: err.message };
    }
  }

  const resultados = await Promise.allSettled(requests.map(buscarUma));

  // ── 3. Coletar e desduplicar por CNPJ ──────────────────────────────────────
  const porCNPJ = new Map(); // cnpj → { item, municipio }

  for (const result of resultados) {
    if (result.status !== "fulfilled") continue;
    const { municipio, offices } = result.value;
    for (const item of offices) {
      const cnpj = (item.taxId || "").replace(/\D/g, "");
      if (cnpj.length !== 14) continue;
      if (!porCNPJ.has(cnpj)) {
        porCNPJ.set(cnpj, { item, municipio });
      }
    }
  }

  // ── 4. Fallback se nenhuma requisição retornou dados ───────────────────────
  if (porCNPJ.size === 0) {
    console.warn("[OpenCNPJA] Todas as 12 requests falharam, tentando fallback sem filtro de cidade");
    try {
      const url = `https://open.cnpja.com/office/search?name=${encodeURIComponent(TERMOS_BUSCA[0])}&state=RS&status=ATIVA&limit=20`;
      const { signal, clear } = makeTimeoutSignal(20_000);
      const resp = await fetch(url, { signal, headers: HEADERS });
      clear();
      if (resp.ok) {
        const data = await resp.json();
        const offices = data.offices || data.results || data.data || [];
        for (const item of offices.slice(0, 20)) {
          const cnpj = (item.taxId || "").replace(/\D/g, "");
          if (cnpj.length === 14 && !porCNPJ.has(cnpj)) {
            porCNPJ.set(cnpj, { item, municipio: { nome: "RS", dist: null } });
          }
        }
      }
    } catch (err) {
      console.error("[OpenCNPJA] Fallback sem cidade também falhou:", err.message);
    }

    if (porCNPJ.size === 0) {
      // Tenta cache expirado como último recurso
      try {
        const fallback = await pool.query(
          "SELECT valor FROM configuracoes WHERE chave = $1",
          [CACHE_KEY]
        );
        if (fallback.rows.length > 0) {
          console.log("[OpenCNPJA] Servindo cache expirado como fallback");
          return res.json({ ...JSON.parse(fallback.rows[0].valor), cache_expirado: true });
        }
      } catch { /* sem cache disponível */ }

      return res.status(500).json({
        error: "Não foi possível obter dados da Receita Federal no momento.",
        detalhe: "Todas as requisições para open.cnpja.com falharam (12 requisições + fallback).",
      });
    }
  }

  // ── 5. Formatar e calcular temperatura ─────────────────────────────────────
  const empresas = Array.from(porCNPJ.values()).map(({ item, municipio }) => {
    const dados_receita = formatarOpenCNPJABusca(item);
    const cnaeDescricao = dados_receita.atividade_principal || "";
    const nomeEmpresa   = dados_receita.razao_social || dados_receita.nome_fantasia || "";
    const temperatura   = calcularTemperaturaCNAE(cnaeDescricao, nomeEmpresa);

    return {
      osm_id:       dados_receita.cnpj,
      nome:         dados_receita.razao_social || dados_receita.nome_fantasia,
      tipo_osm:     cnaeDescricao,
      tipo_label:   cnaeDescricao.slice(0, 50),
      cidade:       dados_receita.municipio,
      bairro:       dados_receita.bairro,
      logradouro:   dados_receita.logradouro,
      telefone:     dados_receita.telefone,
      website:      null,
      email:        dados_receita.email,
      cnpj:         dados_receita.cnpj,
      lat:          null,
      lng:          null,
      distancia_km: municipio.dist,
      temperatura,
      dados_receita,
    };
  });

  // Ordena: temperatura desc, depois distância asc
  empresas.sort((a, b) => {
    if (b.temperatura.score !== a.temperatura.score)
      return b.temperatura.score - a.temperatura.score;
    return (a.distancia_km ?? 999) - (b.distancia_km ?? 999);
  });

  const resposta = {
    empresas,
    total: empresas.length,
    raio_km: 50,
    origem: { lat: -27.7847, lng: -54.2394, cidade: "Três de Maio, RS" },
    fonte: "open.cnpja.com (Receita Federal)",
    aviso_limite: "Dados oriundos diretamente da Receita Federal via open.cnpja.com.",
  };

  // ── 6. Salvar no cache ──────────────────────────────────────────────────────
  try {
    await pool.query(
      `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2), ($3, $4)
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
      [CACHE_KEY, JSON.stringify(resposta), CACHE_TS_KEY, String(Date.now())]
    );
  } catch (e) {
    console.warn("[OpenCNPJA] Falha ao salvar cache:", e.message);
  }

  res.json(resposta);
});

// ─── GET /prospeccao-revendedores/buscar-cnpj ────────────────────────────────
// Busca CNPJ pelo nome da empresa via open.cnpja.com (gratuita, rate limited)
// Quando encontrado, já enriquece com BrasilAPI / minhareceita.org

router.get("/buscar-cnpj", requireRole("admin"), async (req, res) => {
  const { nome, uf = "RS" } = req.query;
  if (!nome) return res.status(400).json({ cnpj: null, erro: "Informe o nome da empresa." });

  try {
    const url = `https://open.cnpja.com/office/search?name=${encodeURIComponent(nome)}&state=${uf}&limit=5`;
    const { signal, clear } = makeTimeoutSignal(12_000);
    const resp = await fetch(url, {
      signal,
      headers: { "User-Agent": "TKookies-ERP/1.0", "Accept": "application/json" },
    });
    clear();

    if (resp.status === 429) {
      return res.status(429).json({ cnpj: null, erro: "Limite atingido. Aguarde e tente novamente." });
    }
    if (!resp.ok) {
      return res.json({ cnpj: null });
    }

    const data = await resp.json();
    const offices = data.offices || data.results || data.data || [];
    if (offices.length === 0) return res.json({ cnpj: null });

    // Pega o resultado mais relevante
    const match = offices[0];
    const cnpjRaw = (match.taxId || match.cnpj || "").replace(/\D/g, "");
    if (cnpjRaw.length !== 14) return res.json({ cnpj: null });

    // Enriquece imediatamente com BrasilAPI
    try {
      const brasilResp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjRaw}`, {
        headers: { "User-Agent": "TKookies-ERP/1.0" },
        signal: AbortSignal ? (() => { const c = new AbortController(); setTimeout(() => c.abort(), 10000); return c.signal; })() : undefined,
      });
      if (brasilResp.ok) {
        const bd = await brasilResp.json();
        return res.json({ cnpj: cnpjRaw, dados: formatarBrasilAPI(bd) });
      }
    } catch { /* fallback abaixo */ }

    // Fallback: minhareceita.org
    try {
      const mrResp = await fetch(`https://minhareceita.org/${cnpjRaw}`);
      if (mrResp.ok) {
        const mr = await mrResp.json();
        return res.json({ cnpj: cnpjRaw, dados: formatarMinhareceita(mr) });
      }
    } catch { /* retorna só o CNPJ */ }

    return res.json({ cnpj: cnpjRaw, dados: null });
  } catch (err) {
    console.error("Erro busca CNPJ:", err.message);
    return res.json({ cnpj: null, erro: err.message });
  }
});

function formatarMinhareceita(d) {
  return {
    cnpj: d.cnpj,
    razao_social: d.razao_social,
    nome_fantasia: d.nome_fantasia || null,
    situacao: d.situacao_cadastral,
    tipo: d.descricao_tipo_de_empresa,
    natureza_juridica: d.natureza_juridica,
    data_abertura: d.data_inicio_atividade,
    atividade_principal: d.cnae_fiscal_descricao,
    cnae_codigo: d.cnae_fiscal,
    capital_social: d.capital_social ? Number(d.capital_social) : null,
    email: d.email || null,
    telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1}) ${d.telefone_1 || ""}`.trim() : null,
    logradouro: [d.logradouro, d.numero, d.complemento].filter(Boolean).join(", "),
    bairro: d.bairro,
    municipio: d.municipio,
    uf: d.uf,
    cep: d.cep,
    qsa: (d.qsa || []).map((s) => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio,
      percentual_capital: s.percentual_capital_social ?? null,
      data_entrada: s.data_entrada_sociedade ?? null,
    })),
    fonte: "Minha Receita (dados Receita Federal)",
  };
}

// ─── GET /prospeccao-revendedores/cnpj/:cnpj ─────────────────────────────────
// Consulta dados completos de um CNPJ (BrasilAPI → fallback ReceitaWS)
// APIs gratuitas: BrasilAPI sem limite documentado; ReceitaWS: 3 req/min

router.get("/cnpj/:cnpj", requireRole("admin"), async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return res.status(400).json({ error: "CNPJ inválido. Informe 14 dígitos numéricos." });
  }

  // ── BrasilAPI (primária) ──────────────────────────────────────────────────
  try {
    const { signal: sig1, clear: clr1 } = makeTimeoutSignal(15_000);
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "User-Agent": "TKookies-ERP/1.0 (prospecção comercial)" },
      signal: sig1,
    });
    clr1();

    if (resp.status === 404) {
      return res.status(404).json({ error: "CNPJ não encontrado na Receita Federal." });
    }

    if (resp.status === 429) {
      // Tenta fallback antes de retornar erro de limite
      return await consultarReceitaWS(cnpj, res);
    }

    if (!resp.ok) {
      return await consultarReceitaWS(cnpj, res);
    }

    const d = await resp.json();
    return res.json(formatarBrasilAPI(d));
  } catch (err) {
    console.warn("BrasilAPI falhou, tentando ReceitaWS:", err.message);
    return await consultarReceitaWS(cnpj, res);
  }
});

async function consultarReceitaWS(cnpj, res) {
  try {
    const { signal: sig2, clear: clr2 } = makeTimeoutSignal(15_000);
    const resp = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { "User-Agent": "TKookies-ERP/1.0" },
      signal: sig2,
    });
    clr2();

    if (resp.status === 429) {
      return res.status(429).json({
        error: "Limite de consultas gratuitas atingido (ReceitaWS: 3 req/min). Aguarde 1 minuto e tente novamente.",
      });
    }
    if (resp.status === 404) {
      return res.status(404).json({ error: "CNPJ não encontrado na Receita Federal." });
    }
    if (!resp.ok) {
      throw new Error(`ReceitaWS retornou ${resp.status}`);
    }

    const d = await resp.json();
    if (d.status === "ERROR") {
      return res.status(404).json({ error: d.message || "CNPJ não encontrado." });
    }

    return res.json(formatarReceitaWS(d));
  } catch (err) {
    console.error("ReceitaWS falhou:", err.message);
    return res.status(502).json({
      error: "Não foi possível consultar a Receita Federal no momento.",
      detalhe: err.message,
    });
  }
}

function formatarBrasilAPI(d) {
  return {
    cnpj: d.cnpj,
    razao_social: d.razao_social,
    nome_fantasia: d.nome_fantasia || null,
    situacao: d.descricao_situacao_cadastral,
    tipo: d.descricao_tipo_de_empresa,
    natureza_juridica: d.natureza_juridica,
    data_abertura: d.data_inicio_atividade,
    atividade_principal: d.cnae_fiscal_descricao,
    cnae_codigo: d.cnae_fiscal,
    capital_social: d.capital_social ? Number(d.capital_social) : null,
    email: d.email || null,
    telefone: d.ddd_telefone_1
      ? `(${d.ddd_telefone_1}) ${d.telefone_1 || ""}`.trim()
      : null,
    logradouro: [d.logradouro, d.numero, d.complemento].filter(Boolean).join(", "),
    bairro: d.bairro,
    municipio: d.municipio,
    uf: d.uf,
    cep: d.cep,
    qsa: (d.qsa || []).map((s) => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio,
      percentual_capital: s.percentual_capital_social ?? null,
      data_entrada: s.data_entrada_sociedade ?? null,
    })),
    fonte: "BrasilAPI (dados Receita Federal)",
  };
}

function formatarReceitaWS(d) {
  const capStr = (d.capital_social || "0").replace(/\./g, "").replace(",", ".");
  return {
    cnpj: d.cnpj,
    razao_social: d.nome,
    nome_fantasia: d.fantasia || null,
    situacao: d.situacao,
    tipo: d.tipo,
    natureza_juridica: d.natureza_juridica,
    data_abertura: d.abertura,
    atividade_principal: d.atividade_principal?.[0]?.text || null,
    cnae_codigo: d.atividade_principal?.[0]?.code || null,
    capital_social: parseFloat(capStr) || null,
    email: d.email || null,
    telefone: d.telefone || null,
    logradouro: [d.logradouro, d.numero, d.complemento].filter(Boolean).join(", "),
    bairro: d.bairro,
    municipio: d.municipio,
    uf: d.uf,
    cep: d.cep,
    qsa: (d.qsa || []).map((s) => ({
      nome: s.nome,
      qualificacao: s.qual,
      percentual_capital: null,
      data_entrada: null,
    })),
    fonte: "ReceitaWS (dados Receita Federal – fallback)",
  };
}

// ─── POST /prospeccao-revendedores/analisar ───────────────────────────────────
// Envia lista de empresas para o Groq AI e recebe análise + temperatura ajustada
// Limite de tokens: envia no máximo 30 empresas por vez

router.post("/analisar", requireRole("admin"), async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada no servidor." });
  }

  const { empresas } = req.body;
  if (!Array.isArray(empresas) || empresas.length === 0) {
    return res.status(400).json({ error: "Envie uma lista de empresas para análise." });
  }

  const amostra = empresas.slice(0, 30);

  const listaTexto = amostra
    .map(
      (e, i) =>
        `${i + 1}. Nome: ${e.nome} | Tipo: ${e.tipo_label || e.tipo_osm} | Cidade: ${e.cidade || "?"} | Distância: ${e.distancia_km ?? "?"}km`
    )
    .join("\n");

  const prompt = `Você é um especialista em desenvolvimento de canais de distribuição para uma marca artesanal de cookies premium chamada TKookies, localizada em Três de Maio, RS.

Os cookies da TKookies são produtos artesanais de alta qualidade, ideais para revenda em estabelecimentos que valorizam produtos diferenciados para seus clientes.

Analise a lista abaixo de potenciais pontos de revenda encontrados em um raio de 50km de Três de Maio, RS, e para cada empresa:
1. Atribua uma TEMPERATURA de prospecção: QUENTE (80-100), MORNO (55-79), AQUECENDO (40-54) ou FRIO (0-39)
2. Justifique brevemente (1 linha)
3. Sugira uma abordagem comercial específica (1 linha)

CRITÉRIOS:
- QUENTE: Padarias, confeitarias, casas de doces, cafés premium — naturalmente vendem produtos similares e têm clientela certa
- MORNO: Cafeterias, lanchonetes, delicatessens — podem adicionar cookies como produto complementar
- AQUECENDO: Mercadinhos, conveniências, restaurantes — possível, mas requer mais convencimento
- FRIO: Supermercados grandes, fast food de rede — difícil ou inviável

EMPRESAS:
${listaTexto}

Responda APENAS com um JSON válido neste formato (sem markdown, sem texto fora do JSON):
{
  "analises": [
    {
      "indice": 1,
      "temperatura": "QUENTE",
      "score": 88,
      "justificativa": "Padaria com público fiel ao produto artesanal",
      "abordagem": "Oferecer mix degustação com 3 sabores + proposta de consignação"
    }
  ],
  "resumo": "Texto com insights gerais sobre o mercado na região em 2-3 frases"
}`;

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.3,
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";

    // Remove possíveis blocos de código do JSON retornado
    const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const resultado = JSON.parse(jsonStr);

    res.json(resultado);
  } catch (err) {
    console.error("Erro análise IA:", err.message);
    res.status(500).json({
      error: "Falha na análise com IA.",
      detalhe: err.message,
    });
  }
});

export default router;
