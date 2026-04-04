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
  const [config, setConfig] = useState({ open_time: "", close_time: "", open_days: "" });

  useEffect(() => {
    if (clientUser) {
      loadFavorites();
      loadAllProducts();
    }
  }, [clientUser]);

  const checkIfOpen = (openTime, closeTime, openDaysStr) => {
    const now = new Date();

    // Verifica dia da semana
    if (openDaysStr) {
      const allowedDays = openDaysStr.split(',').map(Number);
      if (!allowedDays.includes(now.getDay())) return false;
    }

    if (!openTime || !closeTime) return true;
    const current = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    return current >= openTime && current <= closeTime;
  };

  const loadAllProducts = async () => {
    try {
      const cfg = await api.get("/configuracoes");
      setConfig(cfg.data);
      setIsStoreOpen(checkIfOpen(cfg.data.open_time, cfg.data.close_time, cfg.data.open_days));

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
    if (!checkIfOpen(config.open_time, config.close_time, config.open_days)) {
      setIsStoreOpen(false);
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

  if (!clientUser) return null;

  return (
    <Box sx={{ bgcolor: '#FFFAF5', minHeight: '100vh', color: '#2C1810', overflowX: 'hidden', position: 'relative' }}>
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8, position: 'relative', zIndex: 1 }}>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ fontWeight: 'bold', color: '#D4580A', borderRadius: 50 }}>
          Voltar
        </Button>
        <Typography variant="h4" fontWeight="900" sx={{ color: '#2C1810', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Favorite color="error" /> Meus Favoritos
        </Typography>
      </Box>

      {favorites.length === 0 ? (
        <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 20, boxShadow: '0 4px 24px rgba(44,24,16,0.10)', p: 8, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: "#795548", mb: 2 }}>
            Você ainda não tem produtos favoritos.
          </Typography>
          <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 50 }}>
            Ver Cardápio
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {favorites.map(prod => {
            const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem; // Ajuste conforme estrutura retornada
            
            return (
              <Grid item xs={12} sm={6} md={4} key={prod.id}>
                <Box sx={{
                    bgcolor: '#FFFFFF',
                    borderRadius: 20,
                    boxShadow: '0 4px 24px rgba(44,24,16,0.10)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 16px 40px rgba(44,24,16,0.18)' }
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
                    sx={{ width: '100%', height: 240, objectFit: 'cover' }}
                  />

                  <Box sx={{ p: 3, flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div" fontWeight="bold" sx={{ color: '#2C1810' }}>
                      {prod.nome}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#D4580A', fontWeight: 'bold', fontSize: '1.4rem' }}>
                      R$ {Number(prod.preco_venda).toFixed(2)}
                    </Typography>
                    {Number(prod.estoque) > 0 && (
                      <Typography variant="caption" sx={{ color: '#795548', display: 'block', mt: 0.5, fontWeight: 500 }}>
                        Estoque: {Number(prod.estoque)} un.
                      </Typography>
                    )}
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
                    <Button variant="contained" fullWidth startIcon={<AddShoppingCart />} onClick={() => handleAddWithPopup(prod)} sx={{ borderRadius: 50 }} disabled={prod.estoque <= 0 || !isStoreOpen}>
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
      <Dialog open={crossSellOpen} onClose={() => setCrossSellOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', bgcolor: '#FFFAF5', color: '#2C1810' } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: '#2C1810' }}>
          Ótima escolha! 🍪
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" textAlign="center" mb={3} sx={{ color: '#795548' }}>
            Que tal aproveitar e levar também?
          </Typography>
          <Grid container spacing={2}>
            {crossSellItems.map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              return (
                <Grid item xs={6} key={prod.id}>
                  <Box sx={{ bgcolor: '#FFF8F0', borderRadius: '16px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                     {coverImage && (
                        <Box component="img" src={coverImage} sx={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      )}
                    <Box sx={{ p: 2, textAlign: 'center', flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#2C1810' }} noWrap>{prod.nome}</Typography>
                      <Typography variant="body2" sx={{ color: '#D4580A', fontWeight: 'bold' }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                      <Button size="small" variant="contained" onClick={() => addToCart(prod, 1)} sx={{ borderRadius: '20px' }}>
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
          <Button onClick={() => setCrossSellOpen(false)} sx={{ color: '#795548' }}>
            Continuar vendo favoritos
          </Button>
          <Button onClick={() => { setCrossSellOpen(false); navigate("/carrinho"); }} variant="contained" sx={{ borderRadius: '50px' }}>
            Ver meu carrinho
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  );
}