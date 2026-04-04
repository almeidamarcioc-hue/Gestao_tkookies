import { useState, useEffect } from "react";
import { Container, Typography, Box, Button, Grid } from "@mui/material";
import { ArrowBack, Cookie, EmojiEvents, Groups } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";

export default function About() {
  const [config, setConfig] = useState({
    about_title: "Sobre a TKookies", // Valor padrão como string para evitar problemas de renderização inicial se a API falhar
    about_desc: "Nascemos da paixão por criar momentos doces e inesquecíveis. Acreditamos que um cookie não é apenas uma sobremesa, é um abraço em forma de sabor.",
    about_card1_title: "Artesanal",
    about_card1_desc: "Cada cookie é feito à mão, com ingredientes selecionados e muito carinho, garantindo a textura perfeita: crocante por fora e macio por dentro.",
    about_card2_title: "Qualidade",
    about_card2_desc: "Não abrimos mão da excelência. Utilizamos chocolates nobres e ingredientes frescos para entregar a melhor experiência a cada mordida.",
    about_card3_title: "Comunidade",
    about_card3_desc: "Mais do que clientes, temos amigos. Adoramos fazer parte das suas celebrações e do seu dia a dia em Três de Maio e região.",
    about_cta_title: "Venha nos conhecer!",
    about_cta_desc: "Estamos prontos para adoçar o seu dia. Faça seu pedido agora mesmo e sinta a diferença."
  });

  useEffect(() => {
    api.get("/configuracoes").then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        // Mescla as configurações vindas do banco com os valores padrão (para garantir que nada quebre se faltar uma chave)
        setConfig(prev => ({ ...prev, ...res.data }));
      } else {
        // Se não vier nada da API, garante que o título padrão tenha a formatação correta
        setConfig(prev => ({
          ...prev,
          about_title: "Sobre a TKookies"
        }));
      }
    }).catch(err => console.error("Erro ao carregar configurações da página Sobre", err));
  }, []);

  // Estilos "Cozy Bakery"
  const cardStyle = {
    background: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 2px 20px rgba(78, 52, 46, 0.08)",
    border: "1px solid rgba(78, 52, 46, 0.06)",
    color: "#3E2723"
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 50 }
    }
  };

  return (
    <Box sx={{ bgcolor: '#FFFAF5', minHeight: '100vh', color: '#3E2723' }}>
      <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
        <Box mb={4}>
          <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ fontWeight: 'bold', color: '#4E342E', borderRadius: 50, bgcolor: 'rgba(255,255,255,0.5)' }}>
            Voltar para o Início
          </Button>
        </Box>

        <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
          <Box sx={{ ...cardStyle, p: { xs: 4, md: 8 }, mb: 6, textAlign: 'center' }} component={motion.div} variants={itemVariants}>
            <Typography variant="h3" fontWeight="900" gutterBottom sx={{ color: '#4E342E', mb: 2 }}>
              {/* Renderiza com formatação especial se for o título padrão ou se contiver "TKookies" */}
              {typeof config.about_title === 'string' && config.about_title.includes("TKookies") ? (
                <>Sobre a TK<Box component="span" sx={{ fontSize: '0.8em' }}>🍪🍪</Box>kies</>
              ) : (
                config.about_title
              )}
            </Typography>
            <Typography variant="h6" sx={{ color: '#795548', maxWidth: '800px', mx: 'auto', lineHeight: 1.6 }}>
              {config.about_desc}
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ ...cardStyle, p: 4, height: '100%', textAlign: 'center' }} component={motion.div} variants={itemVariants}>
                <Cookie sx={{ fontSize: 60, color: '#8D6E63', mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#4E342E' }}>{config.about_card1_title}</Typography>
                <Typography variant="body1" sx={{ color: '#795548' }}>
                  {config.about_card1_desc}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ ...cardStyle, p: 4, height: '100%', textAlign: 'center' }} component={motion.div} variants={itemVariants}>
                <EmojiEvents sx={{ fontSize: 60, color: '#FFB74D', mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#4E342E' }}>{config.about_card2_title}</Typography>
                <Typography variant="body1" sx={{ color: '#795548' }}>
                  {config.about_card2_desc}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ ...cardStyle, p: 4, height: '100%', textAlign: 'center' }} component={motion.div} variants={itemVariants}>
                <Groups sx={{ fontSize: 60, color: '#2E7D32', mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#4E342E' }}>{config.about_card3_title}</Typography>
                <Typography variant="body1" sx={{ color: '#795548' }}>
                  {config.about_card3_desc}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ ...cardStyle, p: { xs: 4, md: 6 }, mt: 6, textAlign: 'center' }} component={motion.div} variants={itemVariants}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#4E342E' }}>
              {config.about_cta_title}
            </Typography>
            <Typography variant="body1" sx={{ color: '#795548', mb: 4 }}>
              {config.about_cta_desc}
            </Typography>
            <Button variant="contained" size="large" component={Link} to="/" sx={{ borderRadius: 50, px: 5, py: 1.5, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }}>
              🍪 Ver Cardápio Completo
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}