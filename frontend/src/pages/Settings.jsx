import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Container, IconButton, InputAdornment, Grid, Checkbox, FormControlLabel, FormGroup, Switch, Divider 
} from "@mui/material";
import { CloudUpload, Delete } from "@mui/icons-material";
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
  const [openingHours, setOpeningHours] = useState([
    { day: 0, label: "Domingo", open: false, open_time: "08:00", close_time: "18:00" },
    { day: 1, label: "Segunda", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 2, label: "Terça", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 3, label: "Quarta", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 4, label: "Quinta", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 5, label: "Sexta", open: true, open_time: "08:00", close_time: "18:00" },
    { day: 6, label: "Sábado", open: true, open_time: "08:00", close_time: "18:00" },
  ]);

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

        if (cfg.opening_hours) {
          setOpeningHours(JSON.parse(cfg.opening_hours));
        } else if (cfg.open_days) {
          const days = cfg.open_days.split(',').map(Number);
          setOpeningHours(prev => prev.map(h => ({
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
    const newHours = [...openingHours];
    newHours[idx].open = !newHours[idx].open;
    setOpeningHours(newHours);
  };

  const handleScheduleTimeChange = (idx, field, val) => {
    const newHours = [...openingHours];
    newHours[idx][field] = val;
    setOpeningHours(newHours);
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
        whatsapp_number: whatsappNumber
      });
      alert("Configurações salvas!");
    } catch (err) {
      alert("Erro ao salvar.");
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

      {/* Gerenciamento de Depoimentos */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <TestimonialsManager />
      </Paper>

      <Box mt={4}>
        <DebugLogs />
      </Box>
    </Container>
  );
}