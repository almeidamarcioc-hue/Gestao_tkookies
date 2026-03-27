import { useState, useEffect } from "react";
import { Container, Typography, Grid, Button, IconButton, Box, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from "@mui/material";
import { Delete, AddShoppingCart, ArrowBack, Favorite, Close } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";

export default function ClientFavorites({ clientUser, addToCart, onLoginClick }) {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [crossSellOpen, setCrossSellOpen] = useState(false);
  const [crossSellItems, setCrossSellItems] = useState([]);
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  useEffect(() => {
    if (clientUser) {
      loadFavorites();
      loadAllProducts();
    }
  }, [clientUser]);

  const checkIfOpen = (openTime, closeTime) => {
    if (!openTime || !closeTime) return true;
    const now = new Date();
    const current = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    return current >= openTime && current <= closeTime;
  };

  const loadAllProducts = async () => {
    try {
      const cfg = await api.get("/configuracoes");
      setIsStoreOpen(checkIfOpen(cfg.data.open_time, cfg.data.close_time));

      const res = await api.get("/produtos");
      // Carrega todos os produtos (ativos e não agregados) para poder exibir "Indisponível"
      setAllProducts(Array.isArray(res.data) ? res.data.filter(p => p.ativo !== false && !p.eh_agregado) : []);
    } catch (err) {
      console.error("Erro ao carregar produtos para sugestão", err);
    }
  };

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

  const handleAddWithPopup = async (prod) => {
    if (!clientUser) {
      alert("Faça login ou cadastre-se para aproveitar os Sabores da TKookies.");
      onLoginClick();
      return;
    }
    if (!isStoreOpen) {
      alert("Estamos fechados no momento.");
      return;
    }

    if ((Number(prod.estoque) || 0) <= 0) {
      alert(`O produto "${prod.nome}" está indisponível no momento.`);
      return;
    }

    // Adiciona o produto selecionado ao carrinho
    const success = await addToCart(prod, 1);
    if (!success) return; // Não abre o modal se falhou ao adicionar

    // Prepara sugestões aleatórias (exclui o produto atual e itens sem estoque ou agregados)
    const available = allProducts.filter(p => p.id !== prod.id && Number(p.estoque) > 0 && !p.eh_agregado);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2);

    if (selected.length > 0) {
      setCrossSellItems(selected);
      setCrossSellOpen(true);
    } else {
      // Se não houver sugestões, vai direto para o carrinho para feedback visual
      navigate("/carrinho");
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
                    {prod.estoque <= 0 && (
                      <Chip
                        label="Indisponível"
                        color="error"
                        size="small"
                        sx={{ mt: 1, fontWeight: 'bold' }}
                      />
                    )}
                  </Box>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button variant="contained" fullWidth startIcon={<AddShoppingCart />} onClick={() => handleAddWithPopup(prod)} sx={{ borderRadius: 50, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }} disabled={prod.estoque <= 0 || !isStoreOpen}>
                      Adicionar ao Carrinho
                    </Button>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Modal Cross-Selling (Sugestões de Compra) */}
      <Dialog open={crossSellOpen} onClose={() => setCrossSellOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', bgcolor: '#fff', color: '#3E2723' } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: '#4E342E' }}>
          Ótima escolha! 🍪
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" textAlign="center" mb={3} sx={{ color: '#5D4037' }}>
            Que tal aproveitar e levar também?
          </Typography>
          <Grid container spacing={2}>
            {crossSellItems.map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              return (
                <Grid item xs={6} key={prod.id}>
                  <Box sx={{ bgcolor: '#EFEBE9', borderRadius: '16px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #D7CCC8' }}>
                     {coverImage && (
                        <Box component="img" src={coverImage} sx={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      )}
                    <Box sx={{ p: 2, textAlign: 'center', flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary.main" noWrap>{prod.nome}</Typography>
                      <Typography variant="body2" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                      <Button size="small" variant="contained" onClick={() => addToCart(prod, 1)} sx={{ borderRadius: '20px', bgcolor: '#4E342E' }}>
                        Adicionar
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
          <Button onClick={() => setCrossSellOpen(false)} sx={{ color: '#5D4037' }}>
            Continuar vendo favoritos
          </Button>
          <Button onClick={() => { setCrossSellOpen(false); navigate("/carrinho"); }} variant="contained" sx={{ bgcolor: '#4E342E', color: 'white', borderRadius: '50px' }}>
            Ver meu carrinho
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  );
}