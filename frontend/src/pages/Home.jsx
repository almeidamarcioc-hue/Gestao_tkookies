import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Container, Paper, Grid, Card, CardMedia, CardContent, CardActions, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { AddCircleOutline, ListAlt, Inventory2, People, RestaurantMenu, PointOfSale, Add, Remove, ShoppingBag, LocalOffer, Favorite, FavoriteBorder } from "@mui/icons-material";
import api from "../services/api";

export default function Home({ isLoggedIn, onLoginClick, clientUser, cart, addToCart, updateCartQuantity, removeFromCart }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    home_title: "TKookies",
    home_subtitle: "🍪 Um pedacinho de felicidade em cada mordida.",
    home_location: "📍 Apenas delivery / Três de Maio - RS",
    home_bg: ""
  });

  const [products, setProducts] = useState([]);
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

      {/* SEÇÃO CARDÁPIO */}
      <Container maxWidth="lg" sx={{ mb: 12 }}>
        <Box mb={8}>
          <Typography variant="h4" gutterBottom color="primary" fontWeight="bold" textAlign="center" sx={{ mb: 4 }}>
            Nosso Cardápio
          </Typography>
          <Grid container spacing={3}>
            {products.map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              const qty = getQty(prod.id);
              const isPromo = prod.eh_destaque && prod.desconto_destaque > 0;
              const precoFinal = isPromo 
                ? Number(prod.preco_venda) * (1 - Number(prod.desconto_destaque) / 100)
                : Number(prod.preco_venda);

              return (
                <Grid item xs={12} sm={6} md={4} key={prod.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 3, position: 'relative' }}>
                    <IconButton 
                      sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'white' }, zIndex: 10 }}
                      onClick={() => toggleFavorite(prod)}
                    >
                      {favorites.includes(prod.id) ? <Favorite color="error" /> : <FavoriteBorder />}
                    </IconButton>
                    {coverImage && (
                      <CardMedia
                        component="img"
                        height="200"
                        image={coverImage}
                        alt={prod.nome}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="div" fontWeight="bold">
                        {prod.nome}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" color={isPromo ? "error" : "primary"}>
                          R$ {precoFinal.toFixed(2)}
                        </Typography>
                        {isPromo && <Typography variant="caption" sx={{ textDecoration: 'line-through' }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Disponível: {Number(prod.estoque)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, -1)} disabled={qty === 0} color="primary">
                          <Remove />
                        </IconButton>
                        <Typography fontWeight="bold">{qty}</Typography>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, 1)} disabled={qty >= Number(prod.estoque)} color="primary">
                          <Add />
                        </IconButton>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Container>

      {/* BARRA DE CHECKOUT FLUTUANTE */}
      {totalItems > 0 && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, zIndex: 1200, borderTop: '1px solid #ddd' }} elevation={10}>
          <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Badge badgeContent={totalItems} color="primary">
                <ShoppingBag 
                  color="action" 
                  sx={{
                    animation: animateBag ? 'swing 0.5s ease-in-out' : 'none',
                    '@keyframes swing': {
                      '0%': { transform: 'rotate(0deg)' },
                      '20%': { transform: 'rotate(15deg)' },
                      '40%': { transform: 'rotate(-10deg)' },
                      '60%': { transform: 'rotate(5deg)' },
                      '80%': { transform: 'rotate(-5deg)' },
                      '100%': { transform: 'rotate(0deg)' }
                    }
                  }}
                />
              </Badge>
              <Typography variant="h6" fontWeight="bold">Total: R$ {totalPrice.toFixed(2)}</Typography>
            </Box>
            <Button variant="contained" size="large" onClick={handleCheckout} startIcon={<PointOfSale />}>
              Finalizar Pedido
            </Button>
          </Container>
        </Paper>
      )}

      {/* Modal Cross-Selling */}
      <Dialog open={crossSellOpen} onClose={() => setCrossSellOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', color: 'primary.main', fontSize: '1.5rem' }}>
          Ótima escolha! 🍪
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" textAlign="center" mb={3} color="text.secondary">
            Que tal aproveitar e levar também?
          </Typography>
          <Grid container spacing={2}>
            {crossSellItems.map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              return (
                <Grid item xs={6} key={prod.id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                     {coverImage && (
                        <CardMedia
                          component="img"
                          height="120"
                          image={coverImage}
                          alt={prod.nome}
                          sx={{ objectFit: 'cover' }}
                        />
                      )}
                    <CardContent sx={{ flexGrow: 1, p: 1.5, textAlign: 'center' }}>
                      <Typography variant="subtitle2" fontWeight="bold" noWrap>{prod.nome}</Typography>
                      <Typography variant="body2" color="primary" fontWeight="bold">R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => handleQtyChange(prod.id, 1)}
                        startIcon={<Add />}
                        sx={{ borderRadius: 4 }}
                      >
                        Adicionar
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
          <Button onClick={() => setCrossSellOpen(false)} color="inherit" sx={{ borderRadius: 4 }}>
            Continuar Comprando
          </Button>
          <Button 
            onClick={() => { setCrossSellOpen(false); handleCheckout(); }} 
            variant="contained" 
            color="primary"
            sx={{ borderRadius: 4, px: 4 }}
          >
            Finalizar Pedido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}