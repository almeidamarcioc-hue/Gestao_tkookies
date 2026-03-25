import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Container, IconButton, InputAdornment, Grid 
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

  const handleSave = async () => {
    try {
      await api.post("/configuracoes", {
        home_title: homeTitle,
        home_subtitle: homeSubtitle,
        home_location: homeLocation,
        home_bg: homeBg,
        valor_frete: valorFrete,
        
        about_title: aboutTitle,
        about_desc: aboutDesc,
        about_card1_title: aboutCard1Title,
        about_card1_desc: aboutCard1Desc,
        about_card2_title: aboutCard2Title,
        about_card2_desc: aboutCard2Desc,
        about_card3_title: aboutCard3Title,
        about_card3_desc: aboutCard3Desc,
        about_cta_title: aboutCtaTitle,
        about_cta_desc: aboutCtaDesc
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