import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Container, Grid, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper, Fab, Snackbar, Alert, Card, CardContent, CardMedia, CardActionArea } from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Add, Remove, ShoppingBag, Favorite, FavoriteBorder, Star, ArrowForward, AddCircleOutline, ListAlt, RestaurantMenu, PointOfSale, Inventory2, People, LocalOffer, Info, Close, Storefront, Map, Loyalty, DeleteOutline } from "@mui/icons-material";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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

const primaryColor = "#4E342E";
const secondaryColor = "#2E7D32";

export default function Home({ isLoggedIn, onLoginClick, clientUser, cart, addToCart, updateCartQuantity, removeFromCart, clearCart }) {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 500], [0, 200]); // Efeito Parallax: move o fundo mais devagar que o scroll
  const filterBg = useTransform(scrollY, [0, 300], ["brightness(0.6) blur(0px)", "brightness(0.6) blur(10px)"]); // Efeito Blur progressivo
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0]); // Efeito Fade Out no texto
  const buttonOpacity = useTransform(scrollY, [200, 500], [1, 0]); // Efeito Fade Out no botão (mais lento que o texto)

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
  const [zoomPosition, setZoomPosition] = useState('50% 50%'); // For image zoom
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [highlightItems, setHighlightItems] = useState([]);

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
      const availableProducts = allProducts.filter(p => Number(p.estoque) > 0 && p.ativo !== false);
      setProducts(availableProducts);
      
      // Encontra produtos destaque com estoque e seleciona um aleatório
      const featuredList = availableProducts.filter(p => p.eh_destaque);
      if (featuredList.length > 0) {
        const randomFeatured = featuredList[Math.floor(Math.random() * featuredList.length)];
        setFeaturedProduct(randomFeatured);

        // Select 2 additional items for the mosaic (excluding the main featured one)
        const others = availableProducts.filter(p => p.id !== randomFeatured.id)
                                      .sort(() => 0.5 - Math.random()).slice(0, 2);
        setHighlightItems(others);
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
    else if (currentQty === 0 && delta > 0) addToCart(prod, next);
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

  const handleClearCart = () => {
    if (window.confirm("Tem certeza que deseja esvaziar sua sacola?")) {
      clearCart();
    }
  };

  const handleOpenDetails = (prod) => {
    setSelectedProduct(prod);
    setSelectedImageIndex(0);
    setDetailsOpen(true);
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition(`${x}% ${y}%`);
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

  // Function to render a product card for the mosaic
  const renderMosaicCard = (prod, isLarge = false) => (
    <Box 
      sx={{ 
        height: '100%', 
        position: 'relative', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        transition: 'transform 0.3s',
        '&:hover': { transform: 'scale(1.02)' },
        bgcolor: 'white'
      }}
      onClick={() => prod ? handleOpenDetails(prod) : null}
    >
      <Box 
        component="img"
        src={prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem} 
        sx={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          filter: 'brightness(0.9)'
        }}
      />
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        width: '100%', 
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', 
        p: isLarge ? 4 : 2,
        color: 'white'
      }}>
        <Typography variant={isLarge ? "h4" : "h6"} fontWeight="bold">{prod.nome}</Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant={isLarge ? "h5" : "body1"} fontWeight="bold" color={secondaryColor}>
             R$ {Number(prod.preco_venda).toFixed(2)}
          </Typography>
          <Fab size="small" sx={{ bgcolor: primaryColor, color: 'white', '&:hover': { bgcolor: '#E65100' } }} onClick={(e) => { e.stopPropagation(); handleQtyChange(prod.id, 1); }}>
            <Add />
          </Fab>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', color: '#212121', overflowX: 'hidden', position: 'relative' }}>
      
      {/* 1. HERO SECTION (Updated) */}
      <Box sx={{ 
        position: 'relative', 
        height: { xs: '60vh', md: '70vh' }, 
        width: '100%',
        overflow: 'hidden',
        mb: 6
      }}>
        <Box 
          component={motion.div}
          style={{ y: yBg, filter: filterBg }}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10 }}
          sx={{
            position: 'absolute',
            top: '-15%', left: 0, width: '100%', height: '130%', // Altura extra e offset para compensar o movimento do parallax
            backgroundImage: `url(${config.home_bg || "https://images.unsplash.com/photo-1499636138143-bd630f5cf388?q=80&w=2070&auto=format&fit=crop"})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            willChange: 'transform, filter'
          }}
        />
        <Container maxWidth="lg" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Box component={motion.div} style={{ opacity: textOpacity }}>
            <Typography 
              variant="h1" 
              component={motion.h1}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              sx={{ 
                fontFamily: '"Playfair Display", serif', 
                color: 'white', 
                fontWeight: 900, 
                fontSize: { xs: '3rem', md: '5rem' },
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                mb: 2,
                letterSpacing: '2px'
              }}
            >
              {config.home_title.toUpperCase()}
            </Typography>
            <Typography 
              variant="h5" 
              component={motion.p}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              sx={{ color: '#FFCC80', mb: 4, fontWeight: 500, maxWidth: '600px', mx: 'auto', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            >
              {config.home_subtitle}
            </Typography>
          </Box>
          
          {!isLoggedIn && (
             <Box component={motion.div} style={{ opacity: buttonOpacity }}>
               <Button 
                variant="contained" 
                size="large" 
                onClick={() => document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' })} 
                sx={{ 
                  bgcolor: primaryColor, 
                  color: 'white', 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold',
                  px: 5, 
                  py: 1.5, 
                  borderRadius: '50px',
                  '&:hover': { bgcolor: '#E65100' }
                }}
              >
                PEÇA JÁ!
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pb: 20 }}>

        <Grid container spacing={4}>
          {/* MAIN CONTENT COLUMN */}
          <Grid item xs={12} md={8}>
            
            {/* 2. DESTAQUES (Mosaic Grid) */}
            {featuredProduct && (
              <Box sx={{ mb: 8 }}>
                 <Typography variant="h5" fontWeight="900" gutterBottom sx={{ mb: 3, borderLeft: `6px solid ${primaryColor}`, pl: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Destaques
                 </Typography>
                 <Grid container spacing={2} sx={{ height: { md: 450 } }}>
                   <Grid item xs={12} md={8} sx={{ height: { xs: 300, md: '100%' } }}>
                     {renderMosaicCard(featuredProduct, true)}
                   </Grid>
                   <Grid item xs={12} md={4} container direction="column" spacing={2} sx={{ height: { xs: 'auto', md: '100%' } }}>
                     {highlightItems.map((prod, idx) => (
                       <Grid item xs={12} key={prod.id || idx} sx={{ height: { xs: 200, md: '50%' } }}>
                         {renderMosaicCard(prod, false)}
                       </Grid>
                     ))}
                   </Grid>
                 </Grid>
              </Box>
            )}

            {/* SEÇÃO CARDÁPIO */}
            <Box id="cardapio">
              <Typography variant="h5" gutterBottom fontWeight="900" sx={{ mb: 3, borderLeft: `6px solid ${primaryColor}`, pl: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                Cardápio
              </Typography>
              <Grid container spacing={3} component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
                {products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id)).map(prod => {
                  const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
                  const qty = getQty(prod.id);
                  
                  return (
                    <Grid item xs={12} sm={6} key={prod.id} component={motion.div} variants={itemVariants}>
                      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                         <Box sx={{ position: 'relative', height: 180 }}>
                            <Box 
                              component="img" 
                              src={coverImage} 
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => handleOpenDetails(prod)}
                            />
                            <IconButton 
                              size="small"
                              onClick={() => toggleFavorite(prod)}
                              sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'white', '&:hover': { bgcolor: '#f5f5f5' } }}
                            >
                               {favorites.includes(Number(prod.id)) ? <Favorite sx={{ color: '#ef4444' }} /> : <FavoriteBorder />}
                            </IconButton>
                         </Box>
                         <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>{prod.nome}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>{prod.descricao}</Typography>
                            <Button size="small" variant="outlined" onClick={() => handleOpenDetails(prod)} sx={{ mt: 1, borderRadius: 20, textTransform: 'none', fontSize: '0.8rem' }}>
                              Ver Detalhes
                            </Button>
                         </CardContent>
                         <Box sx={{ p: 2, pt: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" fontWeight="bold" color="primary">R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                            {qty === 0 ? (
                              <Button variant="contained" size="small" onClick={() => handleQtyChange(prod.id, 1)} sx={{ borderRadius: 20 }}>
                                Adicionar
                              </Button>
                            ) : (
                              <Box display="flex" alignItems="center" gap={1}>
                                <IconButton size="small" onClick={() => handleQtyChange(prod.id, -1)} sx={{ border: '1px solid #ddd' }}><Remove fontSize="small" /></IconButton>
                                <Typography fontWeight="bold">{qty}</Typography>
                                <IconButton size="small" onClick={() => handleQtyChange(prod.id, 1)} sx={{ bgcolor: primaryColor, color: 'white', '&:hover': { bgcolor: '#FF8F00' } }}><Add fontSize="small" /></IconButton>
                              </Box>
                            )}
                         </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

          </Grid>

          {/* SIDEBAR COLUMN (Right) */}
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              position: 'sticky', 
              top: 100,
              // Limita a altura para garantir que não cubra o rodapé e permita rolagem interna se necessário
              maxHeight: 'calc(100vh - 120px)', 
              overflowY: 'auto',
              pb: 2
            }}>
              
              {/* Order Status / Bag */}
              <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, bgcolor: 'white', border: '1px solid #eee' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                  <ShoppingBag /> Sua Sacola
                </Typography>
                <AnimatePresence mode="wait">
                  {cart.length === 0 ? (
                    <motion.div
                      key="empty-cart"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Box textAlign="center" py={2}>
                         <Typography variant="body2" color="text.secondary" gutterBottom>
                           Sua sacola está vazia.
                         </Typography>
                         <Typography variant="caption" color="text.disabled">
                           Adicione itens deliciosos!
                         </Typography>
                      </Box>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="full-cart"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Box>
                         <Typography variant="body2" gutterBottom>{cart.length} item(s) adicionado(s)</Typography>
                         <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>
                           Total: R$ {totalPrice.toFixed(2)}
                         </Typography>
                         <Button fullWidth variant="contained" color="primary" onClick={handleCheckout} sx={{ mt: 1 }}>
                           Ver Sacola
                         </Button>
                         <Button 
                           fullWidth 
                           variant="text" 
                           color="error" 
                           size="small"
                           startIcon={<DeleteOutline />}
                           onClick={handleClearCart}
                           sx={{ mt: 1, textTransform: 'none' }}>
                           Limpar Sacola
                         </Button>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Paper>

            </Box>
          </Grid>
        </Grid>

      {/* COMBOS - REMOVED FROM MAIN FLOW TO SIMPLIFY NEW LAYOUT, OR MOVE TO MAIN COLUMN IF NEEDED. 
          For now, strictly following Sidebar request, assuming Combos are part of menu or separate. 
          Let's hide specific combo section to clean up or place it in menu. 
          I will comment it out to focus on the requested structure. 
      */}
      {/* 
      {combos.length > 0 && (
        <Box sx={{ mb: 10 }}>
           ...
                </Box>
              </Grid>
            </Grid>
        )} 
      */}

      {/* SEÇÃO REVENDEDOR (B2B) - Com zIndex para garantir visibilidade */}
      <Box id="revendedor" sx={{ position: 'relative', zIndex: 2, mt: 8 }}>
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
          bgcolor: '#FFFFFF',
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
          initial={{ y: 100, x: "-50%" }}
          animate={{ y: 0, x: "-50%" }}
          exit={{ y: 100, x: "-50%" }}
          sx={{ 
            position: 'fixed', 
            bottom: { xs: 'max(16px, env(safe-area-inset-bottom))', md: 24 },
            left: '50%', 
            width: { xs: '95%', md: '90%' },
            maxWidth: '600px',
            zIndex: 1200,
          }}
        >
          <Box sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.95)', 
            p: { xs: 1.5, md: 2 },
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 0 },
            border: 'none',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            borderRadius: '16px'
          }}>
            <Box display="flex" alignItems="center" gap={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Box sx={{ position: 'relative' }}>
                <ShoppingBag sx={{ color: primaryColor, fontSize: { xs: 24, md: 30 } }} />
                <Badge 
                  badgeContent={totalItems} 
                  color="error" 
                  sx={{ position: 'absolute', top: -5, right: -5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#5D4037', lineHeight: 1 }}>Total</Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main" sx={{ lineHeight: 1.2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>R$ {totalPrice.toFixed(2)}</Typography>
              </Box>
            </Box>
            <Button 
              variant="contained" 
              onClick={handleCheckout} 
              endIcon={<ArrowForward />}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                borderRadius: '50px', 
                bgcolor: primaryColor, 
                color: 'white', 
                fontWeight: 'bold',
                px: { xs: 2, md: 3 },
                fontSize: { xs: '0.85rem', md: '1rem' },
                '&:hover': { bgcolor: '#E65100' }
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
          <Button onClick={() => { setCrossSellOpen(false); handleCheckout(); }} sx={{ color: '#5D4037' }}>
            Continuar Comprando
          </Button>
          <Button onClick={() => { setCrossSellOpen(false); handleCheckout(); }} variant="contained" sx={{ bgcolor: '#4E342E', color: 'white', borderRadius: '50px' }}>
            Finalizar Pedido
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalhes do Produto */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '24px', bgcolor: '#fff', color: '#3E2723' } }}>
        {selectedProduct && (
          <Grid container>
            {/* Coluna da Imagem */}
            <Grid item xs={12} md={6} sx={{ bgcolor: '#f5f5f5', position: 'relative' }}>
              <IconButton 
                onClick={() => setDetailsOpen(false)}
                sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' } }}
              >
                <Close /> 
              </IconButton>
              <Box 
                onMouseMove={handleMouseMove}
                sx={{ 
                  width: '100%', 
                  height: { xs: 300, md: 'auto' },
                  minHeight: { md: 500 },
                  overflow: 'hidden', 
                  cursor: 'zoom-in',
                  position: 'relative'
                }}
              >
                <Box 
                  component="img" 
                  src={selectedProduct.imagens && selectedProduct.imagens.length > 0 ? selectedProduct.imagens[selectedImageIndex]?.imagem : ""} 
                  sx={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transition: 'transform 0.2s ease-out',
                    transformOrigin: zoomPosition,
                    '&:hover': {
                      transform: 'scale(2)'
                    }
                  }} 
                />
              </Box>

              {selectedProduct.imagens && selectedProduct.imagens.length > 1 && (
                <Box sx={{ display: 'flex', gap: 1, p: 2, overflowX: 'auto', justifyContent: 'center', bgcolor: '#fafafa' }}>
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
                        opacity: selectedImageIndex === index ? 1 : 0.7,
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </Box>
              )}
            </Grid>

            {/* Coluna de Detalhes */}
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
              <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.8rem', color: '#4E342E', pt: 4 }}>
                {selectedProduct.nome}
              </DialogTitle>
              <DialogContent sx={{ flexGrow: 1 }}>
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
                </Box>
              </DialogContent>
              <DialogActions sx={{ justifyContent: 'center', p: 3, pt: 0 }}>
                <Button 
                  variant="contained" 
                  size="large"
                  fullWidth
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
            </Grid>
          </Grid>
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