import { useState } from "react";
import {
  Box, Button, Container, Typography, Paper, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Collapse, Tooltip, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress, Divider, Stack,
  InputAdornment, ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import {
  Search, AutoAwesome, ExpandMore, ExpandLess, Business,
  Phone, LocationOn, OpenInNew, Info, FilterList, Refresh, TravelExplore, AddBusiness,
} from "@mui/icons-material";

const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:3333"
      : window.VITE_API_URL || "https://backend-gules-chi.vercel.app"
  )
).replace(/\/$/, "");

// Coordenadas da TKookies — Três de Maio, RS
const TKOOKIES_LAT = -27.7847;
const TKOOKIES_LNG = -54.2394;
const RAIO_METROS = 50_000;

// Mirrors Overpass testados e confirmados — chamados diretamente do browser
const OVERPASS_MIRRORS = [
  "https://lz4.overpass-api.de/api/interpreter",   // ~1.5s ✓
  "https://z.overpass-api.de/api/interpreter",      // ~1.5s ✓
  "https://overpass-api.de/api/interpreter",        // ~2.7s ✓ (fallback)
];

// Bounding box de 50km ao redor de Três de Maio, RS
// bbox = [sul, oeste, norte, leste]  (1°lat ≈ 111km; 1°lon ≈ 99km a -27°)
const BBOX = {
  S: (TKOOKIES_LAT - 0.45).toFixed(4),
  N: (TKOOKIES_LAT + 0.45).toFixed(4),
  W: (TKOOKIES_LNG - 0.51).toFixed(4),
  E: (TKOOKIES_LNG + 0.51).toFixed(4),
};

const TIPO_MAP = {
  bakery: "Padaria", pastry: "Pastelaria / Confeitaria",
  confectionery: "Casa de Doces", chocolate: "Chocolateria",
  cake: "Doceria / Bolos", cafe: "Café", fast_food: "Lanchonete",
  deli: "Delicatessen", convenience: "Mercearia / Conveniência",
  coffee: "Cafeteria", ice_cream: "Sorveteria", supermarket: "Supermercado",
};

const SCORE_POR_TIPO = {
  bakery: 92, pastry: 90, confectionery: 90, chocolate: 88, cake: 87,
  cafe: 68, coffee: 65, ice_cream: 58, deli: 55, convenience: 50,
  fast_food: 48, supermarket: 42,
};

const PALAVRAS_QUENTES = ["padaria","confeit","doce","bolo","biscoito","cookie","pão","panific","pastel","torta","chocolate","brigadeiro","doceria"];
const PALAVRAS_MORNAS  = ["café","coffee","lanche","empório","mercado","mercearia","cafeteria"];

function calcularTemperatura(tags) {
  const tipo = (tags.shop || tags.amenity || "").toLowerCase();
  const nome = (tags.name || "").toLowerCase();
  let score = SCORE_POR_TIPO[tipo] ?? 30;
  if (PALAVRAS_QUENTES.some((p) => nome.includes(p))) score = Math.min(100, score + 12);
  else if (PALAVRAS_MORNAS.some((p) => nome.includes(p))) score = Math.min(100, score + 5);
  if (score >= 80) return { nivel: "QUENTE",    emoji: "🔥", cor: "#C62828", label: "Quente",    score };
  if (score >= 55) return { nivel: "MORNO",     emoji: "🟡", cor: "#E65100", label: "Morno",     score };
  if (score >= 40) return { nivel: "AQUECENDO", emoji: "🌤️", cor: "#F9A825", label: "Aquecendo", score };
  return             { nivel: "FRIO",       emoji: "❄️", cor: "#1565C0", label: "Frio",       score };
}

function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
}

function mapearElemento(el) {
  const tags = el.tags || {};
  const elLat = el.lat ?? el.center?.lat;
  const elLng = el.lon ?? el.center?.lon;
  const tipo  = tags.shop || tags.amenity || "outro";
  return {
    osm_id: el.id,
    nome: tags.name,
    tipo_osm: tipo,
    tipo_label: TIPO_MAP[tipo] || tipo,
    cidade: tags["addr:city"] || tags["addr:municipality"] || null,
    bairro: tags["addr:suburb"] || null,
    logradouro: tags["addr:street"] ? `${tags["addr:street"]}${tags["addr:housenumber"] ? ", "+tags["addr:housenumber"] : ""}` : null,
    telefone: tags.phone || tags["contact:phone"] || null,
    website: tags.website || tags["contact:website"] || null,
    email: tags.email || tags["contact:email"] || null,
    cnpj: tags["ref:CNPJ"] || tags.cnpj || null,
    lat: elLat, lng: elLng,
    distancia_km: elLat && elLng ? distanciaKm(TKOOKIES_LAT, TKOOKIES_LNG, elLat, elLng) : null,
    temperatura: calcularTemperatura(tags),
    dados_receita: null,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem("cookie_erp_token");
  return { Authorization: `Bearer ${token}` };
}

function formatarCNPJ(cnpj) {
  const d = (cnpj || "").replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatarCapital(valor) {
  if (!valor) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const TEMP_STYLE = {
  QUENTE:    { bgcolor: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" },
  MORNO:     { bgcolor: "#FFF3E0", color: "#E65100", border: "1px solid #FFE0B2" },
  AQUECENDO: { bgcolor: "#FFFDE7", color: "#F57F17", border: "1px solid #FFF9C4" },
  FRIO:      { bgcolor: "#E3F2FD", color: "#1565C0", border: "1px solid #BBDEFB" },
};

function TemperaturaChip({ temp }) {
  const style = TEMP_STYLE[temp.nivel] || TEMP_STYLE.FRIO;
  return (
    <Chip
      label={`${temp.emoji} ${temp.label}`}
      size="small"
      sx={{ fontWeight: 700, fontSize: "0.72rem", ...style }}
    />
  );
}

function QSAPanel({ qsa, capitalSocial }) {
  if (!qsa || qsa.length === 0) return <Typography variant="body2" color="text.secondary">QSA não disponível.</Typography>;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
        Capital Social: {formatarCapital(capitalSocial)}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: "#4E342E" }}>Sócio / Administrador</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#4E342E" }}>Qualificação</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#4E342E" }}>% Capital</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#4E342E" }}>Entrada</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {qsa.map((s, i) => (
            <TableRow key={i}>
              <TableCell>{s.nome || "—"}</TableCell>
              <TableCell>{s.qualificacao || "—"}</TableCell>
              <TableCell>{s.percentual_capital != null ? `${s.percentual_capital}%` : "—"}</TableCell>
              <TableCell>{s.data_entrada || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function EmpresaRow({ empresa, onConsultarCNPJ, aiAnalise }) {
  const [expandida, setExpandida] = useState(false);
  const [cnpjInput, setCnpjInput] = useState(empresa.cnpj || "");
  const [consultando, setConsultando] = useState(false);
  const [dados, setDados] = useState(empresa.dados_receita || null);
  const [erro, setErro] = useState(null);

  const temp = aiAnalise ? {
    ...empresa.temperatura,
    nivel: aiAnalise.temperatura,
    label: aiAnalise.temperatura.charAt(0) + aiAnalise.temperatura.slice(1).toLowerCase(),
    score: aiAnalise.score,
    emoji: { QUENTE: "🔥", MORNO: "🟡", AQUECENDO: "🌤️", FRIO: "❄️" }[aiAnalise.temperatura] || "❓",
  } : empresa.temperatura;

  async function consultarCNPJ(cnpj) {
    setConsultando(true);
    setErro(null);
    try {
      const res = await fetch(`${BASE_URL}/prospeccao-revendedores/cnpj/${cnpj}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao consultar CNPJ.");
      setDados(json);
      onConsultarCNPJ(empresa.osm_id, json);
      setExpandida(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setConsultando(false);
    }
  }

  async function handleConsultarCNPJ() {
    const cnpj = cnpjInput.replace(/\D/g, "");
    if (cnpj.length !== 14) { setErro("CNPJ inválido (14 dígitos)."); return; }
    await consultarCNPJ(cnpj);
  }

  async function handleConsultarCNPJDireto(cnpj) {
    if (consultando) return;
    await consultarCNPJ(cnpj);
  }

  const enderecoDisplay = dados?.logradouro
    ? `${dados.logradouro}${dados.bairro ? ", " + dados.bairro : ""} — ${dados.municipio}/${dados.uf}`
    : [empresa.logradouro, empresa.bairro, empresa.cidade].filter(Boolean).join(", ") || "—";

  const telefoneDisplay = dados?.telefone || empresa.telefone || "—";
  const responsavelDisplay = dados?.qsa?.[0]?.nome || "—";

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: "pointer", "& td": { borderBottom: expandida ? "none" : undefined } }}
        onClick={() => setExpandida((v) => !v)}
      >
        {/* Temperatura */}
        <TableCell sx={{ minWidth: 120 }}>
          <TemperaturaChip temp={temp} />
          {aiAnalise && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Score: {aiAnalise.score}
            </Typography>
          )}
        </TableCell>

        {/* Nome / Tipo */}
        <TableCell>
          <Typography fontWeight={700} variant="body2">{empresa.nome}</Typography>
          <Typography variant="caption" color="text.secondary">{empresa.tipo_label}</Typography>
          {dados?.nome_fantasia && dados.nome_fantasia !== empresa.nome && (
            <Typography variant="caption" color="text.secondary" display="block">
              Fantasia: {dados.nome_fantasia}
            </Typography>
          )}
        </TableCell>

        {/* CNPJ */}
        <TableCell sx={{ minWidth: 170 }}>
          {dados ? (
            <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
              {formatarCNPJ(dados.cnpj)}
            </Typography>
          ) : (
            <Box onClick={(e) => e.stopPropagation()}>
              <Box display="flex" gap={0.5} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Digite o CNPJ"
                  value={cnpjInput}
                  onChange={(e) => {
                    // Aceita só dígitos, máximo 14
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                    setCnpjInput(digits);
                    // Auto-dispara consulta quando completa 14 dígitos
                    if (digits.length === 14) {
                      setTimeout(() => {
                        const cnpj = digits;
                        if (cnpj.length === 14) handleConsultarCNPJDireto(cnpj);
                      }, 300);
                    }
                  }}
                  sx={{ width: 150, "& input": { fontSize: "0.78rem", py: 0.5 } }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Business fontSize="small" /></InputAdornment>,
                  }}
                />
                <Tooltip title="Consultar Receita Federal">
                  <span>
                    <IconButton size="small" onClick={handleConsultarCNPJ} disabled={consultando} sx={{ color: "#4E342E" }}>
                      {consultando ? <CircularProgress size={16} /> : <Search fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Buscar CNPJ desta empresa no Google">
                  <IconButton
                    size="small"
                    sx={{ color: "#1976D2" }}
                    onClick={() => {
                      const q = encodeURIComponent(`"${empresa.nome}" ${empresa.cidade || "RS"} CNPJ`);
                      window.open(`https://www.google.com/search?q=${q}`, "_blank");
                    }}
                  >
                    <TravelExplore fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              {cnpjInput.length > 0 && cnpjInput.length < 14 && (
                <Typography variant="caption" color="text.secondary">{cnpjInput.length}/14 dígitos</Typography>
              )}
              {erro && <Typography variant="caption" color="error" display="block">{erro}</Typography>}
            </Box>
          )}
          {!dados && !erro && null}
        </TableCell>

        {/* Razão Social */}
        <TableCell>
          <Typography variant="body2">
            {dados?.razao_social || "—"}
          </Typography>
          {dados?.situacao && (
            <Chip
              label={dados.situacao}
              size="small"
              sx={{
                mt: 0.5,
                fontSize: "0.65rem",
                bgcolor: dados.situacao === "ATIVA" ? "#E8F5E9" : "#FFEBEE",
                color: dados.situacao === "ATIVA" ? "#2E7D32" : "#C62828",
                fontWeight: 700,
              }}
            />
          )}
        </TableCell>

        {/* Responsável */}
        <TableCell>
          <Typography variant="body2">{responsavelDisplay}</Typography>
        </TableCell>

        {/* Cidade / Distância */}
        <TableCell>
          <Box display="flex" alignItems="center" gap={0.5}>
            <LocationOn fontSize="small" sx={{ color: "#8D6E63" }} />
            <Typography variant="body2">
              {dados?.municipio || empresa.cidade || "—"}
              {empresa.distancia_km != null && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {" "}({empresa.distancia_km} km)
                </Typography>
              )}
            </Typography>
          </Box>
        </TableCell>

        {/* Telefone */}
        <TableCell>
          <Box display="flex" alignItems="center" gap={0.5}>
            {telefoneDisplay !== "—" && <Phone fontSize="small" sx={{ color: "#8D6E63" }} />}
            <Typography variant="body2">{telefoneDisplay}</Typography>
          </Box>
        </TableCell>

        {/* Expand */}
        <TableCell>
          <IconButton size="small">
            {expandida ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Linha expandida — detalhes + QSA + Abordagem IA */}
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, bgcolor: "#FFFDF9" }}>
          <Collapse in={expandida} timeout="auto" unmountOnExit>
            <Box p={2} display="flex" gap={3} flexWrap="wrap">
              {/* Dados Receita Federal */}
              {dados && (
                <Box flex={1} minWidth={280}>
                  <Typography variant="subtitle2" fontWeight={700} color="#4E342E" gutterBottom>
                    📋 Dados Receita Federal
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="caption"><b>Atividade:</b> {dados.atividade_principal || "—"}</Typography>
                    <Typography variant="caption"><b>Natureza Jurídica:</b> {dados.natureza_juridica || "—"}</Typography>
                    <Typography variant="caption"><b>Abertura:</b> {dados.data_abertura || "—"}</Typography>
                    <Typography variant="caption"><b>Endereço:</b> {enderecoDisplay}</Typography>
                    <Typography variant="caption"><b>CEP:</b> {dados.cep || "—"}</Typography>
                    {dados.email && <Typography variant="caption"><b>E-mail:</b> {dados.email}</Typography>}
                    <Typography variant="caption" color="text.disabled"><i>Fonte: {dados.fonte}</i></Typography>
                  </Stack>
                </Box>
              )}

              {/* QSA */}
              {dados?.qsa && dados.qsa.length > 0 && (
                <Box flex={2} minWidth={340}>
                  <Typography variant="subtitle2" fontWeight={700} color="#4E342E" gutterBottom>
                    👥 Quadro de Sócios e Administradores (QSA)
                  </Typography>
                  <QSAPanel qsa={dados.qsa} capitalSocial={dados.capital_social} />
                </Box>
              )}

              {/* Sugestão IA */}
              {aiAnalise && (
                <Box flex={1} minWidth={240} bgcolor="#FFF3E0" borderRadius={2} p={1.5}>
                  <Typography variant="subtitle2" fontWeight={700} color="#E65100" gutterBottom>
                    🤖 Análise da IA
                  </Typography>
                  <Typography variant="body2" mb={1}>{aiAnalise.justificativa}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" fontWeight={700} color="#4E342E">Abordagem sugerida:</Typography>
                  <Typography variant="body2" color="text.secondary">{aiAnalise.abordagem}</Typography>
                </Box>
              )}

              {/* Sem dados ainda */}
              {!dados && !aiAnalise && (
                <Typography variant="body2" color="text.secondary">
                  Informe o CNPJ e clique em 🔍 para carregar os dados da Receita Federal.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ProspeccaoRevendedores() {
  const [empresas, setEmpresas] = useState([]);
  const [aiAnalises, setAiAnalises] = useState({});
  const [resumoIA, setResumoIA] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjProgresso, setCnpjProgresso] = useState({ atual: 0, total: 0 });
  const [erro, setErro] = useState(null);
  const [erroIA, setErroIA] = useState(null);
  const [filtroTemp, setFiltroTemp] = useState("TODOS");
  const [apenasComCNPJ, setApenasComCNPJ] = useState(false);
  const [ordenacao, setOrdenacao] = useState("temperatura"); // "temperatura" | "distancia"
  const [buscaText, setBuscaText] = useState("");
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addNome, setAddNome] = useState("");
  const [addCNPJ, setAddCNPJ] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addErro, setAddErro] = useState("");

  async function buscarEmpresas() {
    setLoading(true);
    setErro(null);
    setEmpresas([]);
    setAiAnalises({});
    setResumoIA("");

    try {
      // Chama o backend como proxy para evitar CORS da Overpass API
      const res = await fetch(`${BASE_URL}/prospeccao-revendedores/buscar`, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(35_000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const json = await res.json();
      const lista = json.empresas || [];
      setEmpresas(lista);
      setLoading(false);
      buscarCNPJsAutomatico(lista);
    } catch (e) {
      setErro(`Não foi possível carregar estabelecimentos: ${e.message}`);
      setLoading(false);
    }
  }

  // Adiciona empresa manualmente — busca CNPJ por nome ou usa CNPJ informado
  async function adicionarManual() {
    if (!addNome.trim() && !addCNPJ.trim()) {
      setAddErro("Informe o nome da empresa ou o CNPJ."); return;
    }
    setAddLoading(true);
    setAddErro("");

    try {
      let cnpj = addCNPJ.replace(/\D/g, "");
      let dados = null;

      // Se tem CNPJ → consulta direto na Receita Federal
      if (cnpj.length === 14) {
        const res = await fetch(`${BASE_URL}/prospeccao-revendedores/cnpj/${cnpj}`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "CNPJ não encontrado.");
        dados = json;
      } else if (addNome.trim()) {
        // Sem CNPJ → busca por nome
        const params = new URLSearchParams({ nome: addNome.trim(), uf: "RS" });
        const res = await fetch(`${BASE_URL}/prospeccao-revendedores/buscar-cnpj?${params}`, { headers: authHeaders() });
        const json = await res.json();
        if (json.cnpj) {
          cnpj = json.cnpj;
          dados = json.dados;
        } else {
          throw new Error(json.erro || "Empresa não encontrada. Tente informar o CNPJ diretamente.");
        }
      } else {
        throw new Error("CNPJ deve ter 14 dígitos.");
      }

      // Monta entrada manual com osm_id único negativo para não conflitar
      const novaEmpresa = {
        osm_id: -(Date.now()),
        nome: dados?.razao_social || addNome.trim(),
        tipo_osm: "manual",
        tipo_label: dados?.atividade_principal ? dados.atividade_principal.slice(0, 40) : "Adicionado manualmente",
        cidade: dados?.municipio || null,
        bairro: dados?.bairro || null,
        logradouro: dados?.logradouro || null,
        telefone: dados?.telefone || null,
        cnpj,
        lat: TKOOKIES_LAT, lng: TKOOKIES_LNG, distancia_km: 0,
        temperatura: calcularTemperatura({ name: dados?.razao_social || addNome, shop: "bakery" }),
        dados_receita: dados,
      };

      // Recalcula temperatura por CNAE se disponível
      if (dados?.atividade_principal) {
        const cnaeDesc = dados.atividade_principal.toLowerCase();
        if (cnaeDesc.includes("panif") || cnaeDesc.includes("padaria") || cnaeDesc.includes("confeit") || cnaeDesc.includes("biscoito") || cnaeDesc.includes("doce")) {
          novaEmpresa.temperatura = { nivel: "QUENTE", emoji: "🔥", cor: "#C62828", label: "Quente", score: 95 };
        } else if (cnaeDesc.includes("café") || cnaeDesc.includes("lanche") || cnaeDesc.includes("restaurante")) {
          novaEmpresa.temperatura = { nivel: "MORNO", emoji: "🟡", cor: "#E65100", label: "Morno", score: 65 };
        }
      }

      setEmpresas(prev => [novaEmpresa, ...prev]);
      setAddDialogOpen(false);
      setAddNome("");
      setAddCNPJ("");
    } catch (e) {
      setAddErro(e.message);
    } finally {
      setAddLoading(false);
    }
  }

  // Busca CNPJ automaticamente para as top empresas (rate: 1/15s)
  async function buscarCNPJsAutomatico(lista) {
    const alvo = lista.slice(0, 20); // máximo 20 para não estourar rate limit
    setLoadingCNPJ(true);
    setCnpjProgresso({ atual: 0, total: alvo.length });

    for (let i = 0; i < alvo.length; i++) {
      const empresa = alvo[i];
      // Pula se já tem CNPJ consultado
      if (empresa.dados_receita) { setCnpjProgresso(p => ({ ...p, atual: i + 1 })); continue; }

      try {
        const params = new URLSearchParams({ nome: empresa.nome, uf: "RS" });
        const res = await fetch(`${BASE_URL}/prospeccao-revendedores/buscar-cnpj?${params}`, {
          headers: authHeaders(),
        });
        const json = await res.json();

        if (json.cnpj) {
          setEmpresas(prev => prev.map(e =>
            e.osm_id === empresa.osm_id
              ? { ...e, cnpj: json.cnpj, dados_receita: json.dados || null }
              : e
          ));
        }
      } catch { /* ignora erros individuais */ }

      setCnpjProgresso({ atual: i + 1, total: alvo.length });

      // Aguarda 15s entre requisições para respeitar rate limit
      if (i < alvo.length - 1) await new Promise(r => setTimeout(r, 15_000));
    }
    setLoadingCNPJ(false);
  }

  async function analisarComIA() {
    if (empresas.length === 0) return;
    setLoadingIA(true);
    setErroIA(null);
    try {
      const res = await fetch(`${BASE_URL}/prospeccao-revendedores/analisar`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ empresas: empresas.slice(0, 30) }),
        signal: AbortSignal.timeout(60_000),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro na análise com IA.");

      const mapaAnalises = {};
      (json.analises || []).forEach((a) => {
        const empresa = empresas[a.indice - 1];
        if (empresa) mapaAnalises[empresa.osm_id] = a;
      });
      setAiAnalises(mapaAnalises);
      setResumoIA(json.resumo || "");

      // Reordena empresas conforme score da IA
      setEmpresas((prev) =>
        [...prev].sort((a, b) => {
          const sa = mapaAnalises[a.osm_id]?.score ?? a.temperatura.score;
          const sb = mapaAnalises[b.osm_id]?.score ?? b.temperatura.score;
          return sb - sa;
        })
      );
    } catch (e) {
      setErroIA(e.message || "Falha na análise com IA.");
    } finally {
      setLoadingIA(false);
    }
  }

  function handleCNPJConsultado(osmId, dadosReceita) {
    setEmpresas((prev) =>
      prev.map((e) => (e.osm_id === osmId ? { ...e, dados_receita: dadosReceita } : e))
    );
  }

  // Filtragem e ordenação
  const empresasFiltradas = empresas
    .filter((e) => {
      const tempMatch = filtroTemp === "TODOS" || (aiAnalises[e.osm_id]?.temperatura || e.temperatura.nivel) === filtroTemp;
      const textMatch = buscaText === "" ||
        e.nome.toLowerCase().includes(buscaText.toLowerCase()) ||
        (e.cidade || e.dados_receita?.municipio || "").toLowerCase().includes(buscaText.toLowerCase()) ||
        (e.tipo_label || "").toLowerCase().includes(buscaText.toLowerCase());
      const cnpjMatch = !apenasComCNPJ || e.cnpj || e.dados_receita;
      return tempMatch && textMatch && cnpjMatch;
    })
    .sort((a, b) => {
      if (ordenacao === "distancia") return (a.distancia_km ?? 999) - (b.distancia_km ?? 999);
      const sa = aiAnalises[a.osm_id]?.score ?? a.temperatura.score;
      const sb = aiAnalises[b.osm_id]?.score ?? b.temperatura.score;
      return sb - sa || (a.distancia_km ?? 999) - (b.distancia_km ?? 999);
    });

  const contagem = {
    QUENTE: empresas.filter((e) => (aiAnalises[e.osm_id]?.temperatura || e.temperatura.nivel) === "QUENTE").length,
    MORNO: empresas.filter((e) => (aiAnalises[e.osm_id]?.temperatura || e.temperatura.nivel) === "MORNO").length,
    AQUECENDO: empresas.filter((e) => (aiAnalises[e.osm_id]?.temperatura || e.temperatura.nivel) === "AQUECENDO").length,
    FRIO: empresas.filter((e) => (aiAnalises[e.osm_id]?.temperatura || e.temperatura.nivel) === "FRIO").length,
  };

  return (
    <Container maxWidth="xl">
      {/* Cabeçalho */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#4E342E" }}>
            🗺️ Prospecção de Revendedores
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Potenciais revendedores num raio de 50 km de Três de Maio, RS — dados via OpenStreetMap + Receita Federal
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Tooltip title="Como funciona?">
            <IconButton onClick={() => setInfoDialogOpen(true)} sx={{ color: "#8D6E63" }}>
              <Info />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={loadingIA ? <CircularProgress size={16} /> : <AutoAwesome />}
            onClick={analisarComIA}
            disabled={empresas.length === 0 || loadingIA || loading}
            sx={{ borderColor: "#E65100", color: "#E65100" }}
          >
            {loadingIA ? "Analisando com IA..." : "Analisar com IA"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddBusiness />}
            onClick={() => { setAddDialogOpen(true); setAddErro(""); }}
            sx={{ borderColor: "#4E342E", color: "#4E342E" }}
          >
            Adicionar Empresa
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} sx={{ color: "white" }} /> : <Search />}
            onClick={buscarEmpresas}
            disabled={loading}
            sx={{ bgcolor: "#4E342E", "&:hover": { bgcolor: "#3E2723" } }}
          >
            {loading ? "Buscando..." : empresas.length > 0 ? "Atualizar Busca" : "Buscar Empresas"}
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1, bgcolor: "#FFF3E0", "& .MuiLinearProgress-bar": { bgcolor: "#E65100" } }} />}

      {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>{erro}</Alert>}
      {erroIA && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setErroIA(null)}>{erroIA}</Alert>}

      {/* Resumo IA */}
      {resumoIA && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: "#FFF8F0", border: "1px solid #FFCC80", borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} color="#E65100" gutterBottom>
            🤖 Resumo da Análise IA
          </Typography>
          <Typography variant="body2">{resumoIA}</Typography>
        </Paper>
      )}

      {/* Cards de contagem */}
      {empresas.length > 0 && (
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          {[
            { nivel: "QUENTE", emoji: "🔥", label: "Quentes", style: TEMP_STYLE.QUENTE },
            { nivel: "MORNO", emoji: "🟡", label: "Mornos", style: TEMP_STYLE.MORNO },
            { nivel: "AQUECENDO", emoji: "🌤️", label: "Aquecendo", style: TEMP_STYLE.AQUECENDO },
            { nivel: "FRIO", emoji: "❄️", label: "Frios", style: TEMP_STYLE.FRIO },
          ].map((item) => (
            <Paper
              key={item.nivel}
              sx={{
                p: 1.5,
                minWidth: 110,
                textAlign: "center",
                cursor: "pointer",
                ...item.style,
                border: filtroTemp === item.nivel ? "2px solid currentColor" : item.style.border,
                opacity: filtroTemp !== "TODOS" && filtroTemp !== item.nivel ? 0.5 : 1,
              }}
              onClick={() => setFiltroTemp((v) => (v === item.nivel ? "TODOS" : item.nivel))}
            >
              <Typography fontSize="1.4rem">{item.emoji}</Typography>
              <Typography fontWeight={700} fontSize="1.3rem">{contagem[item.nivel]}</Typography>
              <Typography variant="caption">{item.label}</Typography>
            </Paper>
          ))}
          <Paper sx={{ p: 1.5, minWidth: 110, textAlign: "center", cursor: "pointer", opacity: filtroTemp !== "TODOS" ? 0.6 : 1 }}
            onClick={() => setFiltroTemp("TODOS")}>
            <Typography fontSize="1.4rem">🏪</Typography>
            <Typography fontWeight={700} fontSize="1.3rem">{empresas.length}</Typography>
            <Typography variant="caption">Total</Typography>
          </Paper>
        </Box>
      )}

      {/* Progresso busca CNPJ */}
      {loadingCNPJ && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={16} sx={{ color: "#2E7D32" }} />
            <Typography variant="body2" color="#2E7D32" fontWeight={700}>
              Buscando CNPJs automaticamente... {cnpjProgresso.atual}/{cnpjProgresso.total}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(cnpjProgresso.atual / cnpjProgresso.total) * 100}
              sx={{ flex: 1, borderRadius: 1, bgcolor: "#C8E6C9", "& .MuiLinearProgress-bar": { bgcolor: "#2E7D32" } }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            ⏱ Respeitando limite da API gratuita (1 consulta/15s) — aguarde até {Math.ceil((cnpjProgresso.total - cnpjProgresso.atual) * 15 / 60)} min
          </Typography>
        </Paper>
      )}

      {/* Filtros e ordenação */}
      {empresas.length > 0 && (
        <Box mb={2} display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Filtrar por nome, cidade ou tipo..."
            value={buscaText}
            onChange={(e) => setBuscaText(e.target.value)}
            sx={{ minWidth: 260 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><FilterList fontSize="small" /></InputAdornment>,
            }}
          />
          <Button
            size="small"
            variant={ordenacao === "temperatura" ? "contained" : "outlined"}
            onClick={() => setOrdenacao("temperatura")}
            sx={{ bgcolor: ordenacao === "temperatura" ? "#4E342E" : undefined, color: ordenacao === "temperatura" ? "white" : "#4E342E", borderColor: "#4E342E" }}
          >
            🔥 Por Temperatura
          </Button>
          <Button
            size="small"
            variant={ordenacao === "distancia" ? "contained" : "outlined"}
            onClick={() => setOrdenacao("distancia")}
            sx={{ bgcolor: ordenacao === "distancia" ? "#4E342E" : undefined, color: ordenacao === "distancia" ? "white" : "#4E342E", borderColor: "#4E342E" }}
          >
            📍 Por Distância
          </Button>
          <Button
            size="small"
            variant={apenasComCNPJ ? "contained" : "outlined"}
            onClick={() => setApenasComCNPJ(v => !v)}
            sx={{ bgcolor: apenasComCNPJ ? "#1565C0" : undefined, color: apenasComCNPJ ? "white" : "#1565C0", borderColor: "#1565C0" }}
          >
            🏢 Apenas com CNPJ
          </Button>
          <Typography variant="caption" color="text.secondary">
            {empresasFiltradas.length} de {empresas.length} empresas
          </Typography>
        </Box>
      )}

      {/* Estado vazio */}
      {!loading && empresas.length === 0 && (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3, bgcolor: "#FFF8F0", border: "2px dashed #FFCC80" }}>
          <Typography fontSize="3rem">🗺️</Typography>
          <Typography variant="h6" sx={{ color: "#4E342E" }} gutterBottom>
            Encontre seus próximos revendedores
          </Typography>
          <Typography color="text.secondary" mb={3} maxWidth={480} mx="auto">
            A busca varre um raio de 50 km de Três de Maio, RS no OpenStreetMap e retorna padarias,
            confeitarias, cafés e outros estabelecimentos com potencial para revender os cookies da TKookies.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Search />}
            onClick={buscarEmpresas}
            sx={{ bgcolor: "#E65100", "&:hover": { bgcolor: "#BF360C" }, borderRadius: 50, px: 4 }}
          >
            Iniciar Prospecção
          </Button>
        </Paper>
      )}

      {/* Tabela */}
      {empresasFiltradas.length > 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#4E342E" }}>
                {["Temperatura", "Nome / Tipo", "CNPJ", "Razão Social", "Responsável", "Cidade", "Telefone", ""].map((h) => (
                  <TableCell key={h} sx={{ color: "white", fontWeight: 700, py: 1.5 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {empresasFiltradas.map((empresa) => (
                <EmpresaRow
                  key={empresa.osm_id}
                  empresa={empresa}
                  onConsultarCNPJ={handleCNPJConsultado}
                  aiAnalise={aiAnalises[empresa.osm_id] || null}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog — Adicionar empresa manualmente */}
      <Dialog open={addDialogOpen} onClose={() => !addLoading && setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#4E342E", color: "white" }}>
          <AddBusiness sx={{ mr: 1, verticalAlign: "middle" }} />
          Adicionar Empresa à Prospecção
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
              Informe o <b>nome</b> da empresa e/ou o <b>CNPJ</b>. O sistema busca os dados automaticamente na Receita Federal.
            </Alert>
            <TextField
              label="Nome da empresa"
              placeholder="Ex: Padaria São Francisco"
              value={addNome}
              onChange={e => setAddNome(e.target.value)}
              fullWidth
              onKeyDown={e => e.key === "Enter" && adicionarManual()}
            />
            <TextField
              label="CNPJ (opcional — preencher agiliza a busca)"
              placeholder="00.000.000/0001-00"
              value={addCNPJ}
              onChange={e => setAddCNPJ(e.target.value.replace(/\D/g, "").slice(0, 14))}
              fullWidth
              inputProps={{ maxLength: 14 }}
              helperText={addCNPJ.length > 0 ? `${addCNPJ.length}/14 dígitos` : ""}
              onKeyDown={e => e.key === "Enter" && adicionarManual()}
            />
            {addErro && <Alert severity="error">{addErro}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} disabled={addLoading} sx={{ color: "#8D6E63" }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={adicionarManual}
            disabled={addLoading || (!addNome.trim() && !addCNPJ.trim())}
            startIcon={addLoading ? <CircularProgress size={16} sx={{ color: "white" }} /> : <Search />}
            sx={{ bgcolor: "#4E342E", "&:hover": { bgcolor: "#3E2723" } }}
          >
            {addLoading ? "Buscando..." : "Buscar e Adicionar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog informativo */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#4E342E", color: "white" }}>
          ℹ️ Como funciona a Prospecção
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <Box>
              <Typography fontWeight={700} color="#4E342E">🗺️ Busca Geográfica</Typography>
              <Typography variant="body2">
                Usa o <b>OpenStreetMap via Overpass API</b> (gratuito, sem limite). Encontra estabelecimentos
                cadastrados no mapa no raio de 50 km de Três de Maio, RS.
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={700} color="#4E342E">🏢 Consulta CNPJ</Typography>
              <Typography variant="body2">
                Utiliza a <b>BrasilAPI</b> (gratuita, dados da Receita Federal) como fonte primária,
                com fallback para <b>ReceitaWS</b> (3 consultas/minuto no plano gratuito).
                Traz razão social, QSA e capital social.
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={700} color="#4E342E">🔥 Indicador de Temperatura</Typography>
              <Typography variant="body2">
                <b>Quente (🔥):</b> Padarias, confeitarias, casas de doces — clientes naturais.<br />
                <b>Morno (🟡):</b> Cafés, lanchonetes — boa oportunidade.<br />
                <b>Aquecendo (🌤️):</b> Mercearias, conveniências — possível.<br />
                <b>Frio (❄️):</b> Restaurantes, supermercados grandes — difícil.
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={700} color="#4E342E">🤖 Análise com IA</Typography>
              <Typography variant="body2">
                Usa o <b>Groq (Llama 3.3 70B)</b> para aprimorar os scores e sugerir abordagens comerciais
                personalizadas para cada estabelecimento (analisa até 30 por vez).
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)} sx={{ color: "#4E342E" }}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
