import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Container, Grid, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper, Fab, Snackbar, Alert, Card, CardContent, CardMedia, CardActionArea } from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Add, Remove, ShoppingBag, Favorite, FavoriteBorder, Star, ArrowForward, AddCircleOutline, ListAlt, RestaurantMenu, PointOfSale, Inventory2, People, LocalOffer, Info, Close, Storefront, Map, Loyalty, DeleteOutline, CardGiftcard, AccessTime } from "@mui/icons-material";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import api from "../services/api";
import ResellerCTA from "../components/ResellerCTA";
import TestimonialsCarousel from "../components/TestimonialsCarousel";

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

// Estilos "Modern Gourmet Bakery"
const terracotta = '#D4580A';
const espresso = '#2C1810';
const caramel = '#C4922A';

const cardSx = {
  borderRadius: 4,
  overflow: 'hidden',
  bgcolor: '#FFFFFF',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
};

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
    home_bg: "",
    open_days: "",
    opening_hours: ""
  });
  const [isStoreOpen, setIsStoreOpen] = useState(true);

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

  const checkIfOpen = (cfg) => {
    const now = new Date();
    const day = now.getDay();
    const current = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    if (cfg.opening_hours) {
      try {
        const schedule = JSON.parse(cfg.opening_hours);
        const today = schedule.find(s => s.day === day);
        if (!today || !today.open) return false;
        return current >= today.open_time && current <= today.close_time;
      } catch (e) {
        console.error("Erro no parsing do horário", e);
      }
    }

    // Verifica dia da semana
    if (cfg.open_days) {
      const allowedDays = cfg.open_days.split(',').map(Number);
      if (!allowedDays.includes(day)) return false;
    }

    if (!cfg.open_time || !cfg.close_time) return true;
    return current >= cfg.open_time && current <= cfg.close_time;
  };

  const getReadableDays = (daysStr) => {
    if (!daysStr) return "Todos os dias";
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const days = daysStr.split(',').map(Number).sort((a, b) => a - b);
    
    if (days.length === 7) return "Todos os dias";

    // Verifica se é uma sequência (ex: Segunda a Sexta)
    const isConsecutive = days.every((d, i) => i === 0 || d === days[i-1] + 1);
    if (isConsecutive && days.length > 1) {
      return `${dayNames[days[0]]} a ${dayNames[days[days.length - 1]]}`;
    }

    return days.map(d => dayNames[d]).join(', ');
  };

  const getTodayScheduleLabel = (cfg) => {
    if (!cfg.opening_hours) {
      return `${getReadableDays(cfg.open_days)} • ${cfg.open_time} às ${cfg.close_time}`;
    }
    try {
      const schedule = JSON.parse(cfg.opening_hours);
      const now = new Date();
      const day = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
      const todaySchedule = schedule.find(s => s.day === day);

      if (!todaySchedule || !todaySchedule.open) {
        return "Fechado hoje";
      }
      
      return `Aberto hoje das ${todaySchedule.open_time} às ${todaySchedule.close_time}`;
    } catch (e) {
      console.error("Erro ao parsear opening_hours:", e);
      return "Horário indisponível";
    }
  };

  useEffect(() => {
    // Removido o parseamento de res.data.opening_hours aqui, pois já é feito em checkIfOpen e getTodayScheduleLabel
    api.get("/configuracoes").then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        setConfig(prev => ({ ...prev, ...res.data }));
        setIsStoreOpen(checkIfOpen(res.data));
      }
    }).catch(err => console.log("Usando configurações padrão"));

    // Carregar produtos para o cardápio
    api.get("/produtos").then(res => {
      const allProductsData = Array.isArray(res.data) ? res.data : [];
      // Filtra produtos ativos e não agregados, mas mantém os com estoque 0 para exibir "Indisponível"
      const displayableProducts = allProductsData.filter(p => p.ativo !== false && !p.eh_agregado);
      setProducts(displayableProducts);
      
      // Encontra produtos destaque com estoque e seleciona um aleatório
      const featuredList = displayableProducts.filter(p => p.eh_destaque && Number(p.estoque) > 0);
      if (featuredList.length > 0) {
        const randomFeatured = featuredList[Math.floor(Math.random() * featuredList.length)];
        setFeaturedProduct(randomFeatured);

        // Select 2 additional items for the mosaic (excluding the main featured one)
        const others = displayableProducts.filter(p => p.id !== randomFeatured.id)
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
      alert("Faça login ou cadastre-se para aproveitar os Sabores da TKookies.");
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

  const handleQtyChange = async (prodId, delta) => {
    if (delta > 0 && !checkIfOpen(config)) {
      setIsStoreOpen(false);
      alert("No momento estamos fechados. Volte dentro do horário de atendimento!");
      return;
    }

    if (!clientUser && delta > 0) { // Se tentar adicionar e não estiver logado
      alert("Faça login ou cadastre-se para aproveitar os Sabores da TKookies.");
      onLoginClick();
      return;
    }

    const item = products.find(p => p.id === prodId) || combos.find(c => c.id === prodId);
    if (!item) return;

    const currentQty = getQty(prodId);
    const maxStock = Number(item.estoque) || 0;
    let next = currentQty + delta;

    if (next < 0) next = 0;
    
    if (next > maxStock) {
      alert(`Estoque insuficiente para ${item.nome}. Disponível: ${maxStock} unidade(s).`);
      // Se o usuário tentou adicionar mais do que o estoque, ajusta para o máximo disponível
      if (currentQty < maxStock) {
        next = maxStock;
      } else return; // Se já está no máximo ou tentando adicionar a 0 estoque, não faz nada
    }

    if (next === 0) await removeFromCart(prodId);
    else if (currentQty === 0 && delta > 0) await addToCart(item, next);
    else await updateCartQuantity(prodId, next);
  };

  const handleAddFeatured = async () => {
    if (!checkIfOpen(config)) {
      setIsStoreOpen(false);
      alert("No momento estamos fechados. Volte dentro do horário de atendimento!");
      return;
    }

    if (!clientUser) {
      alert("Faça login ou cadastre-se para aproveitar os Sabores da TKookies");
      onLoginClick();
      return;
    }

    if (!featuredProduct) return;
    
    const success = await addToCart(featuredProduct, 1);
    if (!success) return; // Não abre o modal se falhou ao adicionar

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

  const handleClearCart = async () => {
    if (window.confirm("Tem certeza que deseja esvaziar sua sacola?")) {
      await clearCart();
    }
  };

  const handleOpenDetails = (prod) => {
    // Google Analytics: Rastrear clique no produto
    if (window.gtag) {
      window.gtag('event', 'select_item', {
        item_list_id: "cardapio_principal",
        item_list_name: "Cardápio Principal",
        items: [{
          item_id: String(prod.id),
          item_name: prod.nome,
          price: Number(prod.preco_venda)
        }]
      });
    }
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
        borderRadius: '4px', 
        overflow: 'hidden', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
      {/* Tarja de Indisponível para produtos do mosaico */}
      {prod.estoque <= 0 && (
        <Chip
          label="Indisponível"
          color="error"
          size="small"
          sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 'bold', zIndex: 1 }}
        />
      )}
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
        {prod.estoque > 0 && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block' }}>
            {Number(prod.estoque)} disponíveis em estoque
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant={isLarge ? "h5" : "body1"} fontWeight="bold" sx={{ color: terracotta }}>
             R$ {Number(prod.preco_venda).toFixed(2)}
          </Typography>
          {prod.estoque > 0 ? (
            <Fab 
              size="small" 
              disabled={!isStoreOpen}
              sx={{ bgcolor: isStoreOpen ? terracotta : '#bdbdbd', color: 'white', '&:hover': { bgcolor: '#B84508' } }}
              onClick={(e) => { e.stopPropagation(); handleQtyChange(prod.id, 1); }}
            >
              <Add />
            </Fab>
          ) : (
            <Chip label="Esgotado" color="error" size="small" sx={{ fontWeight: 'bold' }} />
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#FFFAF5', minHeight: '100vh', color: '#2C1810', overflowX: 'hidden', position: 'relative' }}>
      
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
            top: '-15%', left: 0, width: '100%', height: '130%',
            backgroundImage: `url(${config.home_bg || "https://images.unsplash.com/photo-1499636138143-bd630f5cf388?q=80&w=2070&auto=format&fit=crop"})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            willChange: 'transform, filter'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(to bottom, rgba(44,24,16,0.25) 0%, rgba(44,24,16,0.75) 100%)',
            zIndex: 1
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
                fontSize: { xs: '2.8rem', md: '5rem' },
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                mb: 2,
                letterSpacing: '-1px'
              }}
            >
              {config.home_title.toUpperCase()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 4 }}>
              <Box sx={{ width: 32, height: 1, bgcolor: 'white', opacity: 0.7 }} />
              <Typography
                variant="h6"
                component={motion.p}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                sx={{ color: 'white', fontWeight: 500, maxWidth: '600px', textShadow: '0 2px 10px rgba(0,0,0,0.5)', margin: 0 }}
              >
                {config.home_subtitle}
              </Typography>
              <Box sx={{ width: 32, height: 1, bgcolor: 'white', opacity: 0.7 }} />
            </Box>
          </Box>

          {clientUser && (
            <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Favorite />}
                onClick={() => navigate("/meus-favoritos")}
                sx={{
                  bgcolor: 'white',
                  color: terracotta,
                  fontWeight: 'bold',
                  px: 3, borderRadius: '4px',
                  '&:hover': { bgcolor: '#FFF8F0' }
                }}
              >
                MEUS FAVORITOS ({favorites.length})
              </Button>
              <Button
                variant="outlined"
                onClick={() => document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' })}
                sx={{ color: 'white', borderColor: 'white', borderRadius: '4px', px: 3 }}
              >
                CARDÁPIO
              </Button>
            </Box>
          )}
          
          {!isLoggedIn && !clientUser && (
             <Box component={motion.div} style={{ opacity: buttonOpacity }}>
               <Button
                size="large"
                onClick={() => document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' })}
                sx={{
                  bgcolor: 'white',
                  color: terracotta,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  px: 5,
                  py: 1.8,
                  borderRadius: '4px',
                  '&:hover': { bgcolor: '#F5F5F5' }
                }}
              >
                🍪 PEÇA JÁ
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pb: 20 }}>

        <Grid container spacing={4}>
          {/* MAIN CONTENT COLUMN */}
          <Grid item xs={12} md={8}>
            
            {/* Banner Informativo de Horários - Agora no topo da listagem */}
            <Box sx={{ mb: 4, p: 2, borderRadius: 1, bgcolor: '#FFF8F0', border: '1px solid #FFCC80', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <AccessTime sx={{ color: terracotta }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">Horário de Atendimento</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getTodayScheduleLabel(config)}
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label={isStoreOpen ? "ABERTO AGORA" : "FECHADO NO MOMENTO"} 
                color={isStoreOpen ? "success" : "error"} 
                size="small" 
                sx={{ fontWeight: 'bold' }} 
              />
            </Box>

            {/* 2. DESTAQUES (Mosaic Grid) */}
            {featuredProduct && (
              <Box sx={{ mb: 8 }}>
                 <Typography variant="h5" fontWeight="900" gutterBottom sx={{ color: espresso, mb: 1 }}>
                    Destaques
                 </Typography>
                 <Box sx={{ bgcolor: terracotta, height: 3, width: 48, borderRadius: 2, mb: 3 }} />
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

            {/* SEÇÃO COMBOS ESPECIAIS */}
            {combos.length > 0 && (
              <Box sx={{ mb: 8 }}>
                <Typography variant="h5" gutterBottom fontWeight="900" sx={{ color: espresso, mb: 1 }}>
                  Combos Especiais
                </Typography>
                <Box sx={{ bgcolor: terracotta, height: 3, width: 48, borderRadius: 2, mb: 3 }} />
                <Grid container spacing={3}>
                  {combos.map(combo => {
                    const qty = getQty(combo.id);
                    const hasStock = Number(combo.estoque) > 0;
                    
                    return (
                      <Grid item xs={12} sm={6} key={combo.id}>
                        <Card sx={{ ...cardSx }}>
                           <Box sx={{ position: 'relative', height: { xs: 220, md: 280 } }}>
                              <Box 
                                component="img" 
                                src={combo.imagem || "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=1965&auto=format&fit=crop"} 
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              {!hasStock && (
                                <Chip label="Indisponível" color="error" size="small" sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 'bold' }} />
                              )}
                           </Box>
                           <CardContent sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.3 }}>{combo.nome}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {combo.itens?.map(i => `${i.quantidade}x ${i.nome}`).join(' + ')}
                              </Typography>
                              {hasStock && (
                                <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', mt: 1, display: 'block' }}>
                                  Disponível: {Number(combo.estoque)} combos
                                </Typography>
                              )}
                           </CardContent>
                           <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: terracotta }}>
                                R$ {Number(combo.preco_venda).toFixed(2)}
                              </Typography>
                              {!hasStock ? (
                                <Chip label="Esgotado" color="error" size="small" sx={{ fontWeight: 'bold', alignSelf: 'flex-start' }} />
                              ) : qty === 0 ? (
                                <Button variant="contained" fullWidth disabled={!isStoreOpen} onClick={() => handleQtyChange(combo.id, 1)} sx={{ borderRadius: 4 }}>
                                  Adicionar
                                </Button>
                              ) : (
                                <Box display="flex" alignItems="center" gap={0.5} sx={{ border: `2px solid ${terracotta}`, borderRadius: 4, p: 0.5 }}>
                                  <IconButton size="small" onClick={() => handleQtyChange(combo.id, -1)} disabled={!isStoreOpen}><Remove fontSize="small" /></IconButton>
                                  <Typography fontWeight="bold" sx={{ flex: 1, textAlign: 'center' }}>{qty}</Typography>
                                  <IconButton size="small" onClick={() => handleQtyChange(combo.id, 1)} sx={{ bgcolor: terracotta, color: 'white', flex: 1 }} disabled={!isStoreOpen}><Add fontSize="small" /></IconButton>
                                </Box>
                              )}
                           </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {/* SEÇÃO CARDÁPIO */}
            <Box id="cardapio">
              <Typography variant="h5" gutterBottom fontWeight="900" sx={{ color: espresso, mb: 1 }}>
                Cardápio
              </Typography>
              <Box sx={{ bgcolor: terracotta, height: 3, width: 48, borderRadius: 2, mb: 3 }} />

              <Grid container spacing={3} component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
                {products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id)).map(prod => {
                  const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
                  const qty = getQty(prod.id);
                  
                  return (
                    <Grid item xs={12} sm={6} key={prod.id} component={motion.div} variants={itemVariants}>
                      <Card sx={{ ...cardSx }}>
                         <Box sx={{ position: 'relative', height: { xs: 220, md: 280 } }}>
                            <Box 
                              component="img" 
                              src={coverImage} 
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => handleOpenDetails(prod)}
                            />
                            
                            {/* Marcador de Agregado Disponível */}
                            {prod.agregados && prod.agregados.length > 0 && (
                              <Chip 
                                label="Embalagem especial disponível" 
                                size="small" 
                                sx={{ 
                                  position: 'absolute', 
                                  bottom: 8, 
                                  left: 8, 
                                  bgcolor: 'rgba(255, 255, 255, 0.95)', 
                                  color: '#E65100', 
                                  fontWeight: 'bold', 
                                  fontSize: '0.7rem',
                                  height: 24,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }} 
                                icon={<CardGiftcard sx={{ '&&': { color: '#E65100', width: 16 } }} />}
                              />
                            )}

                        {/* Badge de Desconto */}
                        {prod.eh_destaque && Number(prod.desconto_destaque) > 0 && (
                          <Chip
                            label={`${Number(prod.desconto_destaque).toFixed(0)}% OFF`}
                            size="small"
                            sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 'bold', bgcolor: caramel, color: 'white', zIndex: 1 }}
                          />
                        )}

                        {/* Tarja de Indisponível */}
                        {prod.estoque <= 0 && (
                          <Chip
                            label="Indisponível"
                            color="error"
                            size="small"
                            sx={{ position: 'absolute', top: prod.eh_destaque && Number(prod.desconto_destaque) > 0 ? 40 : 8, left: 8, fontWeight: 'bold' }}
                          />
                        )}


                            <IconButton 
                              size="small"
                              onClick={() => toggleFavorite(prod)}
                              sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'white', '&:hover': { bgcolor: '#f5f5f5' } }}
                            >
                               {favorites.includes(Number(prod.id)) ? <Favorite sx={{ color: '#ef4444' }} /> : <FavoriteBorder />}
                            </IconButton>
                         </Box>
                         <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.3 }}>{prod.nome}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>{prod.descricao}</Typography>
                            {Number(prod.estoque) > 0 && (
                              <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', mt: 1, display: 'block' }}>
                                Estoque: {Number(prod.estoque)} unidades
                              </Typography>
                            )}
                            <Button size="small" variant="outlined" onClick={() => handleOpenDetails(prod)} sx={{ mt: 1, borderRadius: 4, textTransform: 'none', fontSize: '0.8rem' }}>
                              Ver Detalhes
                            </Button>
                         </CardContent>
                         <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box>
                              {prod.eh_destaque && Number(prod.desconto_destaque) > 0 ? (
                                <>
                                  <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#9E9E9E', display: 'block', lineHeight: 1 }}>
                                    R$ {Number(prod.preco_venda).toFixed(2)}
                                  </Typography>
                                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: terracotta }}>
                                    R$ {(Number(prod.preco_venda) * (1 - Number(prod.desconto_destaque) / 100)).toFixed(2)}
                                  </Typography>
                                </>
                              ) : (
                                <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: terracotta }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                              )}
                            </Box>
                            {prod.estoque <= 0 ? (
                              <Chip label="Indisponível" color="error" size="small" sx={{ fontWeight: 'bold', alignSelf: 'flex-start' }} />
                            ) : qty === 0 ? (
                              <Button variant="contained" fullWidth disabled={!isStoreOpen} onClick={() => handleQtyChange(prod.id, 1)} sx={{ borderRadius: 4 }}>
                                Adicionar
                              </Button>
                            ) : (
                              <Box display="flex" alignItems="center" gap={0.5} sx={{ border: `2px solid ${terracotta}`, borderRadius: 4, p: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleQtyChange(prod.id, -1)}
                                  disabled={qty <= 0 || !isStoreOpen}
                                  sx={{ flex: 1 }}
                                ><Remove fontSize="small" /></IconButton>
                                <Typography fontWeight="bold" sx={{ flex: 1, textAlign: 'center', opacity: isStoreOpen ? 1 : 0.5 }}>{qty}</Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleQtyChange(prod.id, 1)}
                                  sx={{ bgcolor: isStoreOpen ? terracotta : '#bdbdbd', color: 'white', flex: 1, '&:hover': { bgcolor: '#B84508' } }}
                                  disabled={!isStoreOpen}
                                ><Add fontSize="small" /></IconButton>
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
              <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, bgcolor: 'white', boxShadow: '0 4px 24px rgba(44,24,16,0.10)' }}>
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
                         <Button fullWidth variant="contained" onClick={handleCheckout} sx={{ mt: 1, borderRadius: 4 }}>
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

      {/* CARROSSEL DE DEPOIMENTOS */}
      <Box sx={{ mt: 8 }}>
        <TestimonialsCarousel />
      </Box>

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
          color: terracotta,
          fontWeight: 'bold',
          border: `1px solid ${terracotta}`,
          boxShadow: `0 4px 15px rgba(212, 88, 10, 0.2)`,
          '&:hover': { bgcolor: '#FFF8F0' },
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
            bgcolor: espresso,
            p: { xs: 1.5, md: 2 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 0 },
            border: 'none',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            borderRadius: '4px'
          }}>
            <Box display="flex" alignItems="center" gap={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <IconButton onClick={() => navigate("/carrinho")} sx={{ color: 'white' }}>
                <Badge badgeContent={totalItems} sx={{ '& .MuiBadge-badge': { bgcolor: terracotta } }}>
                  <ShoppingBag />
                </Badge>
              </IconButton>

              {clientUser && (
                <IconButton onClick={() => navigate("/meus-favoritos")} sx={{ color: '#ff6b6b' }}>
                  <Badge badgeContent={favorites.length} color="default">
                    <Favorite />
                  </Badge>
                </IconButton>
              )}

              <Box sx={{ ml: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1, display: 'block' }}>Total do pedido</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: caramel, lineHeight: 1.2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>R$ {totalPrice.toFixed(2)}</Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              onClick={handleCheckout}
              endIcon={<ArrowForward />}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                borderRadius: '4px',
                fontWeight: 'bold',
                px: { xs: 2, md: 3 },
                fontSize: { xs: '0.85rem', md: '1rem' }
              }}
            >
              Finalizar
            </Button>
          </Box>
        </Box>
      )}
      </AnimatePresence>

      {/* Modal Cross-Selling */}
      <Dialog open={crossSellOpen} onClose={() => setCrossSellOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '4px', bgcolor: '#FFFAF5', color: '#2C1810' } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: espresso }}>
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
                  <Box sx={{ bgcolor: '#FFF8F0', borderRadius: '4px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                     {coverImage && (
                        <Box component="img" src={coverImage} sx={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      )}
                    <Box sx={{ p: 2, textAlign: 'center', flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ color: espresso }}>{prod.nome}</Typography>
                      <Typography variant="body2" sx={{ color: terracotta, fontWeight: 'bold' }}>R$ {Number(prod.preco_venda).toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                      <Button size="small" variant="contained" onClick={() => handleQtyChange(prod.id, 1)} sx={{ borderRadius: '4px' }}>
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
          <Button onClick={() => { setCrossSellOpen(false); handleCheckout(); }} sx={{ color: '#795548' }}>
            Continuar Comprando
          </Button>
          <Button onClick={() => { setCrossSellOpen(false); handleCheckout(); }} variant="contained" sx={{ borderRadius: '4px' }}>
            Finalizar Pedido
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalhes do Produto */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '4px', bgcolor: '#FFFAF5', color: '#2C1810' } }}>
        {selectedProduct && (
          <Grid container>
            {/* Coluna da Imagem */}
            <Grid item xs={12} md={6} sx={{ bgcolor: '#FFF8F0', position: 'relative' }}>
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
                <Box sx={{ display: 'flex', gap: 1, p: 2, overflowX: 'auto', justifyContent: 'center', bgcolor: '#FFF8F0' }}>
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
                        border: selectedImageIndex === index ? `2px solid ${terracotta}` : '2px solid transparent',
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
              <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.8rem', color: espresso, pt: 4 }}>
                {selectedProduct.nome}
              </DialogTitle>
              <DialogContent sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ color: '#795548', lineHeight: 1.6, whiteSpace: 'pre-line', mb: 3, fontSize: '1.1rem' }}>
                  {selectedProduct.descricao || "Sem descrição disponível."}
                </Typography>

                {Number(selectedProduct.estoque) > 0 && (
                  <Typography variant="subtitle2" sx={{ color: terracotta, mb: 2, fontWeight: 'bold' }}>
                    Disponibilidade: {Number(selectedProduct.estoque)} unidades
                  </Typography>
                )}

                {clientUser?.is_revendedor && (
                  <Chip label="Preço de Revenda" color="warning" size="small" sx={{ mb: 2 }} />
                )}

                <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
                  <Typography sx={{ fontSize: '1.8rem', color: terracotta, fontWeight: 'bold' }}>
                    R$ {clientUser?.is_revendedor ? Number(selectedProduct.preco_revenda).toFixed(2) : (selectedProduct.eh_destaque && selectedProduct.desconto_destaque > 0
                      ? (Number(selectedProduct.preco_venda) * (1 - Number(selectedProduct.desconto_destaque) / 100)).toFixed(2)
                      : Number(selectedProduct.preco_venda).toFixed(2)
                    )}
                  </Typography>
                </Box>
              </DialogContent>
              {selectedProduct.estoque <= 0 && (
                <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
                  Este produto está indisponível no momento.
                </Alert>
              )}
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
                  disabled={selectedProduct.estoque <= 0 || !isStoreOpen}
                  sx={{ borderRadius: '4px', px: 4, py: 1.5 }}
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