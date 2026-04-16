import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Container, Grid, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper, Fab, Snackbar, Alert, Card, CardContent, CardMedia, CardActionArea, LinearProgress } from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Add, Remove, ShoppingBag, Favorite, FavoriteBorder, Star, ArrowForward, AddCircleOutline, ListAlt, RestaurantMenu, PointOfSale, Inventory2, People, LocalOffer, Info, Close, Storefront, Map, Loyalty, DeleteOutline, CardGiftcard, AccessTime, WhatsApp, Instagram, CardGiftcardOutlined, Timer } from "@mui/icons-material";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import api from "../services/api";
import ResellerCTA from "../components/ResellerCTA";
import TestimonialsCarousel from "../components/TestimonialsCarousel";
import BoxBuilder from "../components/BoxBuilder";

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
  borderRadius: 5,
  overflow: 'hidden',
  bgcolor: '#FDFAF6',
  border: '1px solid rgba(212,88,10,0.10)',
  boxShadow: '0 2px 12px rgba(44,24,16,0.07)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 28px rgba(44,24,16,0.13)',
    borderColor: 'rgba(212,88,10,0.25)',
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
    opening_hours: "",
    whatsapp_number: "5555997312557",
    instagram_handle: "@tkookies_",
    instagram_url: "https://www.instagram.com/tkookies_/",
    instagram_hashtag: "#tkookies_"
  });
  const [saborSemana, setSaborSemana] = useState(null);
  const [countdown, setCountdown] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0 });
  const [ocasiaoFiltro, setOcasiaoFiltro] = useState("Todos");
  const [hoveredCard, setHoveredCard] = useState(null);
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
        // opening_hours pode chegar como string (do banco) ou já como array (do estado)
        const schedule = typeof cfg.opening_hours === 'string'
          ? JSON.parse(cfg.opening_hours)
          : cfg.opening_hours;
        // Usa == (não ===) para tolerar day como string ou número no JSON
        const today = schedule.find(s => Number(s.day) === day);
        if (!today || !today.open) return false;
        return current >= today.open_time && current <= today.close_time;
      } catch (e) {
        console.error("Erro no parsing do horário", e);
      }
    }

    // Fallback: formato antigo (open_days / open_time / close_time)
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
      const schedule = typeof cfg.opening_hours === 'string'
        ? JSON.parse(cfg.opening_hours)
        : cfg.opening_hours;
      const now = new Date();
      const day = now.getDay();
      const todaySchedule = schedule.find(s => Number(s.day) === day);

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
    const cachedCfg = sessionStorage.getItem('_cfg');
    if (cachedCfg) {
      const parsed = JSON.parse(cachedCfg);
      setConfig(prev => ({ ...prev, ...parsed }));
      setIsStoreOpen(checkIfOpen(parsed));
    } else {
      api.get("/configuracoes").then(res => {
        if (res.data && Object.keys(res.data).length > 0) {
          sessionStorage.setItem('_cfg', JSON.stringify(res.data));
          setConfig(prev => ({ ...prev, ...res.data }));
          setIsStoreOpen(checkIfOpen(res.data));
        }
      }).catch(err => console.log("Usando configurações padrão"));
    }

    // Carregar produtos para o cardápio
    api.get("/produtos").then(res => {
      const allProductsData = Array.isArray(res.data) ? res.data : [];
      // Filtra produtos ativos e não agregados, mas mantém os com estoque 0 para exibir "Indisponível"
      const displayableProducts = allProductsData
        .filter(p => p.ativo !== false && !p.eh_agregado)
        .sort((a, b) => {
          // Disponíveis primeiro, depois indisponíveis; dentro de cada grupo, ordem alfabética
          const aAvail = Number(a.estoque) > 0 ? 0 : 1;
          const bAvail = Number(b.estoque) > 0 ? 0 : 1;
          if (aAvail !== bAvail) return aAvail - bAvail;
          return a.nome.localeCompare(b.nome, 'pt-BR');
        });
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

  // Sabor da Semana: encontra o produto configurado
  useEffect(() => {
    if (config.sabor_semana_produto_id && products.length > 0) {
      const prod = products.find(p => String(p.id) === String(config.sabor_semana_produto_id));
      if (prod && config.sabor_semana_fim) {
        const fim = new Date(config.sabor_semana_fim);
        if (fim > new Date()) setSaborSemana(prod);
      }
    }
  }, [config, products]);

  // Countdown regressivo para o Sabor da Semana
  useEffect(() => {
    if (!saborSemana || !config.sabor_semana_fim) return;
    const calc = () => {
      const diff = new Date(config.sabor_semana_fim) - new Date();
      if (diff <= 0) { setSaborSemana(null); return; }
      setCountdown({
        dias: Math.floor(diff / 86400000),
        horas: Math.floor((diff % 86400000) / 3600000),
        minutos: Math.floor((diff % 3600000) / 60000),
        segundos: Math.floor((diff % 60000) / 1000)
      });
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [saborSemana, config.sabor_semana_fim]);

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
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}
            >
              <Box
                component="img"
                src="/logo-tkcookies-escuro.svg"
                alt="TKookies"
                sx={{
                  width: { xs: 300, sm: 420, md: 520 },
                  height: 'auto',
                  filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.45))'
                }}
              />
            </Box>
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
                  borderRadius: 50,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  '&:hover': { bgcolor: '#FFF8F0', transform: 'scale(1.03)' },
                  transition: 'all 0.2s ease',
                }}
              >
                🍪 PEÇA JÁ
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      {/* FAIXA DE CONFIANÇA — Marquee estilo Levain Bakery */}
      <Box sx={{
        bgcolor: espresso,
        py: 1.2,
        overflow: 'hidden',
        position: 'relative',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          width: 60,
          height: '100%',
          zIndex: 2,
        },
        '&::before': { left: 0, background: `linear-gradient(to right, ${espresso}, transparent)` },
        '&::after': { right: 0, background: `linear-gradient(to left, ${espresso}, transparent)` },
      }}>
        <Box sx={{
          display: 'flex',
          gap: 0,
          animation: 'marquee 28s linear infinite',
          width: 'max-content',
          '@keyframes marquee': {
            '0%': { transform: 'translateX(0)' },
            '100%': { transform: 'translateX(-50%)' },
          },
        }}>
          {[...Array(2)].map((_, rep) => (
            <Box key={rep} sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {[
                { icon: '🍪', text: 'Feito à mão' },
                { icon: '🥚', text: 'Ingredientes selecionados' },
                { icon: '📦', text: 'Entrega no mesmo dia' },
                { icon: '❤️', text: 'Com muito carinho' },
                { icon: '⭐', text: 'Receitas artesanais' },
                { icon: '🌾', text: 'Sem conservantes' },
                { icon: '🎁', text: 'Perfeito para presentear' },
                { icon: '✨', text: 'Qualidade premium' },
              ].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, borderRight: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.95rem' }}>{item.icon}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pb: 20 }}>

        <Grid container spacing={4}>
          {/* MAIN CONTENT COLUMN */}
          <Grid item xs={12} md={8}>
            
            {/* Banner Informativo de Horários - Visível apenas em mobile (no desktop fica no sidebar) */}
            <Box sx={{ mb: 4, p: 2, borderRadius: 1, bgcolor: '#FFF8F0', border: '1px solid #FFCC80', display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <AccessTime sx={{ color: terracotta }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">Horário de Atendimento</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getTodayScheduleLabel(config)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    🚚 Entregas das 14:00 às 17:00
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                <Chip
                  label={isStoreOpen ? "ABERTO AGORA" : "FECHADO NO MOMENTO"}
                  color={isStoreOpen ? "success" : "error"}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
                {!isStoreOpen && (
                  <Button
                    size="small"
                    href={`https://wa.me/${config.whatsapp_number || '5555997312557'}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido na TKookies')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: '#25D366', fontWeight: 'bold', fontSize: '0.75rem', p: 0, textTransform: 'none', lineHeight: 1.2 }}
                  >
                    💬 Deixe seu pedido pelo WhatsApp
                  </Button>
                )}
              </Box>
            </Box>

            {/* SABOR DA SEMANA */}
            {saborSemana && (
              <Box
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 6, borderRadius: 4, overflow: 'hidden', background: `linear-gradient(135deg, ${espresso} 0%, #4a2218 100%)`, color: 'white', p: { xs: 3, md: 4 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'center' }}
              >
                {saborSemana.imagens?.[0] && (
                  <Box component="img" src={saborSemana.imagens.find(i => i.eh_capa)?.imagem || saborSemana.imagens[0]?.imagem}
                    sx={{ width: { xs: '100%', md: 180 }, height: { xs: 200, md: 180 }, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                )}
                <Box flex={1}>
                  <Chip label="⭐ Sabor da Semana" sx={{ bgcolor: caramel, color: 'white', fontWeight: 'bold', mb: 1 }} size="small" />
                  <Typography variant="h5" fontWeight="900" gutterBottom>{saborSemana.nome}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>{saborSemana.descricao}</Typography>
                  <Typography variant="h6" sx={{ color: caramel, fontWeight: 'bold' }}>
                    R$ {Number(saborSemana.preco_venda).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 1 }}>Termina em</Typography>
                  <Box display="flex" gap={1} justifyContent="center">
                    {[{ v: countdown.dias, l: 'd' }, { v: countdown.horas, l: 'h' }, { v: countdown.minutos, l: 'm' }, { v: countdown.segundos, l: 's' }].map(({ v, l }) => (
                      <Box key={l} sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, px: 1.5, py: 1, minWidth: 44, textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight="bold">{String(v).padStart(2, '0')}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{l}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button variant="contained" onClick={() => handleQtyChange(saborSemana.id, 1)} disabled={!isStoreOpen || saborSemana.estoque <= 0}
                    sx={{ mt: 2, borderRadius: 50, bgcolor: caramel, '&:hover': { bgcolor: '#b07e20' }, fontWeight: 'bold' }}>
                    Quero esse!
                  </Button>
                </Box>
              </Box>
            )}

            {/* 2. DESTAQUES (Mosaic Grid) */}
            {featuredProduct && (
              <Box id="destaques-section" sx={{ mb: 8 }}>
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


            {/* SEÇÃO PRESENTEIE COM AMOR */}
            {(() => {
              // Ocasiões configuradas no admin, com fallback nas padrões
              const defaultOcasioes = [
                { value: "aniversario", label: "Aniversário" },
                { value: "casamento", label: "Casamento" },
                { value: "namoro", label: "Presente Romântico" },
                { value: "natal", label: "Natal" },
                { value: "pascoa", label: "Páscoa" },
                { value: "dia_das_maes", label: "Dia das Mães" },
              ];
              let ocasioesCfg = [];
              try { ocasioesCfg = JSON.parse(config.ocasioes || '[]'); } catch {}
              if (ocasioesCfg.length === 0) ocasioesCfg = defaultOcasioes;

              const ocasioesCfgValues = ocasioesCfg.map(o => o.value);

              // Apenas produtos com ao menos uma ocasião que ainda existe no config
              const prodsComOcasiao = products.filter(p => {
                if (!p.ocasiao) return false;
                return p.ocasiao.split(",").filter(Boolean).some(v => ocasioesCfgValues.includes(v));
              });
              if (prodsComOcasiao.length === 0) return null;

              // Só exibe chips que tenham ao menos 1 produto
              const ocasioesComProduto = ocasioesCfg.filter(o =>
                prodsComOcasiao.some(p => p.ocasiao.split(",").includes(o.value))
              );
              if (ocasioesComProduto.length === 0) return null;

              const filtrados = ocasiaoFiltro === "Todos"
                ? prodsComOcasiao
                : prodsComOcasiao.filter(p => p.ocasiao.split(",").includes(ocasiaoFiltro));

              return (
                <Box sx={{ mb: 8 }}>
                  <Typography variant="h5" fontWeight="900" sx={{ color: espresso, mb: 1 }}>
                    Presenteie com Amor
                  </Typography>
                  <Box sx={{ bgcolor: caramel, height: 3, width: 48, borderRadius: 2, mb: 3 }} />
                  <Box display="flex" gap={1} flexWrap="wrap" mb={3}>
                    <Chip label="Todos" onClick={() => setOcasiaoFiltro("Todos")}
                      sx={{ fontWeight: 'bold', cursor: 'pointer',
                        bgcolor: ocasiaoFiltro === "Todos" ? terracotta : 'rgba(212,88,10,0.1)',
                        color: ocasiaoFiltro === "Todos" ? 'white' : terracotta,
                        '&:hover': { bgcolor: terracotta, color: 'white' } }} />
                    {ocasioesComProduto.map(o => (
                      <Chip key={o.value} label={o.label} onClick={() => setOcasiaoFiltro(o.value)}
                        sx={{ fontWeight: 'bold', cursor: 'pointer',
                          bgcolor: ocasiaoFiltro === o.value ? terracotta : 'rgba(212,88,10,0.1)',
                          color: ocasiaoFiltro === o.value ? 'white' : terracotta,
                          '&:hover': { bgcolor: terracotta, color: 'white' } }} />
                    ))}
                  </Box>
                  <Grid container spacing={2}>
                    {filtrados.map(prod => {
                      const img = prod.imagens?.find(i => i.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
                      return (
                        <Grid item xs={6} sm={4} key={prod.id}>
                          <Card sx={{ ...cardSx, cursor: 'pointer', opacity: Number(prod.estoque) <= 0 ? 0.6 : 1 }} onClick={() => handleOpenDetails(prod)}>
                            <Box sx={{ position: 'relative' }}>
                              {img && <Box component="img" src={img} sx={{ width: '100%', height: 150, objectFit: 'cover' }} />}
                              {prod.brindes && prod.brindes.length > 0 && (
                                <Box sx={{ position: 'absolute', top: 6, left: 6, bgcolor: 'rgba(255,255,255,0.92)', borderRadius: 10, px: 0.8, py: 0.2, fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                  🎁 Brinde
                                </Box>
                              )}
                              {Number(prod.estoque) <= 0 && (
                                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', textAlign: 'center', fontSize: 11, py: 0.4, fontWeight: 'bold' }}>
                                  Indisponível
                                </Box>
                              )}
                            </Box>
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="subtitle2" fontWeight="bold" noWrap>{prod.nome}</Typography>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" sx={{ color: terracotta, fontWeight: 'bold' }}>
                                  R$ {Number(prod.preco_venda).toFixed(2)}
                                </Typography>
                                {Number(prod.estoque) > 0 && (
                                  <Typography variant="caption" sx={{ color: '#555' }}>
                                    {Number(prod.estoque)} un.
                                  </Typography>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              );
            })()}

            {/* SEÇÃO COMBOS ESPECIAIS */}
            {combos.length > 0 && (
              <Box id="combos-section" sx={{ mb: 8, mx: -3, px: 3, py: 5, bgcolor: '#FDF3E7', borderRadius: 5, border: '1px solid rgba(212,88,10,0.08)' }}>
                <Typography variant="h5" gutterBottom fontWeight="900" sx={{ color: espresso, mb: 1 }}>
                  Combos Especiais
                </Typography>
                <Box sx={{ bgcolor: caramel, height: 3, width: 48, borderRadius: 2, mb: 3 }} />
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

              <Grid container spacing={3} component={motion.div} variants={containerVariants} initial="hidden" animate={products.length > 0 ? "visible" : "hidden"}>
                {products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id)).map(prod => {
                  const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
                  const qty = getQty(prod.id);
                  
                  return (
                    <Grid item xs={12} sm={6} key={prod.id} component={motion.div} variants={itemVariants}>
                      <Card sx={{ ...cardSx }}
                        onMouseEnter={() => setHoveredCard(prod.id)}
                        onMouseLeave={() => setHoveredCard(null)}>
                         <Box sx={{ position: 'relative', height: { xs: 220, md: 280 }, overflow: 'hidden' }}>
                            <Box
                              component="img"
                              src={coverImage}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer',
                                position: 'absolute', inset: 0,
                                opacity: hoveredCard === prod.id && prod.imagens?.length > 1 ? 0 : 1,
                                transition: 'opacity 0.4s ease' }}
                              onClick={() => handleOpenDetails(prod)}
                            />
                            {prod.imagens?.length > 1 && (
                              <Box component="img"
                                src={prod.imagens.find(i => !i.eh_capa)?.imagem || prod.imagens[1]?.imagem}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer',
                                  position: 'absolute', inset: 0,
                                  opacity: hoveredCard === prod.id ? 1 : 0,
                                  transition: 'opacity 0.4s ease' }}
                                onClick={() => handleOpenDetails(prod)}
                              />
                            )}
                            
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
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              pb: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}>

              {/* Card: Status da Loja - apenas desktop */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: isStoreOpen ? '#F1F8E9' : '#FFF3E0', boxShadow: '0 4px 24px rgba(44,24,16,0.10)', display: { xs: 'none', md: 'block' } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Status da Loja
                  </Typography>
                  <Chip
                    label={isStoreOpen ? "Aberto" : "Fechado"}
                    color={isStoreOpen ? "success" : "error"}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccessTime sx={{ color: terracotta, fontSize: 18 }} />
                  <Typography variant="body2" color="text.secondary">
                    {getTodayScheduleLabel(config)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, pl: 3.5 }}>
                  🚚 Entregas das 14:00 às 17:00
                </Typography>
                {!isStoreOpen && (
                  <Button
                    fullWidth
                    href={`https://wa.me/${config.whatsapp_number || '5555997312557'}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido na TKookies')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    size="small"
                    sx={{ mt: 2, bgcolor: '#25D366', '&:hover': { bgcolor: '#1EBE5D' }, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                    startIcon={<WhatsApp />}
                  >
                    Pedir pelo WhatsApp
                  </Button>
                )}
              </Paper>

              {/* Card: Sabor da Semana resumido - apenas desktop */}
              {saborSemana && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: espresso, boxShadow: '0 4px 24px rgba(44,24,16,0.10)', display: { xs: 'none', md: 'block' } }}>
                  <Chip label="⭐ Sabor da Semana" sx={{ bgcolor: caramel, color: 'white', fontWeight: 'bold', mb: 1.5 }} size="small" />
                  {saborSemana.imagens?.[0] && (
                    <Box component="img"
                      src={saborSemana.imagens.find(i => i.eh_capa)?.imagem || saborSemana.imagens[0]?.imagem}
                      sx={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 2, mb: 1.5 }}
                    />
                  )}
                  <Typography variant="subtitle1" fontWeight="900" sx={{ color: 'white' }} gutterBottom>
                    {saborSemana.nome}
                  </Typography>
                  <Typography variant="h6" sx={{ color: caramel, fontWeight: 'bold', mb: 1.5 }}>
                    R$ {Number(saborSemana.preco_venda).toFixed(2)}
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleQtyChange(saborSemana.id, 1)}
                    disabled={!isStoreOpen || saborSemana.estoque <= 0}
                    sx={{ borderRadius: 2, bgcolor: caramel, '&:hover': { bgcolor: '#b07e20' }, fontWeight: 'bold', textTransform: 'none' }}
                  >
                    Quero esse sabor!
                  </Button>
                </Paper>
              )}

              {/* Card: Navegação Rápida - apenas desktop */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'white', boxShadow: '0 4px 24px rgba(44,24,16,0.10)', display: { xs: 'none', md: 'block' } }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Ir para
                </Typography>
                <Box display="flex" flexDirection="column" gap={0.5} mt={1}>
                  {[
                    { label: '🌟 Destaques', anchor: 'destaques-section' },
                    { label: '🍪 Cardápio', anchor: 'cardapio' },
                    { label: '🎁 Combos Especiais', anchor: 'combos-section' },
                  ].map(({ label, anchor }) => (
                    <Button
                      key={label}
                      fullWidth
                      variant="text"
                      size="small"
                      onClick={() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })}
                      sx={{ justifyContent: 'flex-start', color: espresso, borderRadius: 2, textTransform: 'none', fontWeight: 600, pl: 1, '&:hover': { bgcolor: '#FFF8F0', color: terracotta } }}
                    >
                      {label}
                    </Button>
                  ))}
                </Box>
              </Paper>

              {/* Card: Sua Sacola */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'white', boxShadow: '0 4px 24px rgba(44,24,16,0.10)' }}>
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

      {/* MONTE SEU KIT — full width, após cardápio */}
      {(() => {
        let kitDesc = {};
        try { kitDesc = JSON.parse(config.kit_descontos || '{}'); } catch {}
        const BOX_QTYS = [4, 6, 8, 12];
        const hasConfig = Object.keys(kitDesc).length > 0;
        const hasActiveSize = BOX_QTYS.some(q => !hasConfig || kitDesc[String(q)]?.ativo !== false);
        if (!products.length || !hasActiveSize) return null;
        return (
          <Box sx={{ mt: 8, p: { xs: 3, md: 5 }, bgcolor: '#FDF3E7', borderRadius: 5, border: '1px solid rgba(196,146,42,0.15)' }}>
            <BoxBuilder
              products={products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id))}
              addToCart={addToCart}
              isStoreOpen={isStoreOpen}
              kitDescontos={kitDesc}
            />
          </Box>
        );
      })()}


      {/* CARROSSEL DE DEPOIMENTOS */}
      <Box sx={{ mt: 8, mx: { xs: -2, lg: 0 }, bgcolor: espresso, borderRadius: { xs: 0, md: 5 }, py: 6, px: { xs: 2, md: 6 } }}>
        <Typography variant="h5" fontWeight="900" textAlign="center" sx={{ color: 'white', mb: 4 }}>
          O que nossos clientes dizem
        </Typography>
        <TestimonialsCarousel />
      </Box>

      {/* NOSSA HISTÓRIA */}
      {config.about_title && (
        <Box sx={{ mt: 8, bgcolor: espresso, borderRadius: 4, p: { xs: 3, md: 6 }, color: 'white' }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="overline" sx={{ color: caramel, fontWeight: 'bold', letterSpacing: 2 }}>Nossa História</Typography>
              <Typography variant="h4" fontWeight="900" gutterBottom sx={{ fontFamily: '"Playfair Display", serif', mt: 1 }}>
                {config.about_title}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.85, lineHeight: 1.8, mb: 3 }}>
                {config.about_desc}
              </Typography>
              <Button component={Link} to="/sobre" variant="outlined"
                sx={{ color: caramel, borderColor: caramel, borderRadius: 50, '&:hover': { bgcolor: caramel, color: 'white' } }}>
                Conheça nossa história
              </Button>
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container spacing={2}>
                {[
                  { title: config.about_card1_title, desc: config.about_card1_desc },
                  { title: config.about_card2_title, desc: config.about_card2_desc },
                  { title: config.about_card3_title, desc: config.about_card3_desc },
                ].filter(c => c.title).map((card, i) => (
                  <Grid item xs={12} key={i}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 3, p: 2, borderLeft: `3px solid ${caramel}` }}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: caramel }}>{card.title}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>{card.desc}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* INSTAGRAM / UGC */}
      <Box sx={{ mt: 8, textAlign: 'center', p: { xs: 3, md: 4 }, bgcolor: '#FFF8F0', borderRadius: 4 }}>
        <Instagram sx={{ fontSize: 40, color: terracotta, mb: 1 }} />
        <Typography variant="h5" fontWeight="900" sx={{ color: espresso, mb: 1 }}>
          Faça parte da nossa história
        </Typography>
        <Typography variant="body1" sx={{ color: '#795548', mb: 3, maxWidth: 500, mx: 'auto' }}>
          Compartilhe sua experiência com a gente! Marque <strong>{config.instagram_handle ? `@${config.instagram_handle.replace('@','')}` : '@tkookies_'}</strong> nas suas fotos!
        </Typography>
        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
          <Button variant="contained" href={config.instagram_url || 'https://www.instagram.com/tkookies_/'} target="_blank"
            startIcon={<Instagram />}
            sx={{ borderRadius: 50, bgcolor: '#E1306C', '&:hover': { bgcolor: '#c12457' }, fontWeight: 'bold' }}>
            {config.instagram_handle || '@tkookies_'}
          </Button>
          <Button variant="outlined" href={`https://wa.me/${config.whatsapp_number || '5555997312557'}?text=${encodeURIComponent('Olá! Gostaria de ver o cardápio da TKookies')}`}
            target="_blank" startIcon={<WhatsApp />}
            sx={{ borderRadius: 50, color: '#25D366', borderColor: '#25D366', '&:hover': { bgcolor: '#25D366', color: 'white' }, fontWeight: 'bold' }}>
            Ver no WhatsApp
          </Button>
        </Box>
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
          bottom: { xs: 76, md: 40 },
          right: { xs: 16, md: 40 },
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
            bottom: { xs: 'max(72px, calc(56px + env(safe-area-inset-bottom)))', md: 24 },
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