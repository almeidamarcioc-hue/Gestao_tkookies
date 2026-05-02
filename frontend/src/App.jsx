// App.jsx
import { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppBar, Toolbar, Button, Box, Typography, Menu, MenuItem, createTheme, ThemeProvider, CssBaseline, TextField, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider, Container, Grid, Badge, CircularProgress, BottomNavigation, BottomNavigationAction } from "@mui/material";
import { Menu as MenuIcon, Instagram, WhatsApp, Facebook, AccountCircle, ShoppingCart, Favorite, Lock, Assessment, Home as HomeIcon, MenuBook } from "@mui/icons-material";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Ingredients from "./pages/Ingredients";
import IngredientForm from "./pages/IngredientForm";
import Products from "./pages/Products";
import Production from "./pages/Production";
import ProductionRecipe from "./pages/ProductionRecipe";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import Orders from "./pages/Orders";
import OrderForm from "./pages/OrderForm";
import Combos from "./pages/Combos";
import ComboForm from "./pages/ComboForm";
import Inventory from "./pages/Inventory";
import Settings from "./pages/Settings";
import Financial from "./pages/Financial";
import ClientRegister from "./pages/ClientRegister";
import ClientProfile from "./pages/ClientProfile";
import Cart from "./pages/Cart";
import OrderConfirmation from "./pages/OrderConfirmation";
import ClientOrders from "./pages/ClientOrders";
import ClientOrderDetails from "./pages/ClientOrderDetails";
import ClientFavorites from "./pages/ClientFavorites";
import api from "./services/api";
import About from "./pages/About";
import Resellers from "./pages/Resellers";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessDenied from "./pages/AccessDenied";
import OrdersDashboard from "./pages/OrdersDashboard";
import TitheReport from "./pages/TitheReport";
import BestSellersReport from "./pages/BestSellersReport";
import RelatorioUsuarios from "./pages/RelatorioUsuarios";
import RelatorioRanking from "./pages/RelatorioRanking";
import InteligenciaVendas from "./pages/InteligenciaVendas";
import Analytics from "./pages/Analytics";
import ProspeccaoRevendedores from "./pages/ProspeccaoRevendedores";
import { APP_VERSION } from "./version";

const theme = createTheme({
  palette: {
    primary: { main: "#C8531B" },
    secondary: { main: "#C8843A" },
    background: { default: "#FBF6EC", paper: "#FBF6EC" },
    text: { primary: "#1A0F08", secondary: "#6B4C35" },
    success: { main: "#2E7D32" },
    error: { main: "#C62828" },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, letterSpacing: '-0.04em' },
    h2: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 400, letterSpacing: '-0.04em' },
    h3: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 400, letterSpacing: '-0.03em' },
    h4: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 400, letterSpacing: '-0.02em', color: "#1A0F08" },
    h5: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 400, color: "#1A0F08" },
    h6: { fontWeight: 500 },
    button: { fontWeight: 500, textTransform: "none" },
  },
  shape: { borderRadius: 2 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FBF6EC",
          color: "#1A0F08",
          boxShadow: "none",
          borderBottom: "1px solid rgba(42,26,14,.14)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: "8px 24px",
          transition: "all .4s cubic-bezier(.2,.8,.2,1)",
        },
        contained: {
          boxShadow: "none",
          "&:hover": { backgroundColor: "#A8421A", boxShadow: "none" },
        },
        outlined: {
          "&:hover": { backgroundColor: "rgba(200,83,27,0.06)" },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          border: "1px solid rgba(42,26,14,.14)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { backgroundColor: "#F6EFE3", color: "#1A0F08", fontWeight: "bold" },
        root: { borderBottom: "1px solid rgba(42,26,14,.08)" },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { "& .MuiOutlinedInput-root": { borderRadius: 2 } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
  },
});

export default function App() {
  const queryClient = new QueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [anchorCad, setAnchorCad] = useState(null);
  const [anchorCons, setAnchorCons] = useState(null);
  const [anchorPed, setAnchorPed] = useState(null);
  const [anchorClient, setAnchorClient] = useState(null);
  const [anchorRel, setAnchorRel] = useState(null);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminLoginData, setAdminLoginData] = useState({ login: "", senha: "" });

  // Estados de Autenticação
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Estados Login Cliente
  const [clientLoginOpen, setClientLoginOpen] = useState(false);
  const [clientUser, setClientUser] = useState(null); // Objeto do cliente logado
  const [clientLoginData, setClientLoginData] = useState({ login: "", senha: "" });
  const [loginMode, setLoginMode] = useState('client'); // 'client' | 'reseller'
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [siteConfig, setSiteConfig] = useState({ opening_hours: '', whatsapp_number: '5555997312557' });

  // ── Temporizador do carrinho (30 min) ──────────────────────────────────────
  const CART_TIMEOUT_MS = 30 * 60 * 1000;
  const [cartExpiry, setCartExpiry] = useState(() => {
    const stored = localStorage.getItem('cart_expiry');
    return stored ? Number(stored) : null;
  });
  const [cartTimeLeft, setCartTimeLeft] = useState(null); // segundos restantes
  const [cartExpiredAlert, setCartExpiredAlert] = useState(false);

  // Efeito do temporizador do carrinho
  useEffect(() => {
    if (!cartExpiry) { setCartTimeLeft(null); return; }

    const tick = () => {
      const remaining = Math.max(0, Math.floor((cartExpiry - Date.now()) / 1000));
      setCartTimeLeft(remaining);

      if (remaining === 0) {
        // Tempo esgotado — libera estoque e limpa carrinho
        setCart(prev => {
          prev.forEach(item => {
            const dbId = item.original_id || item.id;
            import('./services/api').then(({ default: api }) => {
              api.post('/estoque/liberar', {
                produto_id: dbId,
                quantidade: item.quantidade,
                tipo: (item.itens?.length > 0) ? 'combo' : 'produto'
              }).catch(() => {});
            });
          });
          return [];
        });
        setCartExpiry(null);
        setCartTimeLeft(null);
        localStorage.removeItem('cart_expiry');
        setCartExpiredAlert(true);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cartExpiry]);

  // Efeito para resetar o scroll para o topo sempre que a rota (página) mudar
  useEffect(() => {
    const forceScrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    forceScrollTop();
    // Executa uma segunda vez após um micro-delay para garantir que o DOM renderizou
    const timer = setTimeout(forceScrollTop, 10);

    // Rastreamento de visualização de página no Google Analytics (gtag.js)
    // Usando page_location virtual para que o GA4 registre o path correto em SPAs com hash routing
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_location: window.location.origin + pathname,
        page_path: pathname,
        page_title: document.title,
      });
    }

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const adminLogged = localStorage.getItem("cookie_erp_admin");
    const clientLogged = localStorage.getItem("cookie_erp_client");

    if (adminLogged === "true") {
      setIsLoggedIn(true);
    }

    if (clientLogged) {
      setClientUser(JSON.parse(clientLogged));
    }

    setLoading(false);

    const handleSessionExpired = () => {
      const wasAdmin = localStorage.getItem("cookie_erp_admin") === "true";
      localStorage.removeItem("cookie_erp_admin");
      localStorage.removeItem("cookie_erp_client");

      if (wasAdmin) {
        // Admin: abre modal de login admin para reconectar sem sair da tela
        setIsLoggedIn(false);
        setAdminLoginOpen(true);
      } else {
        // Cliente: volta para home e abre login de cliente
        setClientUser(null);
        setClientLoginOpen(true);
        navigate("/");
      }
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  // Scroll detector para o header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Config fetch para slim bar
  useEffect(() => {
    const cached = sessionStorage.getItem('_cfg');
    if (cached) { try { setSiteConfig(JSON.parse(cached)); } catch {} }
    else {
      api.get('/configuracoes').then(res => {
        if (res.data) { sessionStorage.setItem('_cfg', JSON.stringify(res.data)); setSiteConfig(res.data); }
      }).catch(() => {});
    }
  }, []);

  const getStoreStatus = (cfg) => {
    if (!cfg.opening_hours) return { open: null, label: 'Entregas 14–17h' };
    try {
      const schedule = typeof cfg.opening_hours === 'string' ? JSON.parse(cfg.opening_hours) : cfg.opening_hours;
      const now = new Date();
      const day = now.getDay();
      const current = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      const today = schedule.find(s => Number(s.day) === day);
      if (!today || !today.open) return { open: false, label: 'Fechado hoje · Entregas 14–17h' };
      const isOpen = current >= today.open_time && current <= today.close_time;
      return { open: isOpen, label: `${isOpen ? 'Aberto' : 'Fechado'} hoje das ${today.open_time} às ${today.close_time} · Entregas 14–17h` };
    } catch { return { open: null, label: 'Entregas 14–17h' }; }
  };

  const openCad = Boolean(anchorCad);
  const openCons = Boolean(anchorCons);
  const openPed = Boolean(anchorPed);
  const openClient = Boolean(anchorClient);
  const openRel = Boolean(anchorRel);

  const handleClose = () => {
    setAnchorCad(null);
    setAnchorCons(null);
    setAnchorPed(null);
    setAnchorClient(null);
    setAnchorRel(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setClientUser(null);
    localStorage.removeItem("cookie_erp_admin");
    localStorage.removeItem("cookie_erp_client");
    await clearCart();
    handleClose();
    navigate("/");
  };

  const handleOpenLogin = (mode) => {
    setLoginMode(mode);
    setClientLoginOpen(true);
  };

  const handleClientLogin = async () => {
    // 2. Tenta login como Cliente
    try {
      const res = await api.post("/clientes/login", clientLoginData);
      const user = res.data;

      // Validação de acesso cruzado
      if (loginMode === 'client' && user.is_revendedor) {
        alert("Esta conta é de um Revendedor. Por favor, utilize a Área do Parceiro.");
        return;
      }

      if (loginMode === 'reseller' && !user.is_revendedor) {
        alert("Esta conta é de um Cliente. Por favor, utilize a Área do Cliente.");
        return;
      }

      setClientUser(user);
      localStorage.setItem("cookie_erp_client", JSON.stringify(user));
      if (user.token) localStorage.setItem("cookie_erp_token", user.token);
      setClientLoginOpen(false);
      setClientLoginData({ login: "", senha: "" });
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || "Erro no login";
      alert(msg);
    }
  };

  const handleAdminLogin = async () => {
    try {
      const res = await api.post("/clientes/admin/login", adminLoginData);
      const { token } = res.data;
      localStorage.setItem("cookie_erp_token", token);
      setIsLoggedIn(true);
      localStorage.setItem("cookie_erp_admin", "true");
      setAdminLoginOpen(false);
      setAdminLoginData({ login: "", senha: "" });
      navigate("/produtos");
    } catch (err) {
      alert("Credenciais de administrador inválidas.");
    }
  };

  // Funções do Carrinho
  const addToCart = async (product, quantity = 1) => {
    const dbId = product.original_id || product.id; // Usa original_id para agregados
    try {
      await api.post("/estoque/reservar", {
        produto_id: dbId,
        quantidade: quantity,
        tipo: (product.itens?.length > 0) ? 'combo' : 'produto'
      });

      // Captura se o carrinho estava vazio ANTES de adicionar (para iniciar o timer)
      const wasEmpty = cart.length === 0;

      setCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        if (existing) {
          return prev.map((item) =>
          item.id === product.id ? { ...item, quantidade: item.quantidade + quantity } : item
          );
        }
        return [...prev, { ...product, quantidade: quantity }];
      });

      // Inicia o temporizador ao adicionar o primeiro item
      if (wasEmpty && !cartExpiry) {
        const expiry = Date.now() + CART_TIMEOUT_MS;
        setCartExpiry(expiry);
        localStorage.setItem('cart_expiry', String(expiry));
      }

      // Google Analytics
      if (window.gtag) {
        window.gtag('event', 'add_to_cart', {
          currency: 'BRL',
          value: Number(product.preco_venda || product.valor_unitario) * quantity,
          items: [{
            item_id: String(dbId),
            item_name: product.nome || product.produto_nome,
            price: Number(product.preco_venda || product.valor_unitario),
            quantity: quantity
          }]
        });
      }

      return true; // Sucesso
    } catch (err) {
      alert(err.response?.data?.error || "Estoque insuficiente.");
      return false; // Falha
    }
  };

  const removeFromCart = async (productId) => {
    const item = cart.find(i => i.id === productId);
    if (item) {
      const dbId = item.original_id || item.id;
      await api.post("/estoque/liberar", { 
        produto_id: dbId, 
        quantidade: item.quantidade,
        tipo: (item.itens?.length > 0) ? 'combo' : 'produto'
      })
               .catch(e => console.error("Erro ao liberar estoque:", e));
    }
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateCartQuantity = async (productId, newQty) => {
    if (newQty < 1) return;
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    const delta = newQty - item.quantidade;
    const dbId = item.original_id || item.id;

    try {
      if (delta > 0) {
        await api.post("/estoque/reservar", { 
          produto_id: dbId, 
          quantidade: delta,
          tipo: (item.itens?.length > 0) ? 'combo' : 'produto'
        });
      } else if (delta < 0) {
        await api.post("/estoque/liberar", {
          produto_id: dbId,
          quantidade: Math.abs(delta),
          tipo: (item.itens?.length > 0) ? 'combo' : 'produto'
        });
      }
      setCart((prev) => prev.map((i) => i.id === productId ? { ...i, quantidade: newQty } : i));
      return true; // Sucesso
    } catch (err) {
      alert(err.response?.data?.error || "Não há estoque suficiente para esta quantidade.");
      return false; // Falha
    }
  };

  const clearCart = async ({ skipLiberar = false } = {}) => {
    // skipLiberar=true quando o carrinho é limpo após pedido finalizado
    // (estoque já foi deduzido pela reserva, não deve ser devolvido)
    if (!skipLiberar) {
      for (const item of cart) {
        const dbId = item.original_id || item.id;
        await api.post("/estoque/liberar", {
          produto_id: dbId,
          quantidade: item.quantidade,
          tipo: (item.itens?.length > 0) ? 'combo' : 'produto'
        }).catch(e => console.error("Erro ao liberar estoque:", e));
      }
    }
    setCart([]);
    // Cancela o temporizador
    setCartExpiry(null);
    setCartTimeLeft(null);
    localStorage.removeItem('cart_expiry');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" color="primary">Carregando...</Typography>
        </Box>
      ) : (
        <>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Slim bar — fora do AppBar para evitar interferência MUI ── */}
      {(() => {
        const { open, label } = getStoreStatus(siteConfig);
        return (
          <Box sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1101,
            backgroundColor: '#FBF6EC',
            borderBottom: '1px solid rgba(42,26,14,.14)',
            display: 'flex', alignItems: 'center', gap: 1,
            py: '5px', px: { xs: 2, md: 5 },
          }}>
            {open !== null && (
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                backgroundColor: open ? '#2E7D32' : '#C62828',
                boxShadow: open ? '0 0 0 2px rgba(46,125,50,.2)' : '0 0 0 2px rgba(198,40,40,.2)',
              }} />
            )}
            <Typography sx={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#1A0F08',
            }}>
              {label}
            </Typography>
          </Box>
        );
      })()}

      <AppBar
        position="sticky"
        sx={{
          top: 0,
          zIndex: 1100,
          backgroundColor: scrolled ? 'rgba(251,246,236,.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow: scrolled ? '0 1px 0 rgba(42,26,14,.10)' : 'none',
          borderBottom: scrolled ? '1px solid var(--rule)' : '1px solid transparent',
          transition: 'background-color .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {import.meta.env.VITE_ENVIRONMENT === 'homologacao' && (
          <Box sx={{
            bgcolor: '#B71C1C',
            color: '#fff',
            textAlign: 'center',
            py: 0.75,
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: 1.5,
            borderBottom: '2px solid #7f0000',
            userSelect: 'none',
          }}>
            ⚠️&nbsp; AMBIENTE DE HOMOLOGAÇÃO &nbsp;—&nbsp; Não utilizar dados reais &nbsp;⚠️
          </Box>
        )}

        <Toolbar sx={{ px: { xs: 2, md: 5 }, minHeight: '68px !important' }}>
          {/* Hamburguer mobile (apenas admin) */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { xs: isLoggedIn ? 'flex' : 'none', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo */}
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', flexGrow: 1 }}>
            {/* TK em círculo */}
            <Box sx={{
              width: 42, height: 42, borderRadius: '50%',
              bgcolor: '#1A0F08',
              border: '2px solid #C8843A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Typography sx={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontWeight: 700,
                fontSize: '15px',
                color: '#FBF6EC',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>TK</Typography>
            </Box>
            <Box>
              <Typography sx={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontWeight: 700,
                fontSize: '22px',
                color: isHome && !scrolled ? '#FBF6EC' : '#1A0F08',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}>TKookies</Typography>
              <Box sx={{ width: '100%', height: '1px', bgcolor: '#C8843A', my: '3px' }} />
              <Typography sx={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '8px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#C8843A',
                lineHeight: 1,
              }}>ARTESANAL</Typography>
            </Box>
          </Box>

          {/* Nav Desktop */}
          <Box display={{ xs: 'none', md: 'flex' }} alignItems="center" gap={0.5}>
            {isLoggedIn ? (
              <>
                <Button
                  color="inherit"
                  component={Link}
                  to="/"
                  sx={{ fontSize: '13px', fontWeight: 500, color: 'rgba(26,15,8,.7)', '&:hover': { color: '#1A0F08', bgcolor: 'transparent' } }}
                >Início</Button>
                <Button color="inherit" onClick={(e) => setAnchorCad(e.currentTarget)} sx={{ fontSize: '13px', fontWeight: 500 }}>Cadastros</Button>
                <Menu anchorEl={anchorCad} open={openCad} onClose={handleClose}>
                  <MenuItem component={Link} to="/produtos/novo" onClick={handleClose}>Novo Produto</MenuItem>
                  <MenuItem component={Link} to="/ingredientes/novo" onClick={handleClose}>Novo Ingrediente</MenuItem>
                  <MenuItem component={Link} to="/clientes/novo" onClick={handleClose}>Novo Cliente</MenuItem>
                  <MenuItem component={Link} to="/combos/novo" onClick={handleClose}>Novo Combo</MenuItem>
                  <MenuItem component={Link} to="/revendedores" onClick={handleClose}>Novo Revendedor</MenuItem>
                </Menu>

                <Button color="inherit" onClick={(e) => setAnchorCons(e.currentTarget)} sx={{ fontSize: '13px', fontWeight: 500 }}>Consultas</Button>
                <Menu anchorEl={anchorCons} open={openCons} onClose={handleClose}>
                  <MenuItem component={Link} to="/produtos" onClick={handleClose}>Produtos</MenuItem>
                  <MenuItem component={Link} to="/ingredientes" onClick={handleClose}>Ingredientes</MenuItem>
                  <MenuItem component={Link} to="/clientes" onClick={handleClose}>Clientes</MenuItem>
                  <MenuItem component={Link} to="/combos" onClick={handleClose}>Combos</MenuItem>
                  <MenuItem component={Link} to="/estoque" onClick={handleClose}>Estoque</MenuItem>
                  <MenuItem component={Link} to="/revendedores" onClick={handleClose}>Revendedores</MenuItem>
                  <MenuItem component={Link} to="/status" onClick={handleClose}>Status do Sistema</MenuItem>
                </Menu>

                <Button color="inherit" component={Link} to="/production" sx={{ fontSize: '13px', fontWeight: 500 }}>Produção</Button>
                <Button color="inherit" component={Link} to="/financeiro" sx={{ fontSize: '13px', fontWeight: 500 }}>Financeiro</Button>
                <Button color="inherit" component={Link} to="/configuracoes" sx={{ fontSize: '13px', fontWeight: 500 }}>Config</Button>

                <Button color="inherit" onClick={(e) => setAnchorPed(e.currentTarget)} sx={{ fontSize: '13px', fontWeight: 500 }}>Pedidos</Button>
                <Menu anchorEl={anchorPed} open={openPed} onClose={handleClose}>
                  <MenuItem component={Link} to="/pedidos/novo" onClick={handleClose}>Novo Pedido</MenuItem>
                  <MenuItem component={Link} to="/pedidos" onClick={handleClose}>Consultar Pedidos</MenuItem>
                  <MenuItem component={Link} to="/painel-cozinha" onClick={handleClose}>Painel de Cozinha (KDS)</MenuItem>
                </Menu>

                <Button color="inherit" onClick={(e) => setAnchorRel(e.currentTarget)} sx={{ fontSize: '13px', fontWeight: 500 }}>Relatórios</Button>
                <Menu anchorEl={anchorRel} open={openRel} onClose={handleClose}>
                  <MenuItem component={Link} to="/relatorios/dizimo" onClick={handleClose}>Dízimo</MenuItem>
                  <MenuItem component={Link} to="/relatorios/top-produtos" onClick={handleClose}>Sabores mais Amados</MenuItem>
                  <MenuItem component={Link} to="/relatorios/usuarios" onClick={handleClose}>Usuários e Acessos</MenuItem>
                  <MenuItem component={Link} to="/relatorios/ranking" onClick={handleClose}>Ranking Clientes e Produtos</MenuItem>
                  <MenuItem component={Link} to="/inteligencia-vendas" onClick={handleClose}>🍪 Inteligência de Vendas (IA)</MenuItem>
                  <MenuItem component={Link} to="/prospeccao-revendedores" onClick={handleClose}>🗺️ Prospecção de Revendedores</MenuItem>
                  <MenuItem component={Link} to="/analytics" onClick={handleClose}>Google Analytics</MenuItem>
                </Menu>

                <Button color="inherit" onClick={handleLogout} sx={{ fontSize: '13px', fontWeight: 500, color: 'error.main' }}>Sair</Button>
              </>
            ) : (
              <>
                {/* Links públicos de navegação */}
                {[
                  { label: 'Cardápio', id: 'cardapio' },
                  { label: 'História', path: '/sobre' },
                  { label: 'Diário', id: 'diario-section' },
                  { label: 'Combos', id: 'combos-section' },
                ].map((item) => (
                  <Button
                    key={item.label}
                    color="inherit"
                    {...(item.path
                      ? { component: Link, to: item.path }
                      : { onClick: () => { if (isHome) document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }); else { navigate('/'); setTimeout(() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }), 300); } } }
                    )}
                    sx={{
                      fontSize: '13px', fontWeight: 500,
                      color: isHome && !scrolled ? 'rgba(251,246,236,.85)' : 'rgba(26,15,8,.7)',
                      '&:hover': { color: isHome && !scrolled ? '#FBF6EC' : '#1A0F08', bgcolor: 'transparent' },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}

                {clientUser ? (
                  <>
                    <Button color="inherit" startIcon={<AccountCircle />} onClick={(e) => setAnchorClient(e.currentTarget)} sx={{ fontSize: '13px', fontWeight: 500, color: isHome && !scrolled ? 'rgba(251,246,236,.85)' : 'rgba(26,15,8,.7)' }}>
                      {clientUser.nome.split(' ')[0]}{clientUser.is_revendedor ? ' (Parceiro)' : ''}
                    </Button>
                    <Menu anchorEl={anchorClient} open={openClient} onClose={handleClose}>
                      <MenuItem component={Link} to="/perfil" onClick={handleClose}>Meu Perfil</MenuItem>
                      <MenuItem component={Link} to="/meus-favoritos" onClick={handleClose}>Meus Favoritos</MenuItem>
                      <MenuItem component={Link} to="/meus-pedidos" onClick={handleClose}>Meus Pedidos</MenuItem>
                      <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Sair</MenuItem>
                    </Menu>
                    {/* Sacola para cliente logado */}
                    <Box
                      component={Link}
                      to="/carrinho"
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        bgcolor: isHome && !scrolled ? 'rgba(251,246,236,.12)' : '#1A0F08',
                        color: '#FBF6EC',
                        border: isHome && !scrolled ? '1px solid rgba(251,246,236,.3)' : 'none',
                        borderRadius: 999, px: 2, py: 0.75,
                        textDecoration: 'none', ml: 0.5,
                        fontSize: '13px', fontWeight: 500,
                        transition: 'opacity .3s',
                        '&:hover': { opacity: 0.85 },
                      }}
                    >
                      <ShoppingCart sx={{ fontSize: 16 }} />
                      {cart.reduce((acc, item) => acc + item.quantidade, 0) > 0 && (
                        <Box sx={{ bgcolor: '#C8531B', color: '#FBF6EC', borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, px: 0.5 }}>
                          {cart.reduce((acc, item) => acc + item.quantidade, 0)}
                        </Box>
                      )}
                      Sacola
                    </Box>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => handleOpenLogin('client')}
                      sx={{
                        fontSize: '12px', fontWeight: 500, ml: 1,
                        color: isHome && !scrolled ? 'rgba(251,246,236,.85)' : 'rgba(26,15,8,.75)',
                        border: '1px solid',
                        borderColor: isHome && !scrolled ? 'rgba(251,246,236,.35)' : 'rgba(26,15,8,.2)',
                        borderRadius: 999, px: 2, py: 0.5,
                        '&:hover': { bgcolor: isHome && !scrolled ? 'rgba(251,246,236,.08)' : 'rgba(26,15,8,.05)', borderColor: isHome && !scrolled ? 'rgba(251,246,236,.6)' : 'rgba(26,15,8,.4)' },
                        transition: 'all .3s',
                      }}
                    >
                      Área do Cliente
                    </Button>
                    <Button
                      onClick={() => handleOpenLogin('reseller')}
                      sx={{
                        fontSize: '12px', fontWeight: 500, ml: 0.75,
                        bgcolor: isHome && !scrolled ? 'rgba(251,246,236,.15)' : '#1A0F08',
                        color: '#FBF6EC',
                        border: isHome && !scrolled ? '1px solid rgba(251,246,236,.3)' : '1px solid transparent',
                        borderRadius: 999, px: 2, py: 0.5,
                        '&:hover': { opacity: 0.85 },
                        transition: 'all .3s',
                      }}
                    >
                      Área do Parceiro
                    </Button>
                  </>
                )}
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Menu Mobile (Drawer) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: '80vw',
            maxWidth: 320,
            backgroundColor: 'rgba(251,246,236,.95)',
            backdropFilter: 'blur(16px)',
            borderRight: '1px solid rgba(42,26,14,.14)',
            boxShadow: '4px 0 32px rgba(26,15,8,.12)',
          },
        }}
      >
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'left', px: 3 }}>
          <Box sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#1A0F08', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: '12px', color: '#FBF6EC' }}>TK</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: '18px', color: '#1A0F08', letterSpacing: '-0.02em', lineHeight: 1 }}>TKookies</Typography>
              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8843A' }}>ARTESANAL · EST. 2021</Typography>
            </Box>
          </Box>
          <Divider />
          <List>
            <ListItem disablePadding><ListItemButton component={Link} to="/" onClick={handleDrawerToggle}><ListItemText primary="HOME" /></ListItemButton></ListItem>
            {isLoggedIn ? (
              <>
                <ListItem disablePadding><ListItemButton component={Link} to="/pedidos/novo"><ListItemText primary="Novo Pedido" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/pedidos"><ListItemText primary="Pedidos" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/painel-cozinha"><ListItemText primary="Painel Cozinha" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/produtos"><ListItemText primary="Produtos" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/clientes"><ListItemText primary="Clientes" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/combos"><ListItemText primary="Combos" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/estoque"><ListItemText primary="Estoque" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/production"><ListItemText primary="Produção" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/financeiro"><ListItemText primary="Financeiro" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/configuracoes"><ListItemText primary="Configurações" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/relatorios/dizimo"><ListItemText primary="Relatório Dízimo" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/relatorios/top-produtos"><ListItemText primary="Top Produtos" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/relatorios/usuarios"><ListItemText primary="Relatório de Usuários" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="SAIR" sx={{ color: 'error.main' }} /></ListItemButton></ListItem>
              </>
            ) : (
               clientUser ? (
                 <>
                   <ListItem disablePadding><ListItemButton component={Link} to="/perfil" onClick={handleDrawerToggle}><ListItemText primary="Meu Perfil" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton component={Link} to="/meus-favoritos" onClick={handleDrawerToggle}><ListItemText primary="Meus Favoritos" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton component={Link} to="/meus-pedidos" onClick={handleDrawerToggle}><ListItemText primary="Meus Pedidos" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="SAIR" sx={{ color: 'error.main' }} /></ListItemButton></ListItem>
                 </>
               ) : (
                 <>
                   <ListItem disablePadding><ListItemButton onClick={() => handleOpenLogin('client')}><ListItemText primary="Área do Cliente" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton onClick={() => handleOpenLogin('reseller')}><ListItemText primary="Área do Parceiro" sx={{ color: 'primary.main', fontWeight: 'bold' }} /></ListItemButton></ListItem>
                 </>
               )
            )}
            <ListItem disablePadding><ListItemButton component={Link} to="/carrinho" onClick={handleDrawerToggle}><ListItemText primary="Carrinho" /></ListItemButton></ListItem>
            {!isLoggedIn && (
              <ListItem disablePadding sx={{ justifyContent: 'center', mt: 2 }}>
                <IconButton onClick={() => setAdminLoginOpen(true)} sx={{ color: 'text.secondary', opacity: 0.5 }}>
                  <Lock />
                </IconButton>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, py: 4, pb: { xs: 10, md: 4 } }}>
        <Routes>
          <Route path="/" element={<Home isLoggedIn={isLoggedIn} onLoginClick={() => setClientLoginOpen(true)} clientUser={clientUser} cart={cart} addToCart={addToCart} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} clearCart={clearCart} />} />
          <Route path="/cadastro" element={<ClientRegister />} />
          <Route path="/perfil" element={<ClientProfile user={clientUser} onUserUpdate={setClientUser} addToCart={addToCart} />} />
          <Route path="/carrinho" element={<Cart cart={cart} updateQuantity={updateCartQuantity} removeFromCart={removeFromCart} clearCart={clearCart} clientUser={clientUser} addToCart={addToCart} cartTimeLeft={cartTimeLeft} />} />
          <Route path="/pedido-confirmado" element={<OrderConfirmation clearCart={clearCart} />} />
          <Route path="/meus-pedidos" element={<ProtectedRoute isAllowed={!!clientUser}><ClientOrders clientUser={clientUser} /></ProtectedRoute>} />
          <Route path="/meus-pedidos/:id" element={<ProtectedRoute isAllowed={!!clientUser}><ClientOrderDetails /></ProtectedRoute>} />
          <Route path="/meus-favoritos" element={<ProtectedRoute isAllowed={!!clientUser}><ClientFavorites clientUser={clientUser} addToCart={addToCart} onLoginClick={() => handleOpenLogin('client')} /></ProtectedRoute>} />
          <Route path="/acesso-negado" element={<AccessDenied isLoggedIn={isLoggedIn || !!clientUser} onLoginClick={() => setClientLoginOpen(true)} />} />
          <Route path="/sobre" element={<About />} />
          
          {/* Rotas Administrativas Protegidas */}
          <Route path="/produtos" element={<ProtectedRoute isAllowed={isLoggedIn}><Dashboard /></ProtectedRoute>} />
          <Route path="/produtos/novo" element={<ProtectedRoute isAllowed={isLoggedIn}><Products /></ProtectedRoute>} />
          <Route path="/ingredientes" element={<ProtectedRoute isAllowed={isLoggedIn}><Ingredients /></ProtectedRoute>} />
          <Route path="/ingredientes/novo" element={<ProtectedRoute isAllowed={isLoggedIn}><IngredientForm /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute isAllowed={isLoggedIn}><Clients /></ProtectedRoute>} />
          <Route path="/clientes/novo" element={<ProtectedRoute isAllowed={isLoggedIn}><ClientForm /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute isAllowed={isLoggedIn}><Orders /></ProtectedRoute>} />
          <Route path="/painel-cozinha" element={<ProtectedRoute isAllowed={isLoggedIn}><OrdersDashboard /></ProtectedRoute>} />
          
          {/* Pedidos: Acessível por Admin OU Cliente Logado */}
          <Route path="/pedidos/novo" element={
            <ProtectedRoute isAllowed={isLoggedIn || !!clientUser}>
              <OrderForm clientUser={clientUser} isAdmin={isLoggedIn} />
            </ProtectedRoute>
          } />
          <Route path="/pedidos/:id" element={
            <ProtectedRoute isAllowed={isLoggedIn || !!clientUser}>
              <OrderForm clientUser={clientUser} isAdmin={isLoggedIn} />
            </ProtectedRoute>
          } />

          <Route path="/combos" element={<ProtectedRoute isAllowed={isLoggedIn}><Combos /></ProtectedRoute>} />
          <Route path="/combos/novo" element={<ProtectedRoute isAllowed={isLoggedIn}><ComboForm /></ProtectedRoute>} />
          <Route path="/combos/:id" element={<ProtectedRoute isAllowed={isLoggedIn}><ComboForm /></ProtectedRoute>} />
          <Route path="/estoque" element={<ProtectedRoute isAllowed={isLoggedIn}><Inventory /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute isAllowed={isLoggedIn}><Settings /></ProtectedRoute>} />
          <Route path="/revendedores" element={<ProtectedRoute isAllowed={isLoggedIn}><Resellers /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute isAllowed={isLoggedIn}><Financial /></ProtectedRoute>} />
          <Route path="/production" element={<ProtectedRoute isAllowed={isLoggedIn}><Production /></ProtectedRoute>} />
          <Route path="/producao/:id" element={<ProtectedRoute isAllowed={isLoggedIn}><ProductionRecipe /></ProtectedRoute>} />
          <Route path="/relatorios/dizimo" element={<ProtectedRoute isAllowed={isLoggedIn}><TitheReport /></ProtectedRoute>} />
          <Route path="/relatorios/top-produtos" element={<ProtectedRoute isAllowed={isLoggedIn}><BestSellersReport /></ProtectedRoute>} />
          <Route path="/relatorios/usuarios" element={<ProtectedRoute isAllowed={isLoggedIn}><RelatorioUsuarios /></ProtectedRoute>} />
          <Route path="/relatorios/ranking" element={<ProtectedRoute isAllowed={isLoggedIn}><RelatorioRanking /></ProtectedRoute>} />
          <Route path="/inteligencia-vendas" element={<ProtectedRoute isAllowed={isLoggedIn}><InteligenciaVendas /></ProtectedRoute>} />
          <Route path="/prospeccao-revendedores" element={<ProtectedRoute isAllowed={isLoggedIn}><ProspeccaoRevendedores /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute isAllowed={isLoggedIn}><Analytics /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      </Box>

      {/* Drawer Login Cliente */}
      <Drawer
        anchor="right"
        open={clientLoginOpen}
        onClose={() => setClientLoginOpen(false)}
        sx={{
          zIndex: 1400,
          '& .MuiDrawer-paper': {
            backgroundColor: "#FFFAF5",
            borderLeft: "1px solid rgba(44,24,16,0.08)",
            width: { xs: '88vw', sm: 320 },
          }
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#2C1810', textAlign: 'center' }}>
            {loginMode === 'reseller' ? 'Área do Parceiro' : 'Área do Cliente'}
          </Typography>
          <TextField
            label="Login"
            fullWidth
            value={clientLoginData.login}
            onChange={(e) => setClientLoginData({...clientLoginData, login: e.target.value})}
          />
          <TextField
            label="Senha"
            type="password"
            fullWidth
            value={clientLoginData.senha}
            onChange={(e) => setClientLoginData({...clientLoginData, senha: e.target.value})}
          />
          <Button variant="contained" fullWidth onClick={handleClientLogin} sx={{ borderRadius: 50, bgcolor: '#D4580A', '&:hover': { bgcolor: '#B84508' }, py: 1.5 }}>ENTRAR</Button>
          <Button color="primary" onClick={() => { setClientLoginOpen(false); }} sx={{ textTransform: 'none', color: '#5D4037' }}>Esqueci minha senha</Button>
          {loginMode === 'client' && (
            <Button variant="outlined" fullWidth component={Link} to="/cadastro" onClick={() => setClientLoginOpen(false)} sx={{ borderRadius: 50, borderColor: '#D4580A', color: '#D4580A', py: 1.5 }}>CRIAR CONTA</Button>
          )}
        </Box>
      </Drawer>

      {/* Drawer Login Admin */}
      <Drawer
        anchor="right"
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        sx={{
          zIndex: 1400,
          '& .MuiDrawer-paper': {
            backgroundColor: "#FFFAF5",
            borderLeft: "1px solid rgba(44,24,16,0.08)",
            width: { xs: '88vw', sm: 320 },
          }
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#2C1810', textAlign: 'center' }}>
            Acesso Administrativo
          </Typography>
          <TextField label="Usuário Admin" fullWidth value={adminLoginData.login} onChange={(e) => setAdminLoginData({...adminLoginData, login: e.target.value})} />
          <TextField label="Senha" type="password" fullWidth value={adminLoginData.senha} onChange={(e) => setAdminLoginData({...adminLoginData, senha: e.target.value})} />
          <Button variant="contained" fullWidth onClick={handleAdminLogin} sx={{ borderRadius: 50, bgcolor: '#D4580A', '&:hover': { bgcolor: '#B84508' }, py: 1.5 }}>ENTRAR</Button>
        </Box>
      </Drawer>

      {/* Mobile Bottom Navigation (client/public users only, hidden on cart page) */}
      {!isLoggedIn && pathname !== '/carrinho' && (
        <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}>
          <BottomNavigation value={pathname} sx={{ bgcolor: '#FFFAF5', borderTop: '1px solid rgba(44,24,16,0.10)' }}>
            <BottomNavigationAction label="Início" value="/" icon={<HomeIcon />} component={Link} to="/" sx={{ color: '#8D6E63', '&.Mui-selected': { color: '#D4580A' } }} />
            <BottomNavigationAction label="Cardápio" value="#cardapio" icon={<MenuBook />} onClick={() => { navigate('/'); setTimeout(() => { document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' }); }, 150); }} sx={{ color: '#8D6E63', '&.Mui-selected': { color: '#D4580A' } }} />
            <BottomNavigationAction label="Favoritos" value="/meus-favoritos" icon={<Favorite />}
              onClick={() => clientUser ? navigate('/meus-favoritos') : handleOpenLogin('client')}
              sx={{ color: '#8D6E63', '&.Mui-selected': { color: '#D4580A' } }} />
            <BottomNavigationAction label="Perfil" value="/perfil" icon={<AccountCircle />}
              onClick={() => clientUser ? navigate('/perfil') : handleOpenLogin('client')}
              sx={{ color: '#8D6E63', '&.Mui-selected': { color: '#D4580A' } }} />
          </BottomNavigation>
        </Box>
      )}
      </>
    )}

    {/* Alerta de carrinho expirado */}
    {cartExpiredAlert && (
      <Box sx={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, maxWidth: 480, width: '90%',
      }}>
        <Box sx={{
          bgcolor: '#B71C1C', color: '#fff', borderRadius: 2, p: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'flex-start', gap: 1.5,
        }}>
          <Typography fontSize="1.4rem" lineHeight={1}>⏰</Typography>
          <Box flex={1}>
            <Typography fontWeight={800} fontSize="0.95rem">Tempo esgotado!</Typography>
            <Typography fontSize="0.85rem" mt={0.3}>
              Seu carrinho ficou inativo por 30 minutos e os itens foram devolvidos ao estoque. Adicione-os novamente para continuar.
            </Typography>
          </Box>
          <Box component="button" onClick={() => setCartExpiredAlert(false)}
            sx={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', p: 0, lineHeight: 1 }}>
            ✕
          </Box>
        </Box>
      </Box>
    )}

    </ThemeProvider>
    </QueryClientProvider>
  );
}