import { useState, useEffect } from "react";
import { Container, Typography, Grid, Card, CardMedia, CardContent, CardActions, Button, IconButton, Box } from "@mui/material";
import { Delete, AddShoppingCart, ArrowBack, Favorite } from "@mui/icons-material";
import { Link } from "react-router-dom";
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

  if (!clientUser) return null;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          Voltar
        </Button>
        <Typography variant="h4" fontWeight="900" color="primary" display="flex" alignItems="center" gap={1}>
          <Favorite color="error" /> Meus Favoritos
        </Typography>
      </Box>

      {favorites.length === 0 ? (
        <Typography variant="h6" color="text.secondary" textAlign="center" mt={8}>
          Você ainda não tem produtos favoritos.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {favorites.map(prod => {
            const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem; // Ajuste conforme estrutura retornada
            // Nota: O endpoint de favoritos retorna colunas de produtos, mas as imagens podem vir como JSON ou precisar de join extra dependendo do DB.
            // Assumindo que o backend retorna estrutura similar a produtos.
            
            return (
              <Grid item xs={12} sm={6} md={4} key={prod.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 3, position: 'relative' }}>
                  <IconButton 
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }}
                    onClick={() => handleRemove(prod.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                  
                  {/* Fallback para imagem se não vier populada no join simples */}
                  <CardMedia
                    component="img"
                    height="200"
                    image={coverImage || "https://via.placeholder.com/300?text=Sem+Imagem"}
                    alt={prod.nome}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div" fontWeight="bold">
                      {prod.nome}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      R$ {Number(prod.preco_venda).toFixed(2)}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2 }}>
                    <Button variant="contained" fullWidth startIcon={<AddShoppingCart />} onClick={() => addToCart(prod)}>
                      Adicionar ao Carrinho
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}