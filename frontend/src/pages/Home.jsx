import { useState, useEffect } from "react";
import { Box, Typography, Button, Container, Paper, Grid, Card, CardMedia, CardContent, CardActions, IconButton, Badge } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { AddCircleOutline, ListAlt, Inventory2, People, RestaurantMenu, PointOfSale, Add, Remove, ShoppingCart, LocalOffer } from "@mui/icons-material";
import api from "../services/api";

export default function Home({ isLoggedIn, onLoginClick }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    home_title: "TKookies",
    home_subtitle: "🍪 Um pedacinho de felicidade em cada mordida.",
    home_location: "📍 Apenas delivery / Três de Maio - RS",
    home_bg: ""
  });

  const [products, setProducts] = useState([]);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [cart, setCart] = useState({}); // { id: quantidade }

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

  const handleQtyChange = (prodId, delta) => {
    setCart(prev => {
      const current = prev[prodId] || 0;
      const prod = products.find(p => p.id === prodId);
      const maxStock = Number(prod?.estoque) || 0;
      
      let next = current + delta;
      if (next < 0) next = 0;
      if (next > maxStock) next = maxStock; // Limita ao estoque

      if (next === 0) {
        const { [prodId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [prodId]: next };
    });
  };

  const handleCheckout = () => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }

    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const prod = products.find(p => p.id === Number(id));
      if (!prod) return null;
      
      const precoFinal = prod.eh_destaque && prod.desconto_destaque > 0 
        ? Number(prod.preco_venda) * (1 - Number(prod.desconto_destaque) / 100)
        : Number(prod.preco_venda);

      return {
        produto_id: prod.id,
        nome: prod.nome,
        quantidade: qty,
        valor_unitario: precoFinal,
        valor_total: qty * precoFinal,
        _tempId: Math.random()
      };
    }).filter(Boolean);

    navigate("/pedidos/novo", { state: { items: orderItems } });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((acc, [id, qty]) => {
    const prod = products.find(p => p.id === Number(id));
    const preco = prod?.eh_destaque && prod?.desconto_destaque > 0 
        ? Number(prod.preco_venda) * (1 - Number(prod.desconto_destaque) / 100)
        : Number(prod?.preco_venda) || 0;
    return acc + (qty * preco);
  }, 0);

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
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.9)', maxWidth: 600, width: '100%' }}>
              <Box mb={4}>
                <Typography variant="h2" fontWeight="900" color="primary" sx={{ letterSpacing: '-1px', textShadow: '2px 2px 0px #D7CCC8', mb: 1 }}>
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
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Button 
                      variant="contained" 
                      size="large" 
                      fullWidth 
                      component={Link} 
                      to="/pedidos/novo" 
                      startIcon={<AddCircleOutline />}
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
              ) : (
                <Box mt={4}>
                  <Typography variant="caption" color="text.disabled">
                    Todos o direitos reservados - TKookies © {new Date().getFullYear()}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* SEÇÃO DESTAQUE */}
      {featuredProduct && (
        <Container maxWidth="lg" sx={{ mb: 6 }}>
          <Paper elevation={4} sx={{ p: 3, bgcolor: '#fff3e0', border: '2px solid #ffb74d', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: '#ff9800', color: 'white', px: 2, py: 0.5, borderBottomLeftRadius: 8 }}>
              <Typography fontWeight="bold" variant="caption">OFERTA ESPECIAL</Typography>
            </Box>
            <Grid container spacing={4} alignItems="center">
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
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="h5" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                    R$ {Number(featuredProduct.preco_venda).toFixed(2)}
                  </Typography>
                  <Typography variant="h4" color="error" fontWeight="bold">
                    R$ {(Number(featuredProduct.preco_venda) * (1 - Number(featuredProduct.desconto_destaque) / 100)).toFixed(2)}
                  </Typography>
                  <Badge color="error" badgeContent={`-${featuredProduct.desconto_destaque}%`} />
                </Box>
                <Typography variant="body1" mb={3}>
                  Aproveite esta oferta por tempo limitado! Restam apenas <strong>{Number(featuredProduct.estoque)}</strong> unidades.
                </Typography>
                <Button variant="contained" size="large" onClick={() => handleQtyChange(featuredProduct.id, 1)} startIcon={<Add />}>
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
              const qty = cart[prod.id] || 0;
              const isPromo = prod.eh_destaque && prod.desconto_destaque > 0;
              const precoFinal = isPromo 
                ? Number(prod.preco_venda) * (1 - Number(prod.desconto_destaque) / 100)
                : Number(prod.preco_venda);

              return (
                <Grid item xs={12} sm={6} md={4} key={prod.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 3 }}>
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
                <ShoppingCart color="action" />
              </Badge>
              <Typography variant="h6" fontWeight="bold">Total: R$ {totalPrice.toFixed(2)}</Typography>
            </Box>
            <Button variant="contained" size="large" onClick={handleCheckout} startIcon={<PointOfSale />}>
              Finalizar Pedido
            </Button>
          </Container>
        </Paper>
      )}
    </Box>
  );
}