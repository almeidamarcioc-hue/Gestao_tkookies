import { useState, useEffect } from "react";
import { Box, Typography, Button, Container, Paper, Grid } from "@mui/material";
import { Link } from "react-router-dom";
import { AddCircleOutline, ListAlt, Inventory2, People, RestaurantMenu, PointOfSale } from "@mui/icons-material";
import api from "../services/api";

export default function Home({ isLoggedIn, onLoginClick }) {
  const [config, setConfig] = useState({
    home_title: "TKookies",
    home_subtitle: "🍪 Um pedacinho de felicidade em cada mordida.",
    home_location: "📍 Apenas delivery / Três de Maio - RS",
    home_bg: ""
  });

  useEffect(() => {
    api.get("/configuracoes").then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    }).catch(err => console.log("Usando configurações padrão"));
  }, []);

  return (
    <Box sx={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      py: 4,
      backgroundImage: config.home_bg ? `url(${config.home_bg})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <Container maxWidth="sm">
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
      </Container>
    </Box>
  );
}