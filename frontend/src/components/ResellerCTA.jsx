import { useState } from "react";
import { Box, Typography, Grid, TextField, Button } from "@mui/material";
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

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '2px',
      fontFamily: 'Inter',
      fontSize: '14px',
      color: 'var(--ink)',
      '& fieldset': {
        borderColor: 'var(--rule)',
      },
      '&:hover fieldset': {
        borderColor: 'var(--ink)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'var(--terracotta)',
        borderWidth: '1px',
      },
    },
    '& .MuiInputLabel-root': {
      fontFamily: 'Inter',
      fontSize: '13px',
      color: 'var(--ink)',
      opacity: 0.55,
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'var(--terracotta)',
      opacity: 1,
    },
  };

  const benefits = [
    "Preços e condições especiais de revenda",
    "Produtos artesanais com qualidade consistente",
    "Suporte comercial dedicado",
    "Fidelização dos seus clientes",
  ];

  return (
    <Box sx={{
      width: '100vw',
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)',
      px: { xs: 3, md: '6vw' },
      py: { xs: 8, md: 12 },
      bgcolor: 'var(--ink)',
    }}>
      <Grid container spacing={{ xs: 6, md: 10 }} alignItems="flex-start">

        {/* Coluna esquerda — Texto */}
        <Grid item xs={12} md={6}>
          <Typography sx={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--caramel)',
            mb: 3,
          }}>
            § 05 — Seja Parceiro
          </Typography>

          <Typography sx={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 300,
            fontSize: { xs: '34px', md: '48px' },
            letterSpacing: '-0.04em',
            color: 'var(--cream)',
            lineHeight: 1.1,
            mb: 3,
          }}>
            Leve TKookies para o seu negócio
          </Typography>

          <Typography sx={{
            fontFamily: 'Inter',
            fontSize: '14px',
            color: 'var(--cream)',
            opacity: 0.65,
            lineHeight: 1.8,
            mb: 5,
            maxWidth: 420,
          }}>
            Agregue valor ao seu comércio com produtos artesanais que encantam e fidelizam clientes. Condições exclusivas para revendedores.
          </Typography>

          {/* Benefits list */}
          <Box sx={{ borderTop: '1px solid rgba(253,248,240,0.12)' }}>
            {benefits.map((item, idx) => (
              <Box key={idx} sx={{
                borderBottom: '1px solid rgba(253,248,240,0.12)',
                py: 1.75,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}>
                <Typography sx={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '11px',
                  color: 'var(--caramel)',
                  opacity: 0.7,
                  letterSpacing: '0.08em',
                  flexShrink: 0,
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </Typography>
                <Typography sx={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  color: 'var(--cream)',
                  opacity: 0.75,
                  lineHeight: 1.5,
                }}>
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        </Grid>

        {/* Coluna direita — Formulário */}
        <Grid item xs={12} md={6}>
          <Box sx={{
            bgcolor: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: '2px',
            p: { xs: 3, md: 4 },
          }}>
            {submitted ? (
              <Box textAlign="center" py={6}>
                <Typography sx={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 300,
                  fontSize: '56px',
                  color: 'var(--terracotta)',
                  lineHeight: 1,
                  mb: 3,
                }}>
                  ✓
                </Typography>
                <Typography sx={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 300,
                  fontSize: '28px',
                  letterSpacing: '-0.03em',
                  color: 'var(--ink)',
                  mb: 2,
                }}>
                  Solicitação enviada
                </Typography>
                <Typography sx={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  color: 'var(--ink)',
                  opacity: 0.65,
                  lineHeight: 1.8,
                }}>
                  Nossa equipe comercial entrará em contato em breve com as condições especiais.
                </Typography>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <Typography sx={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--caramel)',
                  mb: 3,
                }}>
                  Cadastre-se agora
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Razão Social"
                      name="razao_social"
                      fullWidth
                      required
                      value={formData.razao_social}
                      onChange={handleChange}
                      variant="outlined"
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="CPF / CNPJ"
                      name="cpf_cnpj"
                      fullWidth
                      required
                      value={formData.cpf_cnpj}
                      onChange={handleChange}
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Telefone / WhatsApp"
                      name="telefone"
                      fullWidth
                      required
                      value={formData.telefone}
                      onChange={handleChange}
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Nome do Contato"
                      name="nome_contato"
                      fullWidth
                      required
                      value={formData.nome_contato}
                      onChange={handleChange}
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="CEP"
                      name="cep"
                      fullWidth
                      required
                      value={formData.cep}
                      onChange={handleChange}
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="Cidade"
                      name="cidade"
                      fullWidth
                      required
                      value={formData.cidade}
                      onChange={handleChange}
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="UF"
                      name="estado"
                      fullWidth
                      required
                      value={formData.estado}
                      onChange={handleChange}
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      sx={{
                        mt: 1,
                        py: 1.5,
                        borderRadius: '999px',
                        bgcolor: 'var(--terracotta)',
                        color: 'var(--cream)',
                        fontFamily: '"DM Mono", monospace',
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        boxShadow: 'none',
                        '&:hover': {
                          bgcolor: '#b84508',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      Quero ser Parceiro
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
