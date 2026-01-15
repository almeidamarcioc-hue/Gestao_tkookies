import { useState, useEffect } from "react";
import { Box, Typography, Button, Container, Paper, Grid, Card, CardMedia, CardContent, CardActions, IconButton, Badge } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { AddCircleOutline, ListAlt, Inventory2, People, RestaurantMenu, PointOfSale, Add, Remove, ShoppingCart } from "@mui/icons-material";
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
  const [cart, setCart] = useState({}); // { id: quantidade }

  useEffect(() => {
    api.get("/configuracoes").then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    }).catch(err => console.log("Usando configurações padrão"));

    // Carregar produtos para o cardápio
    api.get("/produtos").then(res => {
      setProducts(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const handleQtyChange = (prodId, delta) => {
    setCart(prev => {
      const current = prev[prodId] || 0;
      const next = Math.max(0, current + delta);
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
      return {
        produto_id: prod.id,
        nome: prod.nome,
        quantidade: qty,
        valor_unitario: Number(prod.preco_venda),
        valor_total: qty * Number(prod.preco_venda),
        _tempId: Math.random()
      };
    }).filter(Boolean);

    navigate("/pedidos/novo", { state: { items: orderItems } });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((acc, [id, qty]) => {
    const prod = products.find(p => p.id === Number(id));
    return acc + (qty * (Number(prod?.preco_venda) || 0));
  }, 0);

  return (
    <Box sx={{ 
      minHeight: '80vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      py: 4,
      backgroundImage: config.home_bg ? `url(${config.home_bg})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" mb={4}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
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
              <Grid size={12}>
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
              
              <Grid size={6}>
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
              <Grid size={6}>
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

              <Grid size={6}>
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
              <Grid size={6}>
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
              
              <Grid size={12}>
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

        {/* CARDÁPIO */}
        <Box mb={8}>
          <Typography variant="h4" gutterBottom color="primary" fontWeight="bold" textAlign="center" sx={{ textShadow: '1px 1px 0px #fff' }}>
            Nosso Cardápio
          </Typography>
          <Grid container spacing={3}>
            {products.map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              const qty = cart[prod.id] || 0;

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={prod.id}>
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
                      <Typography variant="h6" color="primary">
                        R$ {Number(prod.preco_venda).toFixed(2)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, -1)} disabled={qty === 0} color="primary">
                          <Remove />
                        </IconButton>
                        <Typography fontWeight="bold">{qty}</Typography>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, 1)} color="primary">
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