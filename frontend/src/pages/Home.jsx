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
    <Box sx={{ bgcolor: 'var(--paper)', minHeight: '100vh', overflowX: 'hidden', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } }, '@keyframes marqueeScroll': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } } }}>



      {/* ── HERO ──────────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative',
        mt: '-68px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        mx: { xs: -3, md: '-6vw' },
        overflow: 'hidden',
      }}>
        {/* Imagem de fundo (configurada em Configurações) */}
        {config.home_bg && (
          <Box
            component="img"
            src={config.home_bg}
            alt=""
            sx={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )}
        {/* Overlay escuro */}
        <Box sx={{
          position: 'absolute', inset: 0,
          background: config.home_bg
            ? 'linear-gradient(to bottom, rgba(26,15,8,.42) 0%, rgba(26,15,8,.62) 100%)'
            : 'linear-gradient(135deg, #1A0F08 0%, #2C1810 100%)',
        }} />

        {/* Conteúdo centralizado */}
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: { xs: 3, md: '8vw' }, pt: '68px' }}>
          <Typography sx={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 300,
            fontSize: 'clamp(44px, 7.5vw, 112px)',
            color: '#FBF6EC',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            display: 'block',
          }}>
            Um pedacinho
          </Typography>
          <Typography sx={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(44px, 7.5vw, 112px)',
            color: 'var(--terracotta)',
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            display: 'block',
          }}>
            de felicidade
          </Typography>
          <Button
            onClick={() => document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' })}
            sx={{
              mt: { xs: 4, md: 5 },
              borderRadius: 999, px: { xs: 3.5, md: 5 }, py: 1.5,
              border: '1px solid rgba(251,246,236,.55)',
              color: '#FBF6EC',
              fontFamily: 'Inter', fontSize: '13px', fontWeight: 500,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              '&:hover': { bgcolor: 'rgba(251,246,236,.1)', borderColor: '#FBF6EC' },
              transition: 'all .4s cubic-bezier(.2,.8,.2,1)',
            }}
          >
            Ver Cardápio
          </Button>
        </Box>
      </Box>

      {/* ── MARQUEE ────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: 'var(--ink)', py: '14px', overflow: 'hidden', position: 'relative', mt: 0 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          width: 'max-content',
          animation: 'marqueeScroll 38s linear infinite',
        }}>
          {[...Array(2)].map((_, rep) => (
            <Box key={rep} sx={{ display: 'flex', alignItems: 'center' }}>
              {[
                'Feito à mão',
                'Ingredientes selecionados',
                'Entrega no mesmo dia',
                'Receitas artesanais',
                'Sem conservantes',
                'Perfeito para presentear',
                'Qualidade premium',
                'Fermentação lenta',
              ].map((text, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Typography sx={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontWeight: 300,
                    fontSize: { xs: '24px', md: '36px' },
                    color: 'var(--paper)',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    px: { xs: 2, md: 3 },
                  }}>
                    {text}
                  </Typography>
                  <Typography sx={{ color: 'var(--terracotta)', fontSize: { xs: '18px', md: '24px' }, px: 0.5, flexShrink: 0 }}>✦</Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── STATUS DA LOJA (slim bar) ─────────────────────────────── */}
      <Box sx={{ borderBottom: '1px solid var(--rule)', py: 1, px: { xs: 3, md: '6vw' } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            {getTodayScheduleLabel(config)} · Entregas 14–17h
          </Typography>
          {!isStoreOpen && (
            <Button
              size="small"
              href={`https://wa.me/${config.whatsapp_number || '5555997312557'}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido na TKookies')}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#25D366', fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid #25D366', borderRadius: 999, py: 0.3, px: 1.5 }}
            >
              Pedir pelo WhatsApp
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ px: { xs: 3, md: '6vw' }, position: 'relative', zIndex: 1, pb: 20 }}>

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

              // Se nenhuma ocasião válida estiver selecionada, usa a primeira por padrão
              const filtroEfetivo = ocasioesComProduto.some(o => o.value === ocasiaoFiltro)
                ? ocasiaoFiltro
                : ocasioesComProduto[0]?.value;

              const filtrados = filtroEfetivo
                ? prodsComOcasiao.filter(p => p.ocasiao.split(",").includes(filtroEfetivo))
                : prodsComOcasiao;

              return (
                <Box sx={{ mb: 8 }}>
                  <Typography variant="h5" fontWeight="900" sx={{ color: espresso, mb: 1 }}>
                    Presenteie com Amor
                  </Typography>
                  <Box sx={{ bgcolor: caramel, height: 3, width: 48, borderRadius: 2, mb: 3 }} />
                  <Box display="flex" gap={1} flexWrap="wrap" mb={3}>
                    {ocasioesComProduto.map(o => (
                      <Chip key={o.value} label={o.label} onClick={() => setOcasiaoFiltro(o.value)}
                        sx={{ fontWeight: 'bold', cursor: 'pointer',
                          bgcolor: filtroEfetivo === o.value ? terracotta : 'rgba(212,88,10,0.1)',
                          color: filtroEfetivo === o.value ? 'white' : terracotta,
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

            {/* ── COMBOS ───────────────────────────────────────────────── */}
            {combos.length > 0 && (
              <Box id="combos-section" sx={{ mt: 10, mx: { xs: -3, md: '-6vw' }, px: { xs: 3, md: '6vw' }, py: { xs: 8, md: 12 }, bgcolor: 'var(--ink)' }}>
                {/* Header 2-col */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, mb: 6, pb: 4, borderBottom: '1px solid rgba(251,246,236,.12)' }}>
                  <Box>
                    <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 1.5 }}>
                      § 02 — Combos Especiais
                    </Typography>
                    <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: { xs: '34px', md: '48px' }, letterSpacing: '-0.04em', color: 'var(--paper)', lineHeight: 1.05 }}>
                      Mais sabor,{' '}
                      <Typography component="span" sx={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', color: 'var(--caramel)', fontSize: 'inherit', letterSpacing: 'inherit' }}>
                        mais alegria.
                      </Typography>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Typography sx={{ fontFamily: 'Inter', fontSize: '15px', color: 'var(--paper)', opacity: 0.5, lineHeight: 1.7, maxWidth: 400 }}>
                      Kits cuidadosamente montados para compartilhar. Cada combo é feito por encomenda com os sabores do dia.
                    </Typography>
                  </Box>
                </Box>

                {/* Grid de combos */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
                  {combos.map((combo, idx) => {
                    const qty = getQty(combo.id);
                    const hasStock = Number(combo.estoque) > 0;
                    const numStr = `№ ${String(idx + 1).padStart(2, '0')}`;

                    return (
                      <Box key={combo.id} sx={{ display: 'flex', flexDirection: 'column', border: '1px solid rgba(251,246,236,.12)', borderRadius: '2px', overflow: 'hidden', bgcolor: 'rgba(251,246,236,.04)', transition: 'border-color .4s', '&:hover': { borderColor: 'rgba(200,132,58,.4)' } }}>
                        {/* Imagem */}
                        <Box sx={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden' }}>
                          <Box component="img"
                            src={combo.imagem || "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=800&auto=format&fit=crop"}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .8s cubic-bezier(.2,.8,.2,1)', '&:hover': { transform: 'scale(1.04)' } }}
                          />
                          {/* Número mix-blend */}
                          <Typography sx={{ position: 'absolute', top: 12, left: 14, fontFamily: '"DM Mono", monospace', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper)', mixBlendMode: 'difference', zIndex: 1 }}>
                            {numStr}
                          </Typography>
                          {!hasStock && (
                            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(26,15,8,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--paper)' }}>Esgotado</Typography>
                            </Box>
                          )}
                        </Box>

                        {/* Corpo */}
                        <Box sx={{ p: 2.5, flexGrow: 1 }}>
                          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 400, fontSize: '22px', color: 'var(--paper)', letterSpacing: '-0.025em', lineHeight: 1.1, mb: 1 }}>
                            {combo.nome}
                          </Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--paper)', opacity: 0.5, lineHeight: 1.6 }}>
                            {combo.itens?.map(i => `${i.quantidade}× ${i.nome}`).join(' · ')}
                          </Typography>
                          {hasStock && (
                            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--caramel)', mt: 1, opacity: 0.7 }}>
                              {Number(combo.estoque)} disponíveis
                            </Typography>
                          )}
                        </Box>

                        {/* Footer */}
                        <Box sx={{ px: 2.5, pb: 2.5, pt: 0, borderTop: '1px solid rgba(251,246,236,.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
                            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: '12px', color: 'var(--paper)', opacity: 0.6 }}>R$</Typography>
                            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 400, fontSize: '28px', color: 'var(--paper)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                              {Math.floor(Number(combo.preco_venda))}
                            </Typography>
                            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: '14px', color: 'var(--paper)', opacity: 0.5, alignSelf: 'flex-end', mb: '2px' }}>
                              ,{String(Number(combo.preco_venda).toFixed(2)).slice(-2)}
                            </Typography>
                          </Box>
                          {!hasStock ? null : qty === 0 ? (
                            <Box onClick={() => handleQtyChange(combo.id, 1)} sx={{ borderRadius: 999, px: 2.5, py: 0.9, bgcolor: 'var(--terracotta)', color: 'var(--paper)', fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, cursor: isStoreOpen ? 'pointer' : 'default', opacity: isStoreOpen ? 1 : 0.5, transition: 'all .3s', userSelect: 'none', whiteSpace: 'nowrap' }}>
                              + Sacola
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(251,246,236,.2)', borderRadius: 999, overflow: 'hidden' }}>
                              <IconButton size="small" onClick={() => handleQtyChange(combo.id, -1)} sx={{ p: 0.5, borderRadius: 0, color: 'var(--paper)' }}><Remove sx={{ fontSize: 14 }} /></IconButton>
                              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '12px', px: 1, color: 'var(--paper)', minWidth: 20, textAlign: 'center' }}>{qty}</Typography>
                              <IconButton size="small" onClick={() => handleQtyChange(combo.id, 1)} disabled={!isStoreOpen} sx={{ p: 0.5, borderRadius: 0, bgcolor: 'var(--terracotta)', color: 'var(--paper)', '&:hover': { bgcolor: 'var(--terracotta)' } }}><Add sx={{ fontSize: 14 }} /></IconButton>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}


            {/* ── CARDÁPIO ──────────────────────────────────────────────── */}
            <Box id="cardapio" sx={{ mt: 10 }}>

              {/* Label da seção */}
              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 4, display: 'block' }}>
                § 01 — O Cardápio
              </Typography>

              {/* Grid de produtos — editorial */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
                {products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id)).map((prod, idx) => {
                  const coverImage = prod.imagens?.find(img => img.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
                  const altImage = prod.imagens?.find(i => !i.eh_capa)?.imagem || prod.imagens?.[1]?.imagem;
                  const qty = getQty(prod.id);
                  const precoFinal = prod.eh_destaque && Number(prod.desconto_destaque) > 0
                    ? Number(prod.preco_venda) * (1 - Number(prod.desconto_destaque) / 100)
                    : Number(prod.preco_venda);
                  const numStr = String(idx + 1).padStart(2, '0');

                  return (
                    <Box
                      key={prod.id}
                      sx={{
                        display: 'flex', flexDirection: 'column',
                        border: '1px solid var(--rule)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        bgcolor: 'var(--paper)',
                        opacity: Number(prod.estoque) <= 0 ? 0.65 : 1,
                        transition: 'border-color .4s cubic-bezier(.2,.8,.2,1)',
                        '&:hover': { borderColor: 'var(--caramel)' },
                      }}
                    >
                      {/* Imagem */}
                      <Box
                        sx={{ position: 'relative', aspectRatio: '5/4', overflow: 'hidden', cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredCard(prod.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => handleOpenDetails(prod)}
                      >
                        {/* Número */}
                        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2, width: 28, height: 28, borderRadius: '50%', bgcolor: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>{numStr}</Typography>
                        </Box>

                        {/* Badge pill */}
                        {prod.eh_destaque && Number(prod.desconto_destaque) > 0 && (
                          <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2, bgcolor: 'var(--paper)', borderRadius: 999, px: 1.5, py: 0.3 }}>
                            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terracotta)' }}>
                              {Number(prod.desconto_destaque).toFixed(0)}% off
                            </Typography>
                          </Box>
                        )}
                        {prod.agregados?.length > 0 && (
                          <Box sx={{ position: 'absolute', bottom: 10, left: 10, zIndex: 2, bgcolor: 'var(--paper)', borderRadius: 999, px: 1.5, py: 0.3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CardGiftcard sx={{ fontSize: 11, color: 'var(--terracotta)' }} />
                            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--terracotta)' }}>Kit disponível</Typography>
                          </Box>
                        )}

                        {/* Cover image */}
                        <Box component="img" src={coverImage} sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: hoveredCard === prod.id && altImage ? 0 : 1, transition: 'opacity .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1)', transform: hoveredCard === prod.id ? 'scale(1.05)' : 'scale(1)' }} />
                        {altImage && (
                          <Box component="img" src={altImage} sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: hoveredCard === prod.id ? 1 : 0, transition: 'opacity .8s cubic-bezier(.2,.8,.2,1)' }} />
                        )}

                        {/* Indisponível */}
                        {Number(prod.estoque) <= 0 && (
                          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(26,15,8,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--paper)' }}>Indisponível</Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Corpo */}
                      <Box sx={{ p: { xs: 1.5, md: 2 }, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--caramel)' }}>
                          Cookie artesanal
                        </Typography>
                        <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 400, fontSize: { xs: '18px', md: '22px' }, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                          {prod.nome}
                        </Typography>
                        <Typography sx={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--ink)', opacity: 0.6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {prod.descricao}
                        </Typography>
                        {Number(prod.estoque) > 0 && (
                          <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', opacity: 0.45, mt: 0.5 }}>
                            {Number(prod.estoque)} un. disponíveis
                          </Typography>
                        )}
                      </Box>

                      {/* Footer */}
                      <Box sx={{ px: { xs: 1.5, md: 2 }, pb: { xs: 1.5, md: 2 }, pt: 0, borderTop: '1px solid var(--rule)', mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box>
                          {prod.eh_destaque && Number(prod.desconto_destaque) > 0 && (
                            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: '12px', color: 'var(--ink)', opacity: 0.4, textDecoration: 'line-through', lineHeight: 1 }}>
                              R$ {Number(prod.preco_venda).toFixed(2)}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
                            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: '12px', color: 'var(--terracotta)' }}>R$</Typography>
                            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 400, fontSize: { xs: '22px', md: '28px' }, color: 'var(--terracotta)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                              {Math.floor(precoFinal)}
                            </Typography>
                            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: '13px', color: 'var(--terracotta)', opacity: 0.6, alignSelf: 'flex-end', mb: '2px' }}>
                              ,{String(precoFinal.toFixed(2)).slice(-2)}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => toggleFavorite(prod)} sx={{ color: favorites.includes(Number(prod.id)) ? '#ef4444' : 'var(--ink)', opacity: 0.6, p: 0.5 }}>
                            {favorites.includes(Number(prod.id)) ? <Favorite sx={{ fontSize: 16 }} /> : <FavoriteBorder sx={{ fontSize: 16 }} />}
                          </IconButton>
                          {Number(prod.estoque) <= 0 ? null : qty === 0 ? (
                            <Box
                              onClick={() => handleQtyChange(prod.id, 1)}
                              sx={{
                                borderRadius: 999, px: 2, py: 0.75,
                                bgcolor: 'var(--ink)', color: 'var(--paper)',
                                fontFamily: 'Inter', fontSize: '12px', fontWeight: 500,
                                cursor: isStoreOpen ? 'pointer' : 'default',
                                opacity: isStoreOpen ? 1 : 0.5,
                                transition: 'all .3s',
                                whiteSpace: 'nowrap',
                                userSelect: 'none',
                              }}
                            >
                              + Sacola
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid var(--rule)', borderRadius: 999, overflow: 'hidden' }}>
                              <IconButton size="small" onClick={() => handleQtyChange(prod.id, -1)} sx={{ p: 0.5, borderRadius: 0 }}><Remove sx={{ fontSize: 14 }} /></IconButton>
                              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '12px', px: 1, minWidth: 20, textAlign: 'center' }}>{qty}</Typography>
                              <IconButton size="small" onClick={() => handleQtyChange(prod.id, 1)} disabled={!isStoreOpen} sx={{ p: 0.5, borderRadius: 0, bgcolor: 'var(--ink)', color: 'var(--paper)', '&:hover': { bgcolor: 'var(--ink)' } }}><Add sx={{ fontSize: 14 }} /></IconButton>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

      {/* MONTE SEU KIT — full width, após cardápio */}
      {products.length > 0 && (() => {
        let kitDesc = {};
        try { kitDesc = JSON.parse(config.kit_descontos || '{}'); } catch {}
        return (
          <BoxBuilder
            products={products.filter(p => !combos.some(c => c.produto_vinculado_id === p.id))}
            addToCart={addToCart}
            isStoreOpen={isStoreOpen}
            kitDescontos={kitDesc}
          />
        );
      })()}


      {/* ── DIÁRIO (Depoimentos) ─────────────────────────────────── */}
      <Box sx={{ mt: 10, mx: { xs: -3, md: '-6vw' }, px: { xs: 3, md: '6vw' }, py: { xs: 8, md: 12 }, bgcolor: 'var(--cream)' }}>
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 1.5 }}>
            § 03 — O Diário
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: { xs: '34px', md: '48px' }, letterSpacing: '-0.04em', color: 'var(--ink)', lineHeight: 1.05 }}>
              O que dizem por aí
            </Typography>
            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--caramel)' }}>
              ★ 4.94 · 312 avaliações
            </Typography>
          </Box>
        </Box>
        <TestimonialsCarousel />
      </Box>

      {/* ── HISTÓRIA ────────────────────────────────────────────── */}
      {config.about_title && (
        <Box sx={{ mt: 10 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 6, md: 10 }, alignItems: 'start' }}>
            {/* Esquerda */}
            <Box>
              {/* CookieMark SVG */}
              <Box sx={{ mb: 3 }}>
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="58" stroke="var(--ink)" strokeWidth="1.5" opacity="0.3"/>
                  <circle cx="60" cy="60" r="48" stroke="var(--ink)" strokeWidth="1" opacity="0.15"/>
                  {[[60,28],[82,38],[92,60],[82,82],[60,92],[38,82],[28,60],[38,38]].map(([cx,cy],i) => (
                    <circle key={i} cx={cx} cy={cy} r="4" fill="var(--ink)" opacity="0.5"/>
                  ))}
                  <circle cx="60" cy="60" r="6" fill="var(--terracotta)" opacity="0.8"/>
                </svg>
              </Box>
              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 1.5 }}>
                § 04 — Nossa História
              </Typography>
              <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: { xs: '34px', md: '52px' }, letterSpacing: '-0.04em', color: 'var(--ink)', lineHeight: 1.05, mb: 3 }}>
                {config.about_title}
              </Typography>
              <Typography sx={{ fontFamily: 'Inter', fontSize: '15px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.8, mb: 3, maxWidth: 440 }}>
                {config.about_desc}
              </Typography>
              <Button component={Link} to="/sobre" sx={{ borderRadius: 999, px: 4, py: 1.5, border: '1px solid var(--rule)', color: 'var(--ink)', bgcolor: 'transparent', fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, '&:hover': { borderColor: 'var(--ink)', bgcolor: 'transparent' }, transition: 'all .4s cubic-bezier(.2,.8,.2,1)' }}>
                Conheça nossa história
              </Button>
            </Box>

            {/* Direita — cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Card destaque numérico */}
              <Box sx={{ bgcolor: 'var(--terracotta)', borderRadius: '2px', p: 4, color: 'var(--paper)' }}>
                <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: '64px', letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--paper)', opacity: 0.9 }}>
                  1.842
                </Typography>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--paper)', opacity: 0.75, mt: 0.5 }}>
                  caixas entregues
                </Typography>
              </Box>

              {/* Mini cards de conteúdo */}
              {[
                { title: config.about_card1_title, desc: config.about_card1_desc },
                { title: config.about_card2_title, desc: config.about_card2_desc },
                { title: config.about_card3_title, desc: config.about_card3_desc },
              ].filter(c => c.title).map((card, i) => (
                <Box key={i} sx={{ border: '1px solid var(--rule)', borderRadius: '2px', p: 3 }}>
                  <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 400, fontSize: '18px', color: 'var(--ink)', letterSpacing: '-0.02em', mb: 0.5 }}>{card.title}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: '14px', color: 'var(--ink)', opacity: 0.6, lineHeight: 1.6 }}>{card.desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── INSTAGRAM ───────────────────────────────────────────── */}
      <Box sx={{ mt: 10, py: 8, px: { xs: 3, md: '6vw' }, bgcolor: 'var(--cream)', mx: { xs: -3, md: '-6vw' }, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 2 }}>
          Siga a jornada
        </Typography>
        <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: { xs: '32px', md: '48px' }, letterSpacing: '-0.04em', color: 'var(--ink)', mb: 1 }}>
          Faça parte da nossa história.
        </Typography>
        <Typography sx={{ fontFamily: 'Inter', fontSize: '15px', color: 'var(--ink)', opacity: 0.6, mb: 4, maxWidth: 480, mx: 'auto' }}>
          Marque <strong>{config.instagram_handle ? `@${config.instagram_handle.replace('@','')}` : '@tkookies_'}</strong> nas suas fotos e apareça aqui.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button href={config.instagram_url || 'https://www.instagram.com/tkookies_/'} target="_blank" startIcon={<Instagram />}
            sx={{ borderRadius: 999, px: 4, py: 1.5, bgcolor: '#E1306C', color: 'white', fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, '&:hover': { bgcolor: '#c12457' }, transition: 'all .4s cubic-bezier(.2,.8,.2,1)' }}>
            {config.instagram_handle || '@tkookies_'}
          </Button>
          <Button href={`https://wa.me/${config.whatsapp_number || '5555997312557'}?text=${encodeURIComponent('Olá! Gostaria de ver o cardápio da TKookies')}`}
            target="_blank" startIcon={<WhatsApp />}
            sx={{ borderRadius: 999, px: 4, py: 1.5, border: '1px solid #25D366', color: '#25D366', bgcolor: 'transparent', fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, '&:hover': { bgcolor: '#25D366', color: 'white' }, transition: 'all .4s cubic-bezier(.2,.8,.2,1)' }}>
            WhatsApp
          </Button>
        </Box>
      </Box>


      {/* ── REVENDEDOR ──────────────────────────────────────────── */}
      <Box id="revendedor" sx={{ position: 'relative', zIndex: 2 }}>
        <ResellerCTA />
      </Box>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      {(() => {
        // Formata horários agrupando dias com mesmo horário
        const scheduleLines = (() => {
          try {
            const raw = config.opening_hours;
            if (!raw) return [];
            const schedule = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const open = schedule.filter(s => s.open);
            if (!open.length) return [];
            const groups = [];
            let cur = null;
            const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            open.forEach(s => {
              const key = `${s.open_time}–${s.close_time}`;
              if (cur && cur.key === key) {
                cur.days.push(DAY_ABBR[s.day]);
              } else {
                cur = { key, days: [DAY_ABBR[s.day]], open_time: s.open_time, close_time: s.close_time };
                groups.push(cur);
              }
            });
            return groups.map(g => {
              const label = g.days.length > 1 ? `${g.days[0]}–${g.days[g.days.length - 1]}` : g.days[0];
              return `${label} · ${g.open_time.replace(':','h')}–${g.close_time.replace(':','h')}`;
            });
          } catch { return []; }
        })();

        const location = (config.home_location || '').replace(/^[^\w]+/, '').trim();

        return (
          <Box sx={{ mx: { xs: -3, md: '-6vw' }, px: { xs: 3, md: '6vw' }, pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 8 }, bgcolor: 'var(--ink)', position: 'relative', overflow: 'hidden' }}>
            {/* Wordmark de fundo */}
            <Typography sx={{
              position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)',
              fontFamily: '"Fraunces", serif', fontWeight: 300,
              fontSize: 'clamp(120px, 28vw, 360px)',
              letterSpacing: '-0.06em', color: 'var(--paper)', opacity: 0.05,
              whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none', lineHeight: 1,
            }}>
              tkookies
            </Typography>

            {/* Grid principal */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr 1fr' }, gap: { xs: 6, md: 4 }, position: 'relative', zIndex: 1 }}>

              {/* Col 1 — CTA */}
              <Box>
                <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontSize: { xs: '36px', md: '48px' }, letterSpacing: '-0.04em', color: 'var(--paper)', lineHeight: 1.05 }}>
                  Pede um{' '}
                  <Typography component="span" sx={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', color: 'var(--caramel)', fontSize: 'inherit', letterSpacing: 'inherit' }}>
                    cookie
                  </Typography>
                  {' '}agora?
                </Typography>
              </Box>

              {/* Col 2 — Visite */}
              <Box>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 2.5 }}>Visite</Typography>
                {location.split('/').map((line, i) => (
                  <Typography key={i} sx={{ fontFamily: 'Inter', fontSize: '14px', color: 'var(--paper)', opacity: 0.65, lineHeight: 1.9 }}>
                    {line.trim()}
                  </Typography>
                ))}
                {config.whatsapp_number && (
                  <Typography
                    component="a"
                    href={`https://wa.me/${config.whatsapp_number}`}
                    target="_blank"
                    sx={{ fontFamily: 'Inter', fontSize: '14px', color: 'var(--paper)', opacity: 0.65, lineHeight: 1.9, textDecoration: 'none', display: 'block', mt: 0.5, '&:hover': { opacity: 1 } }}
                  >
                    {config.whatsapp_number.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}
                  </Typography>
                )}
              </Box>

              {/* Col 3 — Horários */}
              <Box>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 2.5 }}>Horários</Typography>
                {scheduleLines.length > 0 ? scheduleLines.map((line, i) => (
                  <Typography key={i} sx={{ fontFamily: 'Inter', fontSize: '14px', color: 'var(--paper)', opacity: 0.65, lineHeight: 1.9 }}>{line}</Typography>
                )) : (
                  <Typography sx={{ fontFamily: 'Inter', fontSize: '14px', color: 'var(--paper)', opacity: 0.65, lineHeight: 1.9 }}>
                    {getTodayScheduleLabel(config)}
                  </Typography>
                )}
                <Typography sx={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--paper)', opacity: 0.4, lineHeight: 1.9, mt: 0.5 }}>
                  Entregas: até 17h
                </Typography>
              </Box>

              {/* Col 4 — Acompanhe */}
              <Box>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--caramel)', mb: 2.5 }}>Acompanhe</Typography>
                {[
                  { label: 'Instagram', href: config.instagram_url || 'https://www.instagram.com/tkookies_/' },
                  { label: 'Facebook', href: 'https://www.facebook.com/tkookiestm' },
                  { label: 'WhatsApp', href: `https://wa.me/${config.whatsapp_number || '5555997312557'}` },
                ].map((item) => (
                  <Box
                    key={item.label}
                    component="a"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, color: 'var(--paper)', opacity: 0.65, textDecoration: 'none', '&:hover': { opacity: 1 }, transition: 'opacity .2s', maxWidth: 160 }}
                  >
                    <Typography sx={{ fontFamily: 'Inter', fontSize: '14px' }}>{item.label}</Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontSize: '13px', ml: 1, opacity: 0.7 }}>↗</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Bottom bar */}
            <Box sx={{ mt: 8, pt: 3, borderTop: '1px solid rgba(251,246,236,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, position: 'relative', zIndex: 1 }}>
              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--paper)', opacity: 0.28 }}>
                © TKookies · {new Date().getFullYear()} · Todos os direitos reservados
              </Typography>
              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--paper)', opacity: 0.28 }}>
                Feito com manteiga e atenção
              </Typography>
            </Box>
          </Box>
        );
      })()}

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
          bgcolor: 'var(--paper)',
          color: 'var(--terracotta)',
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '13px',
          border: '1px solid var(--terracotta)',
          boxShadow: '0 4px 20px rgba(200,83,27,.15)',
          borderRadius: 999,
          '&:hover': { bgcolor: 'var(--cream)' },
          textTransform: 'none',
          transition: 'all .4s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <Storefront sx={{ mr: 1, fontSize: 18 }} />
        Seja um Parceiro
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
            bgcolor: 'var(--ink)',
            p: { xs: 1.5, md: 2 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 0 },
            border: '1px solid rgba(251,246,236,.1)',
            boxShadow: '0 -8px 32px rgba(26,15,8,.12)',
            borderRadius: '2px',
          }}>
            <Box display="flex" alignItems="center" gap={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <IconButton onClick={() => navigate("/carrinho")} sx={{ color: 'var(--paper)' }}>
                <Badge badgeContent={totalItems} sx={{ '& .MuiBadge-badge': { bgcolor: 'var(--terracotta)', color: 'var(--paper)' } }}>
                  <ShoppingBag />
                </Badge>
              </IconButton>
              {clientUser && (
                <IconButton onClick={() => navigate("/meus-favoritos")} sx={{ color: '#ef4444' }}>
                  <Badge badgeContent={favorites.length} color="default">
                    <Favorite sx={{ fontSize: 20 }} />
                  </Badge>
                </IconButton>
              )}
              <Box sx={{ ml: 0.5 }}>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper)', opacity: 0.5, lineHeight: 1, display: 'block' }}>Total do pedido</Typography>
                <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 400, fontSize: { xs: '22px', md: '26px' }, color: 'var(--caramel)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>R$ {totalPrice.toFixed(2)}</Typography>
              </Box>
            </Box>
            <Box
              onClick={handleCheckout}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                borderRadius: 999,
                px: { xs: 3, md: 4 },
                py: 1.5,
                bgcolor: 'var(--terracotta)',
                color: 'var(--paper)',
                fontFamily: 'Inter',
                fontWeight: 500,
                fontSize: { xs: '14px', md: '15px' },
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                transition: 'all .4s cubic-bezier(.2,.8,.2,1)',
                '&:hover': { bgcolor: '#A8421A' },
                userSelect: 'none',
              }}
            >
              Finalizar pedido <ArrowForward sx={{ fontSize: 16 }} />
            </Box>
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
    </Box>
    </Box>
  );
}