import { useState } from "react";
import api from "../services/api";
import { Box, Button, TextField, Typography, Paper, Container, Grid } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";

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

  // Estilos "Organic Soft Tech" (Versão Light/Café)
  const glassStyle = {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 8px 32px 0 rgba(78, 52, 46, 0.08)",
    borderRadius: "24px",
    color: "#3E2723"
  };

  return (
    <Box sx={{ bgcolor: '#D7CCC8', minHeight: '100vh', color: '#3E2723', overflowX: 'hidden', position: 'relative' }}>
      {/* Background Wrapper Animado */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <motion.div 
          animate={{ 
            background: [
              `radial-gradient(circle at 20% 30%, rgba(141, 110, 99, 0.15) 0%, transparent 50%)`,
              `radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)`
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
        />
        <Box sx={{ position: 'absolute', top: '-20%', left: '-10%', width: '50%', height: '50%', background: '#EFEBE9', filter: 'blur(150px)', opacity: 0.4, borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: '#FFE0B2', filter: 'blur(180px)', opacity: 0.3, borderRadius: '50%' }} />
      </Box>

    <Container maxWidth="sm" sx={{ py: 8, position: 'relative', zIndex: 1 }}>
      <Box sx={{ ...glassStyle, p: 4 }}>
        <Typography variant="h4" mb={3} fontWeight="bold" textAlign="center" sx={{ color: '#4E342E' }}>Criar Conta</Typography>
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
            <Button variant="contained" fullWidth size="large" onClick={handleSave} sx={{ borderRadius: 50, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' }, py: 1.5 }}>CADASTRAR</Button>
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