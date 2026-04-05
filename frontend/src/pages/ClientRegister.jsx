import { useState } from "react";
import api from "../services/api";
import { Box, Button, TextField, Typography, Paper, Container, Grid } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
export default function ClientRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: "", telefone: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", login: "", senha: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.login || !formData.senha) {
      alert("Preencha os campos obrigatórios (Nome, Login, Senha)");
      return;
    }
    try {
      await api.post("/clientes", formData);
      alert("Cadastro realizado com sucesso! Faça login para continuar.");
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || "Erro ao cadastrar.";
      alert(msg);
    }
  };

  return (
    <Box sx={{ bgcolor: '#FFFAF5', minHeight: '100vh' }}>
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ bgcolor: 'white', borderRadius: 5, boxShadow: '0 4px 24px rgba(44,24,16,0.10)', p: 4 }}>
        <Typography variant="h4" mb={3} fontWeight="bold" textAlign="center" sx={{ color: '#2C1810', fontFamily: '"Playfair Display", serif' }}>Criar Conta</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Nome Completo" name="nome" fullWidth value={formData.nome} onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Telefone" name="telefone" fullWidth value={formData.telefone} onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12} sm={9}>
            <TextField label="Endereço" name="endereco" fullWidth value={formData.endereco} onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Número" name="numero" fullWidth value={formData.numero} onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Complemento" name="complemento" fullWidth value={formData.complemento} onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Bairro" name="bairro" fullWidth value={formData.bairro} onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Cidade" name="cidade" fullWidth value={formData.cidade} onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Login (Email ou Usuário)" name="login" fullWidth value={formData.login} onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Senha" name="senha" type="password" fullWidth value={formData.senha} onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" fullWidth size="large" onClick={handleSave} sx={{ borderRadius: 50, bgcolor: '#D4580A', '&:hover': { bgcolor: '#B84508' }, py: 1.5 }}>CADASTRAR</Button>
          </Grid>
          <Grid item xs={12} textAlign="center">
            <Button component={Link} to="/" sx={{ color: '#5D4037', textTransform: 'none' }}>Voltar para o Início</Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
    </Box>
  );
}