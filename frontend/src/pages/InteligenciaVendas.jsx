import { useState, useRef, useEffect } from "react";
import { Box, Button, Container, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import { AutoAwesome, Refresh } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";

const BASE_URL = import.meta.env.VITE_API_URL || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3333'
    : window.VITE_API_URL || 'https://backend-gules-chi.vercel.app'
);

export default function InteligenciaVendas() {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [texto]);

  async function gerarAnalise() {
    setTexto("");
    setErro(null);
    setLoading(true);

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

  return (
    <Container maxWidth="lg">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#4E342E' }}>
            <AutoAwesome sx={{ mr: 1, color: '#E65100', verticalAlign: 'middle' }} />
            Inteligência de Vendas
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Análise automática com IA — últimos 30 dias
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <AutoAwesome />}
          onClick={gerarAnalise}
          disabled={loading}
          sx={{ bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' }, borderRadius: 3, px: 3 }}
        >
          {loading ? "Analisando..." : texto ? "Reanalisar" : "Gerar Análise"}
        </Button>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro(null)}>
          {erro}
          {erro.includes("ANTHROPIC_API_KEY") && (
            <Typography variant="body2" mt={1}>
              Adicione a variável <strong>ANTHROPIC_API_KEY</strong> nas configurações do backend no Vercel.
            </Typography>
          )}
        </Alert>
      )}

      {!texto && !loading && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#FFF8F0', border: '2px dashed #FFCC80' }}>
          <AutoAwesome sx={{ fontSize: 56, color: '#FFCC80', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#4E342E' }} gutterBottom>
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
            sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' }, borderRadius: 50, px: 4 }}
          >
            Gerar Análise Agora
          </Button>
        </Paper>
      )}

      {(texto || loading) && (
        <Paper
          ref={scrollRef}
          sx={{
            p: { xs: 2, md: 4 },
            borderRadius: 3,
            bgcolor: '#FFFDF9',
            border: '1px solid rgba(78,52,46,0.08)',
            maxHeight: '75vh',
            overflowY: 'auto',
            lineHeight: 1.8,
          }}
        >
          {loading && !texto && (
            <Box display="flex" alignItems="center" gap={2} color="text.secondary">
              <CircularProgress size={20} sx={{ color: '#E65100' }} />
              <Typography>A IA está analisando seus dados...</Typography>
            </Box>
          )}

          <Box sx={{
            '& h1,h2,h3': { color: '#4E342E', mt: 3, mb: 1 },
            '& strong': { color: '#3E2723' },
            '& blockquote': {
              borderLeft: '4px solid #E65100',
              pl: 2, ml: 0, my: 2,
              color: '#5D4037',
              fontStyle: 'italic',
              bgcolor: '#FFF3E0',
              py: 1, pr: 2, borderRadius: '0 8px 8px 0'
            },
            '& table': { borderCollapse: 'collapse', width: '100%', my: 2 },
            '& th': { bgcolor: '#4E342E', color: 'white', p: '8px 12px', textAlign: 'left' },
            '& td': { borderBottom: '1px solid #f0ebe8', p: '6px 12px' },
            '& tr:nth-of-type(even) td': { bgcolor: '#FFF8F0' },
            '& ul,ol': { pl: 3 },
            '& li': { mb: 0.5 },
            '& hr': { border: 'none', borderTop: '1px dashed #FFCC80', my: 2 },
          }}>
            <ReactMarkdown>{texto}</ReactMarkdown>
          </Box>

          {loading && texto && (
            <Box display="flex" alignItems="center" gap={1} mt={2} color="text.secondary">
              <CircularProgress size={14} sx={{ color: '#E65100' }} />
              <Typography variant="caption">Continuando análise...</Typography>
            </Box>
          )}
        </Paper>
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
