import { useState, useEffect } from "react";
import { Container, Typography, Grid, Button, IconButton, Box } from "@mui/material";
import { Delete, AddShoppingCart, ArrowBack, Favorite } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";

export default function ClientFavorites({ clientUser, addToCart }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (clientUser) {
      loadFavorites();
    }
  }, [clientUser]);

  const loadFavorites = () => {
    api.get(`/favoritos/${clientUser.id}`)
      .then(res => setFavorites(res.data))
      .catch(err => console.error("Erro ao carregar favoritos", err));
  };

  const handleRemove = async (produtoId) => {
    try {
      await api.delete(`/favoritos/${clientUser.id}/${produtoId}`);
      setFavorites(prev => prev.filter(p => p.id !== produtoId));
    } catch (err) {
      alert("Erro ao remover favorito");
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

  if (!clientUser) return null;

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

    <Container maxWidth="lg" sx={{ mt: 4, mb: 8, position: 'relative', zIndex: 1 }}>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ fontWeight: 'bold', color: '#4E342E', borderRadius: 50, bgcolor: 'rgba(255,255,255,0.5)' }}>
          Voltar
        </Button>
        <Typography variant="h4" fontWeight="900" sx={{ color: '#4E342E', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Favorite color="error" /> Meus Favoritos
        </Typography>
      </Box>

      {favorites.length === 0 ? (
        <Box sx={{ ...glassStyle, p: 8, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: "#5D4037" }}>
            Você ainda não tem produtos favoritos.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {favorites.map(prod => {
            const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem; // Ajuste conforme estrutura retornada
            
            return (
              <Grid item xs={12} sm={6} md={4} key={prod.id}>
                <Box sx={{ 
                    ...glassStyle, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}>
                  <IconButton 
                    sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' }, zIndex: 10 }}
                    onClick={() => handleRemove(prod.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                  
                  <Box
                    component="img"
                    src={coverImage || "https://via.placeholder.com/300?text=Sem+Imagem"}
                    alt={prod.nome}
                    sx={{ width: '100%', height: 220, objectFit: 'cover' }}
                  />
                  
                  <Box sx={{ p: 3, flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div" fontWeight="bold" sx={{ color: '#4E342E' }}>
                      {prod.nome}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>
                      R$ {Number(prod.preco_venda).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button variant="contained" fullWidth startIcon={<AddShoppingCart />} onClick={() => addToCart(prod)} sx={{ borderRadius: 50, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }}>
                      Adicionar ao Carrinho
                    </Button>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
    </Box>
  );
}