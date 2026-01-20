import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Container, IconButton, InputAdornment, Grid 
} from "@mui/material";
import { CloudUpload, Delete } from "@mui/icons-material";

export default function Settings() {
  const [homeTitle, setHomeTitle] = useState("");
  const [homeSubtitle, setHomeSubtitle] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [homeBg, setHomeBg] = useState("");
  const [valorFrete, setValorFrete] = useState("");

  useEffect(() => {
    api.get("/configuracoes").then(res => {
      const cfg = res.data;
      if (cfg) {
        setHomeTitle(cfg.home_title || "");
        setHomeSubtitle(cfg.home_subtitle || "");
        setHomeLocation(cfg.home_location || "");
        setHomeBg(cfg.home_bg || "");
        setValorFrete(cfg.valor_frete || "");
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
        valor_frete: valorFrete
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
          <Grid size={12}>
            <TextField 
              label="Título Principal" 
              fullWidth 
              value={homeTitle} 
              onChange={e => setHomeTitle(e.target.value)} 
              placeholder="Ex: TKookies"
            />
          </Grid>
          <Grid size={12}>
            <TextField 
              label="Subtítulo" 
              fullWidth 
              value={homeSubtitle} 
              onChange={e => setHomeSubtitle(e.target.value)} 
              placeholder="Ex: Um pedacinho de felicidade..."
            />
          </Grid>
          <Grid size={12}>
            <TextField 
              label="Texto de Rodapé / Localização" 
              fullWidth 
              value={homeLocation} 
              onChange={e => setHomeLocation(e.target.value)} 
              placeholder="Ex: Apenas delivery / Três de Maio - RS"
            />
          </Grid>

          <Grid size={12}>
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
          
          <Grid size={12}>
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

          <Grid size={12}>
            <Box display="flex" gap={2}>
              <Button variant="contained" size="large" onClick={handleSave}>
                Salvar Configurações
              </Button>
              <Button variant="outlined" size="large" onClick={handleVerifyDb} color="warning">
                Verificar Banco de Dados
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}