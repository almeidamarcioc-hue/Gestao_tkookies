import { useState, useEffect } from "react";
import api from "../services/api";
import {
  Box, Button, TextField, Typography, Paper, Container, IconButton, InputAdornment, Grid, Checkbox, FormControlLabel, FormGroup, Switch, Divider, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, CircularProgress, Tooltip,
} from "@mui/material";
import { CloudUpload, Delete, Add, LocalOffer, CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox } from "@mui/icons-material";
import { APP_VERSION, CHANGELOG } from "../version";
import DebugLogs from "../components/DebugLogs";
import TestimonialsManager from "../components/TestimonialsManager";

export default function Settings() {
  const [homeTitle, setHomeTitle] = useState("");
  const [homeSubtitle, setHomeSubtitle] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [homeBg, setHomeBg] = useState("");
  const [valorFrete, setValorFrete] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixName, setPixName] = useState("");
  const [pixCity, setPixCity] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [instagramHashtag, setInstagramHashtag] = useState("");
  const [saborSemanaProdutoId, setSaborSemanaProdutoId] = useState("");
  const [saborSemanaFim, setSaborSemanaFim] = useState("");
  const [pontosPorReal, setPontosPorReal] = useState("1");
  const [pontosParaDesconto, setPontosParaDesconto] = useState("100");
  const [listaProdutos, setListaProdutos] = useState([]);
  const [ocasioes, setOcasioes] = useState([
    { value: "aniversario", label: "Aniversário" },
    { value: "casamento", label: "Casamento" },
    { value: "namoro", label: "Presente Romântico" },
    { value: "natal", label: "Natal" },
    { value: "pascoa", label: "Páscoa" },
    { value: "dia_das_maes", label: "Dia das Mães" },
  ]);
  const [novaOcasiao, setNovaOcasiao] = useState("");
  const KIT_SIZES = [
    { qty: 4,  label: "Mini",   desc: "4 cookies" },
    { qty: 6,  label: "Média",  desc: "6 cookies" },
    { qty: 8,  label: "Grande", desc: "8 cookies" },
    { qty: 12, label: "Festa",  desc: "12 cookies" },
  ];
  const [kitDescontos, setKitDescontos] = useState({
    4:  { ativo: true,  tipo: 'percentual', valor: '' },
    6:  { ativo: true,  tipo: 'percentual', valor: '' },
    8:  { ativo: true,  tipo: 'percentual', valor: '' },
    12: { ativo: true,  tipo: 'percentual', valor: '' },
  });
  const [openingHours, setOpeningHours] = useState([
    { day: 0, label: "Domingo", open: false, open_time: "08:00", close_time: "18:00" },
    { day: 1, label: "Segunda", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 2, label: "Terça", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 3, label: "Quarta", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 4, label: "Quinta", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 5, label: "Sexta", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 6, label: "Sábado", open: true, open_time: "08:00", close_time: "18:00" },
  ]);

  // ─── Promoções em lote ──────────────────────────────────────────────────────
  const [promoDesconto, setPromoDesconto] = useState("");
  const [promoSelecionados, setPromoSelecionados] = useState([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null); // { type: "success"|"error", text }
  const [produtosComEstoque, setProdutosComEstoque] = useState([]);

  // Produtos com estoque para promoção (derivado de listaProdutos)
  useEffect(() => {
    const lista = (listaProdutos || []).filter(p => p.ativo && !p.eh_agregado && Number(p.estoque) > 0);
    setProdutosComEstoque(lista);
  }, [listaProdutos]);

  const promoTodos = produtosComEstoque.length > 0 && promoSelecionados.length === produtosComEstoque.length;
  const promoIndeterminate = promoSelecionados.length > 0 && !promoTodos;

  function togglePromoTodos() {
    if (promoTodos) setPromoSelecionados([]);
    else setPromoSelecionados(produtosComEstoque.map(p => p.id));
  }

  function togglePromoProduto(id) {
    setPromoSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function aplicarDesconto() {
    if (promoSelecionados.length === 0) { setPromoMsg({ type: "error", text: "Selecione ao menos um produto." }); return; }
    const pct = Number(promoDesconto);
    if (!pct || pct <= 0 || pct > 99) { setPromoMsg({ type: "error", text: "Informe um percentual entre 1 e 99." }); return; }
    setPromoLoading(true); setPromoMsg(null);
    try {
      const res = await api.patch("/produtos/bulk-desconto", { ids: promoSelecionados, desconto: pct, ativo: true });
      setPromoMsg({ type: "success", text: res.data.message });
      api.get("/produtos").then(r => setListaProdutos(r.data || []));
    } catch (e) {
      setPromoMsg({ type: "error", text: e.response?.data?.error || "Erro ao aplicar desconto." });
    } finally { setPromoLoading(false); }
  }

  async function removerDesconto() {
    if (promoSelecionados.length === 0) { setPromoMsg({ type: "error", text: "Selecione ao menos um produto." }); return; }
    setPromoLoading(true); setPromoMsg(null);
    try {
      const res = await api.patch("/produtos/bulk-desconto", { ids: promoSelecionados, desconto: 0, ativo: false });
      setPromoMsg({ type: "success", text: res.data.message });
      api.get("/produtos").then(r => setListaProdutos(r.data || []));
    } catch (e) {
      setPromoMsg({ type: "error", text: e.response?.data?.error || "Erro ao remover desconto." });
    } finally { setPromoLoading(false); }
  }

  // Estados para a página Sobre Nós
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutDesc, setAboutDesc] = useState("");
  const [aboutCard1Title, setAboutCard1Title] = useState("");
  const [aboutCard1Desc, setAboutCard1Desc] = useState("");
  const [aboutCard2Title, setAboutCard2Title] = useState("");
  const [aboutCard2Desc, setAboutCard2Desc] = useState("");
  const [aboutCard3Title, setAboutCard3Title] = useState("");
  const [aboutCard3Desc, setAboutCard3Desc] = useState("");
  const [aboutCtaTitle, setAboutCtaTitle] = useState("");
  const [aboutCtaDesc, setAboutCtaDesc] = useState("");

  useEffect(() => {
    api.get("/produtos").then(res => setListaProdutos(res.data || []));
    // Sempre busca direto do banco (não usa cache de sessão) para garantir dados atuais
    sessionStorage.removeItem('_cfg');
    api.get("/configuracoes").then(res => {
      const cfg = res.data;
      if (cfg) {
        setHomeTitle(cfg.home_title || "");
        setHomeSubtitle(cfg.home_subtitle || "");
        setHomeLocation(cfg.home_location || "");
        setHomeBg(cfg.home_bg || "");
        setValorFrete(cfg.valor_frete || "");
        setPixKey(cfg.pix_key || "");
        setPixName(cfg.pix_name || "");
        setPixCity(cfg.pix_city || "");
        setWhatsappNumber(cfg.whatsapp_number || "");
        setInstagramHandle(cfg.instagram_handle || "");
        setInstagramUrl(cfg.instagram_url || "");
        setInstagramHashtag(cfg.instagram_hashtag || "");
        setSaborSemanaProdutoId(cfg.sabor_semana_produto_id || "");
        setSaborSemanaFim(cfg.sabor_semana_fim || "");
        setPontosPorReal(cfg.pontos_por_real || "1");
        setPontosParaDesconto(cfg.pontos_para_desconto || "100");
        if (cfg.ocasioes) {
          try { setOcasioes(JSON.parse(cfg.ocasioes)); } catch (e) {}
        }
        if (cfg.kit_descontos) {
          try { setKitDescontos(prev => ({ ...prev, ...JSON.parse(cfg.kit_descontos) })); } catch (e) {}
        }

        const DEFAULT_HOURS = [
          { day: 0, label: "Domingo", open: false, open_time: "08:00", close_time: "18:00" },
          { day: 1, label: "Segunda", open: true,  open_time: "08:00", close_time: "18:00" },
          { day: 2, label: "Terça",   open: true,  open_time: "08:00", close_time: "18:00" },
          { day: 3, label: "Quarta",  open: true,  open_time: "08:00", close_time: "18:00" },
          { day: 4, label: "Quinta",  open: true,  open_time: "08:00", close_time: "18:00" },
          { day: 5, label: "Sexta",   open: true,  open_time: "08:00", close_time: "18:00" },
          { day: 6, label: "Sábado",  open: true,  open_time: "08:00", close_time: "18:00" },
        ];
        if (cfg.opening_hours) {
          try {
            const loaded = typeof cfg.opening_hours === 'string'
              ? JSON.parse(cfg.opening_hours)
              : cfg.opening_hours;
            // Garante todos os 7 dias: mescla dados salvos com os defaults
            const merged = DEFAULT_HOURS.map(def => {
              const saved = loaded.find(s => Number(s.day) === def.day);
              return saved ? { ...def, ...saved } : def;
            });
            setOpeningHours(merged);
          } catch (e) {
            console.error("Erro ao parsear opening_hours:", e);
            setOpeningHours(DEFAULT_HOURS);
          }
        } else if (cfg.open_days) {
          const days = cfg.open_days.split(',').map(Number);
          setOpeningHours(DEFAULT_HOURS.map(h => ({
            ...h,
            open: days.includes(h.day),
            open_time: cfg.open_time || "08:00",
            close_time: cfg.close_time || "18:00"
          })));
        }

        setAboutTitle(cfg.about_title || "Sobre a TKookies");
        setAboutDesc(cfg.about_desc || "Nascemos da paixão por criar momentos doces e inesquecíveis. Acreditamos que um cookie não é apenas uma sobremesa, é um abraço em forma de sabor.");
        setAboutCard1Title(cfg.about_card1_title || "Artesanal");
        setAboutCard1Desc(cfg.about_card1_desc || "Cada cookie é feito à mão, com ingredientes selecionados e muito carinho, garantindo a textura perfeita: crocante por fora e macio por dentro.");
        setAboutCard2Title(cfg.about_card2_title || "Qualidade");
        setAboutCard2Desc(cfg.about_card2_desc || "Não abrimos mão da excelência. Utilizamos chocolates nobres e ingredientes frescos para entregar a melhor experiência a cada mordida.");
        setAboutCard3Title(cfg.about_card3_title || "Comunidade");
        setAboutCard3Desc(cfg.about_card3_desc || "Mais do que clientes, temos amigos. Adoramos fazer parte das suas celebrações e do seu dia a dia em Três de Maio e região.");
        setAboutCtaTitle(cfg.about_cta_title || "Venha nos conhecer!");
        setAboutCtaDesc(cfg.about_cta_desc || "Estamos prontos para adoçar o seu dia. Faça seu pedido agora mesmo e sinta a diferença.");
      }
    });
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => setHomeBg(reader.result);
    }
  };

  const handleScheduleToggle = (idx) => {
    setOpeningHours(prev => prev.map((h, i) =>
      i === idx ? { ...h, open: !h.open } : h
    ));
  };

  const handleScheduleTimeChange = (idx, field, val) => {
    setOpeningHours(prev => prev.map((h, i) =>
      i === idx ? { ...h, [field]: val } : h
    ));
  };

  const handleSave = async () => {
    try {
      await api.post("/configuracoes", {
        home_title: homeTitle,
        home_subtitle: homeSubtitle,
        home_location: homeLocation,
        home_bg: homeBg,
        valor_frete: valorFrete,
        opening_hours: JSON.stringify(openingHours),
        // Mantém as chaves antigas para compatibilidade se necessário
        open_time: openingHours.find(h => h.open)?.open_time || "08:00",
        close_time: openingHours.find(h => h.open)?.close_time || "18:00",
        open_days: openingHours.filter(h => h.open).map(h => h.day).join(','),

        about_title: aboutTitle,
        about_desc: aboutDesc,
        about_card1_title: aboutCard1Title,
        about_card1_desc: aboutCard1Desc,
        about_card2_title: aboutCard2Title,
        about_card2_desc: aboutCard2Desc,
        about_card3_title: aboutCard3Title,
        about_card3_desc: aboutCard3Desc,
        about_cta_title: aboutCtaTitle,
        about_cta_desc: aboutCtaDesc,
        pix_key: pixKey,
        pix_name: pixName,
        pix_city: pixCity,
        whatsapp_number: whatsappNumber,
        instagram_handle: instagramHandle,
        instagram_url: instagramUrl,
        instagram_hashtag: instagramHashtag,
        sabor_semana_produto_id: saborSemanaProdutoId,
        sabor_semana_fim: saborSemanaFim,
        pontos_por_real: pontosPorReal,
        pontos_para_desconto: pontosParaDesconto,
        ocasioes: JSON.stringify(ocasioes),
        kit_descontos: JSON.stringify(kitDescontos)
      });
      // Limpa caches para que todas as páginas recarreguem do banco na próxima visita
      sessionStorage.removeItem('_cfg');
      // Confirma leitura do banco para verificar que o dado foi salvo
      const verify = await api.get("/configuracoes");
      const savedHours = verify.data.opening_hours;
      if (savedHours) {
        const parsed = JSON.parse(savedHours);
        setOpeningHours(parsed);
      }
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert("Erro ao salvar: " + (err.response?.data?.error || err.message));
    }
  };

  const handleVerifyDb = async () => {
    try {
      const res = await api.get("/configuracoes/migrate");
      alert(JSON.stringify(res.data, null, 2));
    } catch (err) {
      alert("Erro ao verificar banco: " + (err.response?.data?.details || err.message));
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">Configurações do Sistema</Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>Personalização da Home</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField 
              label="Título Principal" 
              fullWidth 
              value={homeTitle} 
              onChange={e => setHomeTitle(e.target.value)} 
              placeholder="Ex: TK🍪🍪kies (Use emojis se desejar)"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              label="Subtítulo" 
              fullWidth 
              value={homeSubtitle} 
              onChange={e => setHomeSubtitle(e.target.value)} 
              placeholder="Ex: Um pedacinho de felicidade..."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              label="Texto de Rodapé / Localização" 
              fullWidth 
              value={homeLocation} 
              onChange={e => setHomeLocation(e.target.value)} 
              placeholder="Ex: Apenas delivery / Três de Maio - RS"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Grade de Horários por Dia</Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              {openingHours.map((h, idx) => (
                <Box key={h.day} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: idx === 6 ? 0 : 2, flexWrap: 'wrap' }}>
                  <Typography sx={{ width: 80, fontWeight: 'bold' }}>{h.label}</Typography>
                  <FormControlLabel
                    control={<Switch checked={h.open} onChange={() => handleScheduleToggle(idx)} color="primary" />}
                    label={h.open ? "Aberto" : "Fechado"}
                    sx={{ width: 120 }}
                  />
                  <TextField 
                    disabled={!h.open}
                    type="time" 
                    size="small" 
                    value={h.open_time} 
                    onChange={(e) => handleScheduleTimeChange(idx, 'open_time', e.target.value)} 
                  />
                  <Typography>até</Typography>
                  <TextField 
                    disabled={!h.open}
                    type="time" 
                    size="small" 
                    value={h.close_time} 
                    onChange={(e) => handleScheduleTimeChange(idx, 'close_time', e.target.value)} 
                  />
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <TextField 
              label="Valor do Frete (Entrega)" 
              fullWidth 
              type="number"
              value={valorFrete} 
              onChange={e => setValorFrete(e.target.value)} 
              placeholder="0.00"
              InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>Contato</Typography>
            <TextField
              label="Número do WhatsApp"
              fullWidth
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="Ex: 5555997312557 (DDI+DDD+número, sem espaços)"
              helperText="Usado no link de contato quando a loja está fechada"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>Configurações de PIX</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Chave PIX"
                  fullWidth
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  helperText="Esta chave será usada para gerar o QR Code de pagamento"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nome do Recebedor"
                  fullWidth
                  value={pixName}
                  onChange={e => setPixName(e.target.value)}
                  placeholder="Ex: TKOOKIES"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Cidade do Recebedor"
                  fullWidth
                  value={pixCity}
                  onChange={e => setPixCity(e.target.value)}
                  placeholder="Ex: TRES DE MAIO"
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" mb={1}>Imagem de Fundo</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              {homeBg && (
                <Box 
                  component="img" 
                  src={homeBg} 
                  sx={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 1, border: '1px solid #ddd' }} 
                />
              )}
              <Button component="label" variant="outlined" startIcon={<CloudUpload />}>
                Carregar Imagem
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
              {homeBg && (
                <IconButton color="error" onClick={() => setHomeBg("")}><Delete /></IconButton>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" mb={2}>Personalização da Página Sobre Nós</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField label="Título Principal" fullWidth value={aboutTitle} onChange={e => setAboutTitle(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Descrição Principal" multiline rows={3} fullWidth value={aboutDesc} onChange={e => setAboutDesc(e.target.value)} />
          </Grid>
          
          <Grid item xs={12}><Typography variant="subtitle2" fontWeight="bold">Card 1 (Esquerda)</Typography></Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Título Card 1" fullWidth value={aboutCard1Title} onChange={e => setAboutCard1Title(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField label="Texto Card 1" fullWidth value={aboutCard1Desc} onChange={e => setAboutCard1Desc(e.target.value)} />
          </Grid>

          <Grid item xs={12}><Typography variant="subtitle2" fontWeight="bold">Card 2 (Centro)</Typography></Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Título Card 2" fullWidth value={aboutCard2Title} onChange={e => setAboutCard2Title(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField label="Texto Card 2" fullWidth value={aboutCard2Desc} onChange={e => setAboutCard2Desc(e.target.value)} />
          </Grid>

          <Grid item xs={12}><Typography variant="subtitle2" fontWeight="bold">Card 3 (Direita)</Typography></Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Título Card 3" fullWidth value={aboutCard3Title} onChange={e => setAboutCard3Title(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField label="Texto Card 3" fullWidth value={aboutCard3Desc} onChange={e => setAboutCard3Desc(e.target.value)} />
          </Grid>

          <Grid item xs={12}><Typography variant="subtitle2" fontWeight="bold">Chamada para Ação (Final)</Typography></Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Título CTA" fullWidth value={aboutCtaTitle} onChange={e => setAboutCtaTitle(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField label="Texto CTA" fullWidth value={aboutCtaDesc} onChange={e => setAboutCtaDesc(e.target.value)} />
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" size="large" onClick={handleSave}>
              Salvar Configurações
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Instagram / Redes Sociais */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" mb={2}>Redes Sociais (Instagram)</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Handle (@usuario)"
              fullWidth
              value={instagramHandle}
              onChange={e => setInstagramHandle(e.target.value)}
              placeholder="Ex: tkookies"
              helperText="Sem o @"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="URL do Perfil"
              fullWidth
              value={instagramUrl}
              onChange={e => setInstagramUrl(e.target.value)}
              placeholder="Ex: https://instagram.com/tkookies"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Hashtag da Marca"
              fullWidth
              value={instagramHashtag}
              onChange={e => setInstagramHashtag(e.target.value)}
              placeholder="Ex: #tkookies"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleSave}>Salvar</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Sabor da Semana */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" mb={2}>Sabor da Semana</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              select
              label="Produto em Destaque"
              fullWidth
              value={saborSemanaProdutoId}
              onChange={e => setSaborSemanaProdutoId(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">-- Nenhum --</option>
              {listaProdutos.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Data de Encerramento"
              type="date"
              fullWidth
              value={saborSemanaFim}
              onChange={e => setSaborSemanaFim(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleSave}>Salvar</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Ocasiões — Presenteie com Amor */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" mb={1}>Ocasiões — "Presenteie com Amor"</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Defina as categorias de ocasião que aparecerão como filtros na loja.
          Vincule os produtos a estas ocasiões na edição de cada produto.
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {ocasioes.map((o, i) => (
            <Chip
              key={o.value}
              label={o.label}
              onDelete={() => setOcasioes(ocasioes.filter((_, idx) => idx !== i))}
              sx={{ fontWeight: 'bold' }}
            />
          ))}
          {ocasioes.length === 0 && (
            <Typography variant="caption" color="text.disabled">Nenhuma ocasião cadastrada.</Typography>
          )}
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <TextField
            label="Nova Ocasião"
            size="small"
            value={novaOcasiao}
            onChange={e => setNovaOcasiao(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && novaOcasiao.trim()) {
                const label = novaOcasiao.trim();
                const value = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
                if (!ocasioes.some(o => o.value === value)) {
                  setOcasioes([...ocasioes, { value, label }]);
                }
                setNovaOcasiao("");
              }
            }}
            placeholder="Ex: Dia dos Pais"
          />
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => {
              const label = novaOcasiao.trim();
              if (!label) return;
              const value = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
              if (!ocasioes.some(o => o.value === value)) {
                setOcasioes([...ocasioes, { value, label }]);
              }
              setNovaOcasiao("");
            }}
          >
            Adicionar
          </Button>
        </Box>
        <Box mt={2}>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </Box>
      </Paper>

      {/* Desconto por Tamanho de Kit */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" mb={1}>Configuração dos Kits — "Monte seu Kit"</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Ative os tamanhos de caixinha disponíveis e defina um desconto opcional para cada um.
          Apenas os tamanhos <strong>ativos</strong> aparecerão para o cliente.
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          {KIT_SIZES.map(s => {
            const kd = kitDescontos[s.qty] || { ativo: true, tipo: 'percentual', valor: '' };
            return (
              <Box key={s.qty} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                p: 2, borderRadius: 2, border: '1px solid rgba(44,24,16,0.10)',
                bgcolor: kd.ativo ? 'rgba(212,88,10,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <Box sx={{ minWidth: 100 }}>
                  <Typography fontWeight="bold">{s.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!kd.ativo}
                      onChange={e => setKitDescontos(prev => ({
                        ...prev,
                        [s.qty]: { ...kd, ativo: e.target.checked }
                      }))}
                      color="primary"
                    />
                  }
                  label={kd.ativo ? "Ativo" : "Inativo"}
                  sx={{ width: 100 }}
                />
                <TextField
                  select
                  label="Tipo"
                  size="small"
                  disabled={!kd.ativo}
                  value={kd.tipo || 'percentual'}
                  onChange={e => setKitDescontos(prev => ({
                    ...prev,
                    [s.qty]: { ...kd, tipo: e.target.value }
                  }))}
                  SelectProps={{ native: true }}
                  sx={{ width: 130 }}
                >
                  <option value="percentual">Percentual (%)</option>
                  <option value="fixo">Valor fixo (R$)</option>
                </TextField>
                <TextField
                  label={kd.tipo === 'fixo' ? "Desconto (R$)" : "Desconto (%)"}
                  size="small"
                  type="number"
                  disabled={!kd.ativo}
                  value={kd.valor}
                  onChange={e => setKitDescontos(prev => ({
                    ...prev,
                    [s.qty]: { ...kd, valor: e.target.value }
                  }))}
                  inputProps={{ min: 0, step: kd.tipo === 'fixo' ? 0.5 : 1 }}
                  sx={{ width: 150 }}
                  InputProps={kd.tipo === 'fixo'
                    ? { startAdornment: <InputAdornment position="start">R$</InputAdornment> }
                    : { endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  helperText="0 = sem desconto"
                />
              </Box>
            );
          })}
        </Box>
        <Box mt={2}>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </Box>
      </Paper>

      {/* Programa de Fidelidade */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" mb={2}>Programa de Fidelidade</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Pontos por R$ gasto"
              fullWidth
              type="number"
              value={pontosPorReal}
              onChange={e => setPontosPorReal(e.target.value)}
              helperText="Ex: 1 = 1 ponto a cada R$1,00"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Pontos para R$1,00 de desconto"
              fullWidth
              type="number"
              value={pontosParaDesconto}
              onChange={e => setPontosParaDesconto(e.target.value)}
              helperText="Ex: 100 = 100 pontos valem R$1,00"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleSave}>Salvar</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ─── Promoções / Descontos em Lote ─────────────────────────────────── */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LocalOffer sx={{ color: "#E65100" }} />
          <Typography variant="h6" fontWeight={700}>Promoções / Descontos</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Selecione os produtos com estoque disponível, informe o percentual e aplique a promoção.
          O preço original aparece riscado e o badge <strong>X% off</strong> é exibido na vitrine.
        </Typography>

        {promoMsg && (
          <Alert severity={promoMsg.type} sx={{ mb: 2 }} onClose={() => setPromoMsg(null)}>
            {promoMsg.text}
          </Alert>
        )}

        {/* Controles */}
        <Box display="flex" gap={2} alignItems="flex-end" mb={2} flexWrap="wrap">
          <TextField
            label="Desconto (%)"
            type="number"
            size="small"
            value={promoDesconto}
            onChange={e => setPromoDesconto(e.target.value)}
            inputProps={{ min: 1, max: 99 }}
            sx={{ width: 140 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
          />
          <Button
            variant="contained"
            onClick={aplicarDesconto}
            disabled={promoLoading || promoSelecionados.length === 0}
            startIcon={promoLoading ? <CircularProgress size={16} sx={{ color: "white" }} /> : <LocalOffer />}
            sx={{ bgcolor: "#E65100", "&:hover": { bgcolor: "#BF360C" } }}
          >
            Aplicar Desconto
          </Button>
          <Button
            variant="outlined"
            onClick={removerDesconto}
            disabled={promoLoading || promoSelecionados.length === 0}
            sx={{ color: "#4E342E", borderColor: "#4E342E" }}
          >
            Remover Promoção
          </Button>
          {promoSelecionados.length > 0 && (
            <Typography variant="caption" color="text.secondary" alignSelf="center">
              {promoSelecionados.length} produto(s) selecionado(s)
            </Typography>
          )}
        </Box>

        {/* Tabela de produtos */}
        {produtosComEstoque.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Nenhum produto ativo com estoque disponível.</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 420, border: "1px solid #F5E6D3", borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: "#4E342E" }}>
                  <TableCell padding="checkbox" sx={{ bgcolor: "#4E342E" }}>
                    <Tooltip title={promoTodos ? "Desmarcar todos" : "Selecionar todos"}>
                      <Checkbox
                        checked={promoTodos}
                        indeterminate={promoIndeterminate}
                        onChange={togglePromoTodos}
                        sx={{ color: "white", "&.Mui-checked": { color: "white" }, "&.MuiCheckbox-indeterminate": { color: "white" } }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#4E342E" }}>Produto</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#4E342E" }}>Estoque</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#4E342E" }}>Preço atual</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#4E342E" }}>Preview com desconto</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#4E342E" }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {produtosComEstoque.map(p => {
                  const selecionado = promoSelecionados.includes(p.id);
                  const pct = Number(promoDesconto);
                  const precoOriginal = Number(p.preco_venda);
                  const precoComDesconto = pct > 0 ? precoOriginal * (1 - pct / 100) : null;
                  const temPromoAtiva = p.eh_destaque && Number(p.desconto_destaque) > 0;

                  return (
                    <TableRow
                      key={p.id}
                      hover
                      selected={selecionado}
                      onClick={() => togglePromoProduto(p.id)}
                      sx={{ cursor: "pointer", bgcolor: selecionado ? "#FFF3E0" : undefined }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selecionado}
                          onChange={() => togglePromoProduto(p.id)}
                          onClick={e => e.stopPropagation()}
                          sx={{ color: "#E65100", "&.Mui-checked": { color: "#E65100" } }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{p.nome}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{p.estoque} un</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          R$ {precoOriginal.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {precoComDesconto != null ? (
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography
                              variant="caption"
                              sx={{ textDecoration: "line-through", color: "text.secondary" }}
                            >
                              R$ {precoOriginal.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="#C62828">
                              R$ {precoComDesconto.toFixed(2)}
                            </Typography>
                            <Chip
                              label={`${pct.toFixed(0)}% off`}
                              size="small"
                              sx={{
                                bgcolor: "#C62828", color: "white", fontWeight: 700,
                                fontSize: "0.68rem", height: 20,
                              }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            Informe o % acima
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {temPromoAtiva ? (
                          <Chip
                            label={`${Number(p.desconto_destaque).toFixed(0)}% off ativo`}
                            size="small"
                            sx={{ bgcolor: "#E65100", color: "white", fontWeight: 700, fontSize: "0.68rem" }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">Sem promoção</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Gerenciamento de Depoimentos */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <TestimonialsManager />
      </Paper>

      <Box mt={4}>
        <DebugLogs />
      </Box>

      {/* Controle de Versão */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography variant="h6">Versão do Sistema</Typography>
          <Chip label={`v${APP_VERSION}`} color="primary" size="small" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }} />
        </Box>
        <Divider sx={{ mb: 2 }} />
        {CHANGELOG.map((release, i) => (
          <Box key={release.version} mb={i < CHANGELOG.length - 1 ? 3 : 0}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Chip label={`v${release.version}`} size="small" variant={i === 0 ? 'filled' : 'outlined'} color={i === 0 ? 'success' : 'default'} sx={{ fontFamily: 'monospace', fontWeight: 'bold' }} />
              <Typography variant="caption" color="text.secondary">{release.data}</Typography>
              {i === 0 && <Chip label="atual" size="small" color="success" variant="outlined" />}
            </Box>
            <Typography variant="body2" fontWeight="bold" mb={0.5}>{release.descricao}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {release.itens.map((item, j) => (
                <Typography key={j} component="li" variant="body2" color="text.secondary">{item}</Typography>
              ))}
            </Box>
          </Box>
        ))}
      </Paper>
    </Container>
  );
}