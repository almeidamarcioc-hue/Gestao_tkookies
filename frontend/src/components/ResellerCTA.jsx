import { useState } from "react";
import { Box, Container, Typography, Grid, TextField, Button, Paper } from "@mui/material";
import { Storefront, CheckCircle } from "@mui/icons-material";
import { motion } from "framer-motion";
import api from "../services/api";

export default function ResellerCTA() {
  const [formData, setFormData] = useState({
    razao_social: "",
    cpf_cnpj: "",
    nome_contato: "",
    telefone: "",
    cep: "",
    cidade: "",
    estado: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/revendedores", formData);
      setSubmitted(true);
    } catch (error) {
      alert("Erro ao enviar formulário. Tente novamente.");
    }
  };

  // Estilo Glassmorphism consistente com o projeto
  const glassStyle = {
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.9)",
    boxShadow: "0 8px 32px 0 rgba(78, 52, 46, 0.1)",
    borderRadius: "24px",
    p: 4
  };

  return (
    <Box sx={{ py: 10, position: "relative", overflow: "hidden" }}>
      {/* Fundo Decorativo */}
      <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", bgcolor: "#4E342E", zIndex: 0 }}>
        <Box sx={{ position: "absolute", top: "-50%", left: "-20%", width: "80%", height: "200%", background: "radial-gradient(circle, rgba(141, 110, 99, 0.4) 0%, transparent 70%)" }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          {/* Texto de Venda */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8 }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Storefront sx={{ fontSize: 40, color: "#FFB74D" }} />
                <Typography variant="overline" sx={{ color: "#FFB74D", fontWeight: "bold", letterSpacing: 2, fontSize: "1rem" }}>
                  ÁREA B2B
                </Typography>
              </Box>
              <Typography variant="h2" fontWeight="900" sx={{ color: "white", mb: 3, lineHeight: 1.1 }}>
                Seja um Revendedor Parceiro
              </Typography>
              <Typography variant="h6" sx={{ color: "#D7CCC8", mb: 4, fontWeight: 400 }}>
                Leve a qualidade TKookies para o seu estabelecimento. Agregue valor ao seu comércio com produtos artesanais que fidelizam clientes.
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, display: "inline-block" }}>
                <Typography variant="subtitle1" sx={{ color: "#FFB74D", fontWeight: "bold" }}>
                  ✨ Oferecemos Preços e Condições Especiais de Revenda
                </Typography>
              </Paper>
            </motion.div>
          </Grid>

          {/* Formulário */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <Box sx={glassStyle}>
                {submitted ? (
                  <Box textAlign="center" py={6}>
                    <CheckCircle sx={{ fontSize: 80, color: "#2E7D32", mb: 2 }} />
                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>Solicitação Enviada!</Typography>
                    <Typography color="text.secondary">
                      Nossa equipe comercial entrará em contato em breve com as condições especiais.
                    </Typography>
                  </Box>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                      Cadastre-se agora
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField label="Razão Social" name="razao_social" fullWidth required value={formData.razao_social} onChange={handleChange} variant="outlined" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="CPF / CNPJ" name="cpf_cnpj" fullWidth required value={formData.cpf_cnpj} onChange={handleChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Telefone / WhatsApp" name="telefone" fullWidth required value={formData.telefone} onChange={handleChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField label="Nome do Contato" name="nome_contato" fullWidth required value={formData.nome_contato} onChange={handleChange} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField label="CEP" name="cep" fullWidth required value={formData.cep} onChange={handleChange} />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <TextField label="Cidade" name="cidade" fullWidth required value={formData.cidade} onChange={handleChange} />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField label="UF" name="estado" fullWidth required value={formData.estado} onChange={handleChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          fullWidth 
                          size="large"
                          sx={{ mt: 1, py: 1.5, fontSize: "1.1rem", borderRadius: 50, bgcolor: "#4E342E", "&:hover": { bgcolor: "#3E2723" } }}
                        >
                          Quero ser Parceiro
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                )}
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}