import { useState, useRef, useEffect, useMemo } from "react";
import { Box, Button, Container, Typography, Paper, CircularProgress, Alert, IconButton, Tooltip } from "@mui/material";
import { AutoAwesome, Refresh, ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const BASE_URL = (import.meta.env.VITE_API_URL || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3333'
    : window.VITE_API_URL || 'https://backend-gules-chi.vercel.app'
)).replace(/\/$/, '');

function parsearBlocos(texto) {
  const linhas = texto.split('\n');
  const blocos = [];
  let tituloAtual = 'Resumo Geral';
  let linhasAtual = [];
  let temBlocos = false;

  for (const linha of linhas) {
    if (/^#{1,3}\s/.test(linha)) {
      if (linhasAtual.length > 0 || temBlocos) {
        blocos.push({ titulo: tituloAtual, conteudo: linhasAtual.join('\n').trim() });
      }
      tituloAtual = linha.replace(/^#{1,3}\s+/, '').trim();
      linhasAtual = [];
      temBlocos = true;
    } else {
      linhasAtual.push(linha);
    }
  }
  // último bloco
  if (linhasAtual.length > 0 || temBlocos) {
    blocos.push({ titulo: tituloAtual, conteudo: linhasAtual.join('\n').trim() });
  }
  // se não encontrou nenhum heading, retorna texto inteiro como um bloco
  if (blocos.length === 0) {
    blocos.push({ titulo: 'Análise Completa', conteudo: texto });
  }
  return blocos;
}

function nomeCortoBloco(titulo, idx) {
  // Tenta extrair nome curto após o " — " ou usa primeiras palavras
  const partes = titulo.split(' — ');
  if (partes.length > 1) {
    return partes[1].replace(/^(BLOCO \d+ —?\s*)/i, '').trim().split(' ').slice(0, 3).join(' ');
  }
  return titulo.replace(/^[🏆🍪📅🏭💰⚠️\s]+/, '').split(' ').slice(0, 3).join(' ');
}

const ESPRESSO = '#2C1810';
const TERRACOTTA = '#C8531B';
const CREAM = '#FBF6EC';

const markdownSx = {
  '& h1,& h2,& h3': { color: ESPRESSO, mt: 3, mb: 1 },
  '& strong': { color: ESPRESSO },
  '& blockquote': {
    borderLeft: `4px solid ${TERRACOTTA}`,
    pl: 2, ml: 0, my: 2,
    color: '#5D4037',
    fontStyle: 'italic',
    bgcolor: '#FFF8E1',
    py: 1, pr: 2, borderRadius: '0 8px 8px 0'
  },
  '& table': { borderCollapse: 'collapse', width: '100%', my: 2 },
  '& th': { bgcolor: ESPRESSO, color: 'white', p: '8px 12px', textAlign: 'left' },
  '& td': { borderBottom: '1px solid #f0ebe8', p: '6px 12px' },
  '& tr:nth-of-type(even) td': { bgcolor: '#FFF8F0' },
  '& ul,& ol': { pl: 3 },
  '& li': { mb: 0.5 },
  '& hr': { border: 'none', borderTop: '1px dashed #FFCC80', my: 2 },
};

export default function InteligenciaVendas() {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [blocoAtual, setBlocoAtual] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (loading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [texto, loading]);

  const blocos = useMemo(() => {
    if (loading || !texto) return [];
    return parsearBlocos(texto);
  }, [texto, loading]);

  async function gerarAnalise() {
    setTexto("");
    setErro(null);
    setLoading(true);
    setBlocoAtual(0);

    const token = localStorage.getItem("cookie_erp_token");
    if (!token) {
      setErro("Você precisa estar logado como administrador.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/inteligencia-vendas`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || "Erro ao conectar ao servidor.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // guarda linha incompleta

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { setLoading(false); return; }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) { setErro(parsed.error); setLoading(false); return; }
            if (parsed.text) setTexto(prev => prev + parsed.text);
          } catch {}
        }
      }
    } catch (err) {
      setErro(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const mostrarPaginado = !loading && blocos.length > 0;

  return (
    <Container maxWidth="lg">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: ESPRESSO }}>
            <AutoAwesome sx={{ mr: 1, color: TERRACOTTA, verticalAlign: 'middle' }} />
            Inteligência de Vendas
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Análise automática com IA — últimos 90 dias
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <AutoAwesome />}
          onClick={gerarAnalise}
          disabled={loading}
          sx={{ bgcolor: ESPRESSO, '&:hover': { bgcolor: '#1a0e09' }, borderRadius: 3, px: 3 }}
        >
          {loading ? "Analisando..." : texto ? "Reanalisar" : "Gerar Análise"}
        </Button>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro(null)}>
          {erro}
          {erro.includes("GROQ_API_KEY") && (
            <Typography variant="body2" mt={1}>
              Adicione a variável <strong>GROQ_API_KEY</strong> nas configurações do backend no Vercel.
            </Typography>
          )}
        </Alert>
      )}

      {/* Estado inicial — nenhum texto */}
      {!texto && !loading && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: CREAM, border: '2px dashed #FFCC80' }}>
          <AutoAwesome sx={{ fontSize: 56, color: '#FFCC80', mb: 2 }} />
          <Typography variant="h6" sx={{ color: ESPRESSO }} gutterBottom>
            Sua análise inteligente está a um clique
          </Typography>
          <Typography color="text.secondary" mb={3}>
            A IA vai analisar clientes, produtos, tendências e sugerir ações concretas para a próxima semana.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AutoAwesome />}
            onClick={gerarAnalise}
            sx={{ bgcolor: TERRACOTTA, '&:hover': { bgcolor: '#a3421a' }, borderRadius: 50, px: 4 }}
          >
            Gerar Análise Agora
          </Button>
        </Paper>
      )}

      {/* View de streaming — enquanto loading */}
      {(texto || loading) && !mostrarPaginado && (
        <Paper
          ref={scrollRef}
          sx={{
            p: { xs: 2, md: 4 },
            borderRadius: 3,
            bgcolor: '#FFFDF9',
            border: '1px solid rgba(44,24,16,0.08)',
            maxHeight: '75vh',
            overflowY: 'auto',
            lineHeight: 1.8,
          }}
        >
          {loading && !texto && (
            <Box display="flex" alignItems="center" gap={2} color="text.secondary">
              <CircularProgress size={20} sx={{ color: TERRACOTTA }} />
              <Typography>A IA está analisando seus dados...</Typography>
            </Box>
          )}

          <Box sx={markdownSx}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
          </Box>

          {loading && texto && (
            <Box display="flex" alignItems="center" gap={1} mt={2} color="text.secondary">
              <CircularProgress size={14} sx={{ color: TERRACOTTA }} />
              <Typography variant="caption">Continuando análise...</Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* View paginada por blocos — após loading terminar */}
      {mostrarPaginado && (
        <Box>
          {/* Tabs de blocos */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 1,
              mb: 2,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(44,24,16,0.2)', borderRadius: 2 },
            }}
          >
            {blocos.map((bloco, idx) => (
              <Box
                key={idx}
                onClick={() => setBlocoAtual(idx)}
                sx={{
                  flexShrink: 0,
                  cursor: 'pointer',
                  px: 2,
                  py: 0.75,
                  borderRadius: '999px',
                  bgcolor: idx === blocoAtual ? TERRACOTTA : 'rgba(0,0,0,0.08)',
                  color: idx === blocoAtual ? 'white' : ESPRESSO,
                  fontWeight: idx === blocoAtual ? 700 : 500,
                  fontSize: '0.78rem',
                  transition: 'all 0.18s',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: idx === blocoAtual ? '#a3421a' : 'rgba(0,0,0,0.14)',
                  },
                }}
              >
                <span style={{ opacity: 0.7, marginRight: 4 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                {nomeCortoBloco(bloco.titulo, idx)}
              </Box>
            ))}
          </Box>

          {/* Conteúdo do bloco atual */}
          <Paper
            sx={{
              p: { xs: 2, md: 4 },
              borderRadius: 3,
              bgcolor: '#FFFDF9',
              border: '1px solid rgba(44,24,16,0.08)',
              maxHeight: '60vh',
              overflowY: 'auto',
              lineHeight: 1.8,
            }}
          >
            <Box sx={markdownSx}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {`### ${blocos[blocoAtual]?.titulo}\n\n${blocos[blocoAtual]?.conteudo}`}
              </ReactMarkdown>
            </Box>
          </Paper>

          {/* Navegação prev/next */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mt={2}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackIos fontSize="small" />}
              onClick={() => setBlocoAtual(i => Math.max(0, i - 1))}
              disabled={blocoAtual === 0}
              sx={{
                borderRadius: 50,
                borderColor: TERRACOTTA,
                color: TERRACOTTA,
                '&:hover': { bgcolor: 'rgba(200,83,27,0.06)' },
                '&.Mui-disabled': { borderColor: 'rgba(0,0,0,0.12)' },
              }}
            >
              Anterior
            </Button>

            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {blocoAtual + 1} de {blocos.length}
            </Typography>

            <Button
              variant="outlined"
              endIcon={<ArrowForwardIos fontSize="small" />}
              onClick={() => setBlocoAtual(i => Math.min(blocos.length - 1, i + 1))}
              disabled={blocoAtual === blocos.length - 1}
              sx={{
                borderRadius: 50,
                borderColor: TERRACOTTA,
                color: TERRACOTTA,
                '&:hover': { bgcolor: 'rgba(200,83,27,0.06)' },
                '&.Mui-disabled': { borderColor: 'rgba(0,0,0,0.12)' },
              }}
            >
              Próximo
            </Button>
          </Box>
        </Box>
      )}

      {texto && !loading && (
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button startIcon={<Refresh />} onClick={gerarAnalise} sx={{ color: '#8D6E63' }}>
            Reanalisar
          </Button>
        </Box>
      )}
    </Container>
  );
}
