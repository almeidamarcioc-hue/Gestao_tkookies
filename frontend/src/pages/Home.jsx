import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Container, Grid, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper, Fab, Snackbar, Alert } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Add, Remove, ShoppingBag, Favorite, FavoriteBorder, Star, ArrowForward, AddCircleOutline, ListAlt, RestaurantMenu, PointOfSale, Inventory2, People, LocalOffer, Info, Close, Storefront } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import ResellerCTA from "../components/ResellerCTA";

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

// Estilos "Organic Soft Tech" (Glassmorphism)
const glassStyle = {
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.8)",
  boxShadow: "0 8px 32px 0 rgba(78, 52, 46, 0.08)",
  borderRadius: "24px",
  color: "#3E2723"
};

const primaryColor = "#4E342E"; // Marrom Café Escuro
const secondaryColor = "#2E7D32"; // Verde Sucesso (ou outra cor de destaque do tema)

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const handleCloseSnackbar = () => setSnackbarOpen(false);

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
      
      // Encontra produtos destaque com estoque e seleciona um aleatório
      const featuredList = availableProducts.filter(p => p.eh_destaque);
      if (featuredList.length > 0) {
        const randomFeatured = featuredList[Math.floor(Math.random() * featuredList.length)];
        setFeaturedProduct(randomFeatured);
      }
    });

    // Carregar combos
    api.get("/combos?apenas_ativos=true").then(res => {
      setCombos(Array.isArray(res.data) ? res.data : []);
    }).catch(err => console.error("Erro ao carregar combos", err));
  }, []);

  useEffect(() => {
    if (clientUser) {
      api.get(`/favoritos/${clientUser.id}`)
        .then(res => {
          // Garante que estamos pegando apenas os IDs e convertendo para número se necessário
          const favIds = res.data.map(f => Number(f.id));
          setFavorites(favIds);
        })
        .catch(err => console.error("Erro ao carregar favoritos", err));
    }
  }, [clientUser]);

  const toggleFavorite = async (prod) => {
    if (!clientUser) {
      onLoginClick();
      return;
    }
    const prodId = Number(prod.id);
    const isFav = favorites.includes(prodId);
    try {
      if (isFav) {
        await api.delete(`/favoritos/${clientUser.id}/${prodId}`);
        setFavorites(prev => prev.filter(id => id !== prodId)); // Remove do estado local
        setSnackbarMessage("Produto removido dos favoritos");
        setSnackbarSeverity("info");
      } else {
        await api.post("/favoritos", { cliente_id: clientUser.id, produto_id: prodId });
        setFavorites(prev => [...prev, prodId]); // Adiciona ao estado local
        setSnackbarMessage("Produto adicionado aos favoritos!");
        setSnackbarSeverity("success");
      }
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Erro ao favoritar", err);
      setSnackbarMessage("Erro ao atualizar favoritos");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
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

  const handleOpenDetails = (prod) => {
    setSelectedProduct(prod);
    setSelectedImageIndex(0);
    setDetailsOpen(true);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const totalPrice = cart.reduce((acc, item) => {
    let price = Number(item.preco_venda);
    
    if (clientUser?.is_revendedor) {
      price = Number(item.preco_revenda);
    } else if (item.eh_destaque && item.desconto_destaque > 0) {
      price = price * (1 - Number(item.desconto_destaque) / 100);
    }
    
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
    <Box sx={{ bgcolor: '#EFEBE9', minHeight: '100vh', color: '#3E2723', overflowX: 'hidden', position: 'relative' }}>
      
      {/* Background Wrapper Animado (Aurora Effect) */}
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
        <Box sx={{ position: 'absolute', top: '-20%', left: '-10%', width: '50%', height: '50%', background: '#D7CCC8', filter: 'blur(150px)', opacity: 0.4, borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: '#FFE0B2', filter: 'blur(180px)', opacity: 0.3, borderRadius: '50%' }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: 8, pb: 20 }}>

        {/* NEW BENTO GRID SECTION */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Grid container spacing={4} sx={{ mb: 12 }}>

            {/* BENTO: HERO & ADMIN ACTIONS */}
            <Grid item xs={12} md={isLoggedIn || !featuredProduct ? 12 : 7} component={motion.div} variants={itemVariants}>
              <Box sx={{ ...glassStyle, p: { xs: 4, md: 6 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 900, fontSize: { xs: '2.5rem', md: '3.5rem' }, background: `linear-gradient(135deg, #4E342E 0%, #8D6E63 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", mb: 2, letterSpacing: '-1.5px' }}>
                  {config.home_title}
                </Typography>
                <Typography variant="h6" sx={{ color: '#5D4037', fontWeight: 500, maxWidth: '500px', mx: 'auto', mb: 4 }}>
                  {config.home_subtitle}
                </Typography>
                
                {isLoggedIn ? (
                  <Grid container spacing={2} justifyContent="center" sx={{ maxWidth: 600 }}>
                    <Grid item xs={12} sm={4}><Button fullWidth variant="contained" component={Link} to="/pedidos/novo" startIcon={<AddCircleOutline />} sx={{ bgcolor: 'primary.main', borderRadius: '12px', py: 1.5 }}>Novo Pedido</Button></Grid>
                    <Grid item xs={6} sm={4}><Button fullWidth variant="outlined" component={Link} to="/pedidos" startIcon={<ListAlt />} sx={{ color: 'primary.main', borderColor: 'primary.main', borderRadius: '12px', py: 1.5 }}>Pedidos</Button></Grid>
                    <Grid item xs={6} sm={4}><Button fullWidth variant="outlined" component={Link} to="/produtos" startIcon={<RestaurantMenu />} sx={{ color: 'primary.main', borderColor: 'primary.main', borderRadius: '12px', py: 1.5 }}>Produtos</Button></Grid>
                  </Grid>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="contained" size="large" onClick={() => document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' })} endIcon={<ArrowForward />} sx={{ borderRadius: '50px', px: 5, py: 1.5, fontSize: '1.1rem', background: `linear-gradient(90deg, #4E342E, #8D6E63)`, boxShadow: `0 4px 15px rgba(78, 52, 46, 0.3)`, textTransform: 'none', color: 'white' }}>
                      Ver Cardápio
                    </Button>
                  </motion.div>
                )}
              </Box>
            </Grid>

            {/* BENTO: FEATURED PRODUCT */}
            {!isLoggedIn && featuredProduct && (
              <Grid item xs={12} md={5} component={motion.div} variants={itemVariants}>
                <Box sx={{ ...glassStyle, p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                   <Box 
                    component="img"
                    src={featuredProduct.imagens?.find(img => img.eh_capa)?.imagem || featuredProduct.imagens?.[0]?.imagem} 
                    sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.1, filter: 'blur(4px) brightness(0.9)' }}
                  />
                  <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Chip label="🔥 Destaque do Dia" sx={{ bgcolor: '#FFB74D', color: '#3E2723', fontWeight: 'bold', mb: 2 }} />
                    <Typography variant="h4" fontWeight="800" gutterBottom sx={{ color: '#4E342E' }}>
                      {featuredProduct.nome}
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={2} my={2}>
                      <Typography variant="h5" sx={{ textDecoration: 'line-through', color: '#8D6E63', opacity: 0.8 }}>
                        R$ {Number(featuredProduct.preco_venda).toFixed(2)}
                      </Typography>
                      <Typography variant="h3" sx={{ color: '#2E7D32', fontWeight: 900 }}>
                        R$ {(Number(featuredProduct.preco_venda) * (1 - Number(featuredProduct.desconto_destaque) / 100)).toFixed(2)}
                      </Typography>
                    </Box>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="contained" size="large" onClick={handleAddFeatured} startIcon={<Add />} sx={{ bgcolor: '#4E342E', color: 'white', borderRadius: '50px', px: 4, py: 1.5, fontWeight: 'bold', '&:hover': { bgcolor: '#3E2723' } }}>
                        Adicionar
                      </Button>
                    </motion.div>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </motion.div>

      {/* SEÇÃO COMBOS */}
      {combos.length > 0 && (
        <Box sx={{ mb: 10 }}>
          <Typography variant="h3" gutterBottom fontWeight="800" textAlign="center" sx={{ mb: 6, color: '#4E342E' }}>
            Combos Especiais
          </Typography>
          <Grid container spacing={3}>
            {combos.map(combo => {
              const totalOriginal = combo.itens.reduce((acc, item) => acc + (Number(item.preco_original || 0) * Number(item.quantidade)), 0);
              const economia = totalOriginal - Number(combo.preco_venda);
              
              return (
                <Grid item xs={12} md={6} key={combo.id}>
                  <Box 
                    component={motion.div}
                    whileHover={{ y: -10, boxShadow: `0 20px 40px -10px rgba(78, 52, 46, 0.15)` }}
                    sx={{ ...glassStyle, p: 3, position: 'relative', overflow: 'hidden' }}
                  >
                    {economia > 0 && (
                      <Box sx={{ position: 'absolute', top: 16, right: 16, bgcolor: '#2E7D32', color: 'white', px: 2, py: 0.5, borderRadius: '50px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Economize R$ {economia.toFixed(2)}
                      </Box>
                    )}
                    {combo.imagem && (
                      <Box 
                        component="img" 
                        src={combo.imagem} 
                        alt={combo.nome} 
                        sx={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: '16px', mb: 2 }} 
                      />
                    )}
                    <Typography variant="h5" fontWeight="bold" gutterBottom color="primary.main">{combo.nome}</Typography>
                    <Typography variant="body2" sx={{ color: '#5D4037', mb: 3 }}>
                      Contém: {combo.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                      <Box>
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#8D6E63', display: 'block' }}>R$ {totalOriginal.toFixed(2)}</Typography>
                        <Typography variant="h5" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>R$ {Number(combo.preco_venda).toFixed(2)}</Typography>
                      </Box>
                      <motion.div whileTap={{ scale: 0.9 }}>
                        <IconButton 
                          onClick={() => handleQtyChange(combo.produto_vinculado_id, 1)}
                          sx={{ bgcolor: '#4E342E', color: 'white', '&:hover': { bgcolor: '#3E2723' } }}
                        >
                          <Add />
                        </IconButton>
                      </motion.div>
                    </Box>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      )}

      {/* SEÇÃO CARDÁPIO */}
      <Box id="cardapio" sx={{ mb: 12 }}>
        <Box mb={8}>
          <Typography variant="h3" gutterBottom fontWeight="800" textAlign="center" sx={{ mb: 6, color: '#4E342E' }}>
            Nosso Cardápio
          </Typography>
          <Grid container spacing={3} component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
            {products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id)).map(prod => {
              const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
              const qty = getQty(prod.id);
              const isPromo = prod.eh_destaque && prod.desconto_destaque > 0;
              const isPartner = clientUser?.is_revendedor;
              
              let precoFinal = Number(prod.preco_venda);
              let precoOriginal = Number(prod.preco_venda);

              if (isPartner) {
                precoFinal = Number(prod.preco_revenda);
              } else if (isPromo) {
                precoFinal = precoFinal * (1 - Number(prod.desconto_destaque) / 100);
              }

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
                      sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(255,255,255,0.8)', color: '#C62828', '&:hover': { bgcolor: 'white' }, zIndex: 10 }}
                      onClick={() => toggleFavorite(prod)}
                    >
                      {favorites.includes(Number(prod.id)) ? <Favorite sx={{ color: '#ef4444' }} /> : <FavoriteBorder />}
                    </IconButton>
                    
                    <Button 
                      size="small"
                      onClick={() => handleOpenDetails(prod)}
                      sx={{ 
                        position: 'absolute', 
                        top: 12, 
                        left: 12, 
                        bgcolor: '#4E342E', 
                        color: 'white', 
                        '&:hover': { bgcolor: '#3E2723', transform: 'scale(1.05)' }, 
                        zIndex: 10,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        borderRadius: '20px',
                        minWidth: 'auto',
                        px: 2,
                        py: 0.5
                      }}
                    >
                      Detalhes
                    </Button>
                    
                    {coverImage && (
                      <Box
                        component="img"
                        src={coverImage}
                        alt={prod.nome}
                        onClick={() => handleOpenDetails(prod)}
                        sx={{ width: '100%', height: 220, objectFit: 'cover', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', cursor: 'pointer' }}
                      />
                    )}
                    
                    <Box sx={{ p: 3, flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="div" fontWeight="bold" sx={{ mb: 1, color: '#4E342E' }}>
                        {prod.nome}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" sx={{ color: (isPromo || isPartner) ? '#E65100' : '#4E342E', fontWeight: 'bold' }}>
                          R$ {precoFinal.toFixed(2)}
                        </Typography>
                        {!isPartner && isPromo && <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#8D6E63' }}>R$ {precoOriginal.toFixed(2)}</Typography>}
                      </Box>
                    </Box>

                    <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, -1)} disabled={qty === 0} sx={{ color: '#4E342E', border: '1px solid #D7CCC8' }}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography fontWeight="bold">{qty}</Typography>
                        <IconButton size="small" onClick={() => handleQtyChange(prod.id, 1)} disabled={qty >= Number(prod.estoque)} sx={{ color: '#4E342E', border: '1px solid #D7CCC8' }}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      {qty > 0 && <Chip label="No Carrinho" size="small" sx={{ bgcolor: '#4E342E', color: 'white', fontWeight: 'bold' }} />}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>

      {/* SEÇÃO REVENDEDOR (B2B) - Com zIndex para garantir visibilidade */}
      <Box id="revendedor" sx={{ position: 'relative', zIndex: 2 }}>
        <ResellerCTA />
      </Box>

      {/* Botão Flutuante B2B */}
      {totalItems === 0 && (
      <Fab
        variant="extended"
        onClick={() => document.getElementById('revendedor')?.scrollIntoView({ behavior: 'smooth' })}
        sx={{
          position: 'fixed',
          bottom: { xs: 20, md: 40 },
          right: { xs: 20, md: 40 },
          zIndex: 1100,
          bgcolor: '#FFF3E0',
          color: '#E65100',
          fontWeight: 'bold',
          border: '1px solid #FFB74D',
          boxShadow: '0 4px 15px rgba(230, 81, 0, 0.2)',
          '&:hover': { bgcolor: '#FFE0B2' },
          textTransform: 'none'
        }}
      >
        <Storefront sx={{ mr: 1 }} />
        Seja um Revendedor Parceiro
      </Fab>
      )}

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
            bottom: { xs: 60, md: 24 },
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: { xs: '96%', md: '90%' },
            maxWidth: '600px',
            zIndex: 1200,
            pb: 'env(safe-area-inset-bottom)'
          }}
        >
          <Box sx={{ 
            ...glassStyle, 
            bgcolor: 'rgba(255, 255, 255, 0.95)', 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            border: `1px solid #4E342E`,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
          }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box sx={{ position: 'relative' }}>
                <ShoppingBag sx={{ color: '#4E342E', fontSize: 30 }} />
                <Badge 
                  badgeContent={totalItems} 
                  color="error" 
                  sx={{ position: 'absolute', top: -5, right: -5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#5D4037', lineHeight: 1 }}>Total do Pedido</Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main" sx={{ lineHeight: 1.2 }}>R$ {totalPrice.toFixed(2)}</Typography>
              </Box>
            </Box>
            <Button 
              variant="contained" 
              onClick={handleCheckout} 
              endIcon={<ArrowForward />}
              sx={{ 
                borderRadius: '50px', 
                bgcolor: '#4E342E', 
                color: 'white', 
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#3E2723' }
              }}
            >
              Finalizar
            </Button>
          </Box>
        </Box>
      )}
      </AnimatePresence>

      {/* Modal Cross-Selling */}
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
                      <Typography variant="subtitle2" fontWeight="bold" noWrap color="primary.main">{prod.nome}</Typography>
                      <Typography variant="body2" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                      <Button size="small" variant="contained" onClick={() => handleQtyChange(prod.id, 1)} sx={{ borderRadius: '20px', bgcolor: '#4E342E' }}>
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
            Continuar Comprando
          </Button>
          <Button onClick={() => { setCrossSellOpen(false); handleCheckout(); }} variant="contained" sx={{ bgcolor: '#4E342E', color: 'white', borderRadius: '50px' }}>
            Finalizar Pedido
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalhes do Produto */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', bgcolor: '#fff', color: '#3E2723' } }}>
        {selectedProduct && (
          <>
            <Box sx={{ position: 'relative', bgcolor: '#f5f5f5', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', overflow: 'hidden' }}>
               <Box 
                 component="img" 
                 src={selectedProduct.imagens && selectedProduct.imagens.length > 0 ? selectedProduct.imagens[selectedImageIndex]?.imagem : (selectedProduct.imagens?.[0]?.imagem || "")} 
                 sx={{ width: '100%', height: 350, objectFit: 'contain', display: 'block', mx: 'auto' }} 
               />
               <IconButton 
                 onClick={() => setDetailsOpen(false)}
                 sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' } }}
               >
                 <Close /> 
               </IconButton>
            </Box>

            {selectedProduct.imagens && selectedProduct.imagens.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, px: 3, py: 2, overflowX: 'auto', justifyContent: 'center', bgcolor: '#fafafa' }}>
                {selectedProduct.imagens.map((img, index) => (
                  <Box 
                    key={index}
                    component="img"
                    src={img.imagem}
                    onClick={() => setSelectedImageIndex(index)}
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      objectFit: 'cover', 
                      borderRadius: 2, 
                      cursor: 'pointer',
                      border: selectedImageIndex === index ? `2px solid #4E342E` : '2px solid transparent',
                      opacity: selectedImageIndex === index ? 1 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </Box>
            )}

            <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.8rem', color: '#4E342E', pt: 2 }}>
              {selectedProduct.nome}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ color: '#5D4037', lineHeight: 1.6, whiteSpace: 'pre-line', mb: 3, fontSize: '1.1rem' }}>
                {selectedProduct.descricao || "Sem descrição disponível."}
              </Typography>
              
              {clientUser?.is_revendedor && (
                <Chip label="Preço de Revenda" color="warning" size="small" sx={{ mb: 2 }} />
              )}

              <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
                 <Typography variant="h4" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>
                   R$ {clientUser?.is_revendedor ? Number(selectedProduct.preco_revenda).toFixed(2) : (selectedProduct.eh_destaque && selectedProduct.desconto_destaque > 0 
                     ? (Number(selectedProduct.preco_venda) * (1 - Number(selectedProduct.desconto_destaque) / 100)).toFixed(2)
                     : Number(selectedProduct.preco_venda).toFixed(2)
                   )}
                 </Typography>
                 {!clientUser?.is_revendedor && selectedProduct.eh_destaque && selectedProduct.desconto_destaque > 0 && (
                   <Typography variant="h6" sx={{ textDecoration: 'line-through', color: '#8D6E63' }}>
                     R$ {Number(selectedProduct.preco_venda).toFixed(2)}
                   </Typography>
                 )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
              <Button 
                variant="contained" 
                size="large"
                startIcon={<Add />}
                onClick={() => {
                  handleQtyChange(selectedProduct.id, 1);
                  setDetailsOpen(false);
                }}
                sx={{ bgcolor: '#4E342E', color: 'white', borderRadius: '50px', px: 4, py: 1.5 }}
              >
                Adicionar ao Carrinho
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', borderRadius: 2, fontWeight: 'bold' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
    </Box>
  );
}