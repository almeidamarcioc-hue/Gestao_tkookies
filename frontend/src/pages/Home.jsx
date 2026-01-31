import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Container, Grid, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Add, Remove, ShoppingBag, Favorite, FavoriteBorder, Star, ArrowForward, AddCircleOutline, ListAlt, RestaurantMenu, PointOfSale, Inventory2, People, LocalOffer } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

// Variantes de Animação (Framer Motion)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 50, damping: 15 }
  }
};

export default function Home({ isLoggedIn, onLoginClick, clientUser, cart, addToCart, updateCartQuantity, removeFromCart }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    home_title: "TKookies",
    home_subtitle: "🍪 Um pedacinho de felicidade em cada mordida.",
    home_location: "📍 Apenas delivery / Três de Maio - RS",
    home_bg: ""
  });

  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [crossSellOpen, setCrossSellOpen] = useState(false);
  const [crossSellItems, setCrossSellItems] = useState([]);
  const [animateBag, setAnimateBag] = useState(false);
  const prevTotalItems = useRef(0);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    api.get("/configuracoes").then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    }).catch(err => console.log("Usando configurações padrão"));

    // Carregar produtos para o cardápio
    api.get("/produtos").then(res => {
      const allProducts = Array.isArray(res.data) ? res.data : [];
      // Filtra apenas produtos com estoque positivo
      const availableProducts = allProducts.filter(p => Number(p.estoque) > 0);
      setProducts(availableProducts);
      
      // Encontra o produto destaque
      const featured = allProducts.find(p => p.eh_destaque);
      setFeaturedProduct(featured);
    });

    // Carregar combos
    api.get("/combos").then(res => {
      setCombos(Array.isArray(res.data) ? res.data : []);
    }).catch(err => console.error("Erro ao carregar combos", err));
  }, []);

  useEffect(() => {
    if (clientUser) {
      api.get(`/favoritos/${clientUser.id}`)
        .then(res => setFavorites(res.data.map(f => f.id)))
        .catch(err => console.error("Erro ao carregar favoritos", err));
    }
  }, [clientUser]);

  const toggleFavorite = async (prod) => {
    if (!clientUser) {
      onLoginClick();
      return;
    }
    const isFav = favorites.includes(prod.id);
    try {
      if (isFav) {
        await api.delete(`/favoritos/${clientUser.id}/${prod.id}`);
        setFavorites(prev => prev.filter(id => id !== prod.id));
      } else {
        await api.post("/favoritos", { cliente_id: clientUser.id, produto_id: prod.id });
        setFavorites(prev => [...prev, prod.id]);
      }
    } catch (err) {
      console.error("Erro ao favoritar", err);
    }
  };

  const getQty = (prodId) => {
    const item = cart.find(i => i.id === prodId);
    return item ? item.quantidade : 0;
  };

  const handleQtyChange = (prodId, delta) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const currentQty = getQty(prodId);
    const maxStock = Number(prod.estoque) || 0;
    let next = currentQty + delta;
    if (next < 0) next = 0;
    if (next > maxStock) next = maxStock;
    if (next === 0) removeFromCart(prodId);
    else if (currentQty === 0 && delta > 0) addToCart(prod);
    else updateCartQuantity(prodId, next);
  };

  const handleAddFeatured = () => {
    if (!featuredProduct) return;
    
    handleQtyChange(featuredProduct.id, 1);

    const available = products.filter(p => p.id !== featuredProduct.id && Number(p.estoque) > 0);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2);

    if (selected.length > 0) {
      setCrossSellItems(selected);
      setCrossSellOpen(true);
    }
  };

  const handleCheckout = () => {
    navigate("/carrinho");
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const price = item.eh_destaque && item.desconto_destaque > 0
      ? Number(item.preco_venda) * (1 - Number(item.desconto_destaque) / 100)
      : Number(item.preco_venda);
    return acc + (item.quantidade * price);
  }, 0);

  useEffect(() => {
    if (totalItems > prevTotalItems.current) {
      setAnimateBag(true);
      const timer = setTimeout(() => setAnimateBag(false), 500);
      return () => clearTimeout(timer);
    }
    prevTotalItems.current = totalItems;
  }, [totalItems]);

  return (
    <Box>
      {/* SEÇÃO CABEÇALHO (Hero Section) */}
      <Box sx={{ 
        minHeight: '60vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4,
        backgroundImage: config.home_bg ? `url(${config.home_bg})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        mb: 4
      }}>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center">
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.9)', maxWidth: 600, width: '100%' }}>
              <Box mb={4}>
                <Typography variant="h2" fontWeight="900" color="primary" sx={{ letterSpacing: '-1px', textShadow: '2px 2px 0px #D7CCC8', mb: 1, fontSize: { xs: '2.5rem', md: '3.75rem' } }}>
                  {config.home_title}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {config.home_subtitle}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {config.home_location}
                </Typography>
              </Box>
              
              {isLoggedIn ? (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <Button 
                      variant="contained" 
                      size="large" 
                      fullWidth 
                      component={Link} 
                      to="/pedidos/novo" 
                      startIcon={<AddCircleOutline />} // Corrigido para usar o ícone correto
                      sx={{ py: 2, fontSize: '1.1rem', borderRadius: 3 }}
                    >
                      Novo Pedido
                    </Button>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Button 
                      variant="outlined" 
                      size="large" 
                      fullWidth 
                      component={Link} 
                      to="/pedidos"
                      startIcon={<ListAlt />}
                      sx={{ py: 1.5, borderRadius: 3, height: '100%' }}
                    >
                      Pedidos
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      variant="outlined" 
                      size="large" 
                      fullWidth 
                      component={Link} 
                      to="/combos"
                      startIcon={<PointOfSale />}
                      sx={{ py: 1.5, borderRadius: 3, height: '100%' }}
                    >
                      Combos
                    </Button>
                  </Grid>

                  <Grid item xs={6}>
                    <Button 
                      variant="outlined" 
                      size="large" 
                      fullWidth 
                      component={Link} 
                      to="/produtos"
                      startIcon={<RestaurantMenu />}
                      sx={{ py: 1.5, borderRadius: 3, height: '100%' }}
                    >
                      Produtos
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      variant="outlined" 
                      size="large" 
                      fullWidth 
                      component={Link} 
                      to="/estoque"
                      startIcon={<Inventory2 />}
                      sx={{ py: 1.5, borderRadius: 3, height: '100%' }}
                    >
                      Estoque
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button 
                      variant="outlined" 
                      size="large" 
                      fullWidth 
                      component={Link} 
                      to="/clientes"
                      startIcon={<People />}
                      sx={{ py: 1.5, borderRadius: 3 }}
                    >
                      Gerenciar Clientes
                    </Button>
                  </Grid>
                </Grid>
            ) : null}
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* SEÇÃO DESTAQUE */}
      {featuredProduct && (
        <Container maxWidth="lg" sx={{ mb: 6 }}>
          <Paper elevation={4} sx={{ p: 3, bgcolor: '#fff3e0', border: '2px solid #ffb74d', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: '#ff9800', color: 'white', px: 4, py: 1, borderBottomLeftRadius: 16, boxShadow: 2, zIndex: 1 }}>
              <Typography fontWeight="900" variant="h6" sx={{ letterSpacing: 1 }}>OFERTA ESPECIAL</Typography>
            </Box>
            <Grid container spacing={4} alignItems="center" sx={{ mt: 0 }}>
              <Grid item xs={12} md={4}>
                <Box 
                  component="img" 
                  src={featuredProduct.imagens?.find(img => img.eh_capa)?.imagem || featuredProduct.imagens?.[0]?.imagem} 
                  sx={{ width: '100%', height: 250, objectFit: 'cover', borderRadius: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                  <LocalOffer sx={{ verticalAlign: 'middle', mr: 1 }} />
                  {featuredProduct.nome}
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
                  <Typography variant="h5" sx={{ textDecoration: 'line-through', color: 'text.secondary', opacity: 0.7 }}>
                    R$ {Number(featuredProduct.preco_venda).toFixed(2)}
                  </Typography>
                  <Typography variant="h3" color="error" fontWeight="900">
                    R$ {(Number(featuredProduct.preco_venda) * (1 - Number(featuredProduct.desconto_destaque) / 100)).toFixed(2)}
                  </Typography>
                  <Box sx={{ bgcolor: '#d32f2f', color: 'white', px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 'bold', fontSize: '1.2rem', boxShadow: 1 }}>
                    -{featuredProduct.desconto_destaque}% OFF
                  </Box>
                </Box>
                <Typography variant="body1" mb={3}>
                  Aproveite esta oferta por tempo limitado! Restam apenas <strong>{Number(featuredProduct.estoque)}</strong> unidades.
                </Typography>
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={handleAddFeatured} 
                  startIcon={<Add />}
                  sx={{
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        transform: 'scale(1)',
                        boxShadow: '0 0 0 0 rgba(255, 152, 0, 0.7)',
                      },
                      '70%': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 0 0 10px rgba(255, 152, 0, 0)',
                      },
                      '100%': {
                        transform: 'scale(1)',
                        boxShadow: '0 0 0 0 rgba(255, 152, 0, 0)',
                      },
                    },
                  }}
                >
                  Adicionar ao Pedido
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      )}

      {/* SEÇÃO COMBOS */}
      {combos.length > 0 && (
        <Container maxWidth="lg" sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom color="primary" fontWeight="bold" textAlign="center" sx={{ mb: 4 }}>
            Combos Especiais
          </Typography>
          <Grid container spacing={3}>
            {combos.map(combo => {
              // Calcular economia
              const totalOriginal = combo.itens.reduce((acc, item) => acc + (Number(item.preco_original || 0) * Number(item.quantidade)), 0);
              const economia = totalOriginal - Number(combo.preco_venda);
              
              return (
                <Grid item xs={12} md={6} key={combo.id}>
                  <Paper elevation={3} sx={{ p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden', bgcolor: '#FFF3E0', border: '1px solid #FFE0B2' }}>
                    {economia > 0 && (
                      <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'success.main', color: 'white', px: 2, py: 0.5, borderBottomLeftRadius: 8, fontWeight: 'bold' }}>
                        Economize R$ {economia.toFixed(2)}
                      </Box>
                    )}
                    {combo.imagem && (
                      <Box 
                        component="img" 
                        src={combo.imagem} 
                        alt={combo.nome} 
                        sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 2, mb: 2 }} 
                      />
                    )}
                    <Typography variant="h5" fontWeight="bold" gutterBottom color="primary">{combo.nome}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Contém: {combo.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                      <Box>
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>R$ {totalOriginal.toFixed(2)}</Typography>
                        <Typography variant="h5" color="primary" fontWeight="bold">R$ {Number(combo.preco_venda).toFixed(2)}</Typography>
                      </Box>
                      <Button variant="contained" onClick={() => handleQtyChange(combo.produto_vinculado_id, 1)} startIcon={<Add />}>
                        Adicionar
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        </Container>
      )}

      {/* SEÇÃO CARDÁPIO */}
      <Container maxWidth="lg" sx={{ mb: 12 }}>
        <Box mb={8}>
          <Typography variant="h4" gutterBottom color="primary" fontWeight="bold" textAlign="center" sx={{ mb: 4 }}>
            Nosso Cardápio
          </Typography>
          <Grid container spacing={3} component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
            {products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id)).map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              const qty = getQty(prod.id);
              const isPromo = prod.eh_destaque && prod.desconto_destaque > 0;
              const precoFinal = isPromo 
                ? Number(prod.preco_venda) * (1 - Number(prod.desconto_destaque) / 100)
                : Number(prod.preco_venda);

              return (
                <Grid item xs={12} sm={6} md={4} key={prod.id} component={motion.div} variants={itemVariants}>
                  <Box 
                    sx={{ 
                      ...glassStyle, 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      position: 'relative',
                      transition: 'transform 0.3s ease',
                      '&:hover': { transform: 'translateY(-10px)' }
                    }}
                  >
                    <IconButton 
                      sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 10 }}
                      onClick={() => toggleFavorite(prod)}
                    >
                      {favorites.includes(prod.id) ? <Favorite sx={{ color: '#ef4444' }} /> : <FavoriteBorder />}
                    </IconButton>
                    
                    {coverImage && (
                      <Box
                        component="img"
                        src={coverImage}
                        alt={prod.nome}
                        sx={{ width: '100%', height: 220, objectFit: 'cover', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}
                      />
                    )}
                    
                    <Box sx={{ p: 3, flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                        {prod.nome}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" sx={{ color: isPromo ? '#f59e0b' : secondaryColor, fontWeight: 'bold' }}>
                          R$ {precoFinal.toFixed(2)}
                        </Typography>
                        {isPromo && <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#64748b' }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>}
                      </Box>
                    </Box>

                    <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, -1)} disabled={qty === 0} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography fontWeight="bold">{qty}</Typography>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, 1)} disabled={qty >= Number(prod.estoque)} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      {qty > 0 && <Chip label="No Carrinho" size="small" sx={{ bgcolor: primaryColor, color: 'white', fontWeight: 'bold' }} />}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
      </Box>
      </Container>

      {/* BARRA DE CHECKOUT FLUTUANTE */}
      <AnimatePresence>
      {totalItems > 0 && (
        <Box 
          component={motion.div}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          sx={{ 
            position: 'fixed', 
            bottom: 24, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '90%',
            maxWidth: '600px',
            zIndex: 1200 
          }}
        >
          <Box sx={{ 
            ...glassStyle, 
            bgcolor: 'rgba(15, 23, 42, 0.8)', 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            border: `1px solid ${primaryColor}`
          }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box sx={{ position: 'relative' }}>
                <ShoppingBag sx={{ color: secondaryColor, fontSize: 30 }} />
                <Badge 
                  badgeContent={totalItems} 
                  color="error" 
                  sx={{ position: 'absolute', top: -5, right: -5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Total do Pedido</Typography>
                <Typography variant="h6" fontWeight="bold">R$ {totalPrice.toFixed(2)}</Typography>
              </Box>
            </Box>
            <Button 
              variant="contained" 
              onClick={handleCheckout} 
              endIcon={<ArrowForward />}
              sx={{ 
                borderRadius: '50px', 
                bgcolor: 'white', 
                color: 'black', 
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#f1f5f9' }
              }}
            >
              Finalizar
            </Button>
          </Box>
        </Box>
      )}
      </AnimatePresence>

      {/* Modal Cross-Selling */}
      <Dialog open={crossSellOpen} onClose={() => setCrossSellOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', bgcolor: '#1e293b', color: 'white' } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
          Ótima escolha! 🍪
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" textAlign="center" mb={3} sx={{ color: '#94a3b8' }}>
            Que tal aproveitar e levar também?
          </Typography>
          <Grid container spacing={2}>
            {crossSellItems.map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              return (
                <Grid item xs={6} key={prod.id}>
                  <Box sx={{ bgcolor: '#334155', borderRadius: '16px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                     {coverImage && (
                        <Box component="img" src={coverImage} sx={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      )}
                    <Box sx={{ p: 2, textAlign: 'center', flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold" noWrap>{prod.nome}</Typography>
                      <Typography variant="body2" sx={{ color: secondaryColor, fontWeight: 'bold' }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                      <Button size="small" variant="contained" onClick={() => handleQtyChange(prod.id, 1)} sx={{ borderRadius: '20px', bgcolor: primaryColor }}>
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
          <Button onClick={() => setCrossSellOpen(false)} sx={{ color: '#94a3b8' }}>
            Continuar Comprando
          </Button>
          <Button onClick={() => { setCrossSellOpen(false); handleCheckout(); }} variant="contained" sx={{ bgcolor: 'white', color: 'black', borderRadius: '50px' }}>
            Finalizar Pedido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}