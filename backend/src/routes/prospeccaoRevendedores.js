import { Router } from "express";
import { pool } from "../db/index.js";
import { requireRole } from "../middlewares/auth.js";
import Groq from "groq-sdk";

const router = Router();

// Coordenadas padrão: Três de Maio, RS
const DEFAULT_LAT = -27.7847;
const DEFAULT_LNG = -54.2394;
const RAIO_METROS = 50_000; // 50 km

// Tipos OSM mapeados para descrições em português
const TIPO_MAP = {
  bakery: "Padaria",
  pastry: "Pastelaria / Confeitaria",
  confectionery: "Casa de Doces",
  chocolate: "Chocolateria",
  cake: "Bolo / Doceria",
  cafe: "Café",
  fast_food: "Lanchonete",
  deli: "Delicatessen",
  restaurant: "Restaurante",
  supermarket: "Supermercado",
  convenience: "Mercearia / Conveniência",
  coffee: "Cafeteria",
  tea: "Casa de Chá",
  ice_cream: "Sorveteria",
  dairy: "Laticínios",
  alcohol: "Bebidas",
};

// ─── Regras de temperatura (score 0-100) ─────────────────────────────────────

const SCORE_POR_TIPO = {
  bakery: 92,
  pastry: 90,
  confectionery: 90,
  chocolate: 88,
  cake: 87,
  cafe: 68,
  coffee: 65,
  tea: 60,
  ice_cream: 58,
  deli: 55,
  convenience: 50,
  fast_food: 48,
  dairy: 45,
  restaurant: 38,
  supermarket: 42,
};

const PALAVRAS_QUENTES = [
  "padaria", "confeit", "doce", "bolo", "biscoito", "cookie", "pão",
  "panific", "pastel", "recheado", "torta", "chocolate", "brigadeiro",
  "açaí", "sorvet", "guloseima", "doceria",
];

const PALAVRAS_MORNAS = [
  "café", "coffee", "lanche", "empório", "mercado", "mercearia",
  "cafeteria", "snack", "bar ", "quitanda", "mini market",
];

function calcularTemperatura(tags) {
  const tipo = (tags.shop || tags.amenity || "").toLowerCase();
  const nome = (tags.name || "").toLowerCase();

  let score = SCORE_POR_TIPO[tipo] ?? 30;

  if (PALAVRAS_QUENTES.some((p) => nome.includes(p))) score = Math.min(100, score + 12);
  else if (PALAVRAS_MORNAS.some((p) => nome.includes(p))) score = Math.min(100, score + 5);

  if (score >= 80) return { nivel: "QUENTE", emoji: "🔥", cor: "#C62828", label: "Quente", score };
  if (score >= 55) return { nivel: "MORNO", emoji: "🟡", cor: "#E65100", label: "Morno", score };
  if (score >= 40) return { nivel: "AQUECENDO", emoji: "🌤️", cor: "#F9A825", label: "Aquecendo", score };
  return { nivel: "FRIO", emoji: "❄️", cor: "#1565C0", label: "Frio", score };
}

// ─── Cálculo de distância Haversine ──────────────────────────────────────────

function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// Helper: AbortSignal com timeout compatível com Node 16+
function makeTimeoutSignal(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error(`Timeout após ${ms}ms`)), ms);
  const clear = () => clearTimeout(id);
  return { signal: controller.signal, clear };
}

// ─── GET /prospeccao-revendedores/buscar ─────────────────────────────────────
// Busca empresas no OpenStreetMap via Overpass API dentro do raio definido

router.get("/buscar", requireRole("admin"), async (req, res) => {
  // Tenta buscar coordenadas da TKookies nas configurações
  let lat = DEFAULT_LAT;
  let lng = DEFAULT_LNG;

  try {
    const [rows] = await pool.query(
      "SELECT chave, valor FROM configuracoes WHERE chave IN ('lat_tkookies', 'lng_tkookies')"
    );
    const configLat = rows.find((r) => r.chave === "lat_tkookies");
    const configLng = rows.find((r) => r.chave === "lng_tkookies");
    if (configLat) lat = parseFloat(configLat.valor);
    if (configLng) lng = parseFloat(configLng.valor);
  } catch {
    // Usa coordenadas padrão se a tabela/coluna não existir
  }

  // Query Overpass simplificada — apenas nodes para resposta mais rápida
  const overpassQuery = `[out:json][timeout:25];
(
  node["shop"~"bakery|pastry|confectionery|chocolate|cake|deli|convenience|coffee|supermarket"](around:${RAIO_METROS},${lat},${lng});
  node["amenity"~"cafe|fast_food|ice_cream"](around:${RAIO_METROS},${lat},${lng});
  way["shop"~"bakery|pastry|confectionery|cafe"](around:${RAIO_METROS},${lat},${lng});
  way["amenity"~"cafe|fast_food"](around:${RAIO_METROS},${lat},${lng});
);
out body center;`;

  const { signal, clear } = makeTimeoutSignal(30_000);
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal,
    });
    clear();

    if (!response.ok) {
      throw new Error(`Overpass API retornou ${response.status}`);
    }

    const data = await response.json();

    const empresas = data.elements
      .filter((el) => el.tags?.name)
      .map((el) => {
        const tags = el.tags || {};
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        const tipo = tags.shop || tags.amenity || "outro";
        const temperatura = calcularTemperatura(tags);
        const dist = elLat && elLng ? distanciaKm(lat, lng, elLat, elLng) : null;

        return {
          osm_id: el.id,
          nome: tags.name,
          tipo_osm: tipo,
          tipo_label: TIPO_MAP[tipo] || tipo,
          cidade: tags["addr:city"] || tags["addr:municipality"] || null,
          bairro: tags["addr:suburb"] || tags["addr:quarter"] || null,
          logradouro: tags["addr:street"]
            ? `${tags["addr:street"]}${tags["addr:housenumber"] ? ", " + tags["addr:housenumber"] : ""}`
            : null,
          telefone: tags.phone || tags["contact:phone"] || null,
          website: tags.website || tags["contact:website"] || null,
          email: tags.email || tags["contact:email"] || null,
          cnpj: tags["ref:CNPJ"] || tags.cnpj || null,
          lat: elLat,
          lng: elLng,
          distancia_km: dist,
          temperatura,
          dados_receita: null, // preenchido quando o usuário consulta o CNPJ
        };
      })
      .sort((a, b) => {
        // Ordena: temperatura desc, depois distância asc
        if (b.temperatura.score !== a.temperatura.score)
          return b.temperatura.score - a.temperatura.score;
        return (a.distancia_km ?? 999) - (b.distancia_km ?? 999);
      });

    res.json({
      empresas,
      total: empresas.length,
      raio_km: RAIO_METROS / 1000,
      origem: { lat, lng, cidade: "Três de Maio, RS" },
      aviso_limite:
        "BrasilAPI: gratuita, sem limite documentado. ReceitaWS: 3 req/min no plano gratuito. Consulte CNPJs com moderação.",
    });
  } catch (err) {
    clear();
    console.error("Erro Overpass API:", err.message);
    res.status(500).json({
      error: "Falha ao consultar o OpenStreetMap.",
      detalhe: err.message,
    });
  }
});

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
