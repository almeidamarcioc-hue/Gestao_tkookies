// App.jsx
import { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Button, Box, Typography, Menu, MenuItem, createTheme, ThemeProvider, CssBaseline, TextField, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider, Container, Grid, Badge, CircularProgress } from "@mui/material";
import { Menu as MenuIcon, Instagram, WhatsApp, Facebook, AccountCircle, ShoppingCart, Favorite, Lock, Assessment } from "@mui/icons-material";
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
import TopProductsReport from "./pages/TopProductsReport";

const theme = createTheme({
  palette: {
    primary: { main: "#4E342E" }, // Marrom Café Escuro
    secondary: { main: "#8D6E63" }, // Marrom Claro
    background: { default: "#EFEBE9", paper: "#ffffff" }, // Bege muito claro (quase branco)
    text: { primary: "#3E2723", secondary: "#5D4037" }, // Texto Marrom Escuro
    success: { main: "#2E7D32" },
    error: { main: "#C62828" },
  },
  typography: {
    fontFamily: '"Nunito", "Quicksand", "Segoe UI", sans-serif',
    h4: { fontWeight: 800, color: "#4E342E" },
    h5: { fontWeight: 700, color: "#4E342E" },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          color: "#4E342E",
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 50, padding: "8px 24px" }, // Botões arredondados
        contained: { 
          boxShadow: "0 4px 10px rgba(78, 52, 46, 0.2)",
          "&:hover": { backgroundColor: "#3E2723" }
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.02)",
          border: "1px solid #D7CCC8", // Borda marrom clara
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { backgroundColor: "#D7CCC8", color: "#3E2723", fontWeight: "bold" },
        root: { borderBottom: "1px solid #EFEBE9" },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { "& .MuiOutlinedInput-root": { borderRadius: 12 } },
      },
    },
  },
});

export default function App() {
  const navigate = useNavigate();
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
  }, []);

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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setClientUser(null);
    localStorage.removeItem("cookie_erp_admin");
    localStorage.removeItem("cookie_erp_client");
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
      setClientLoginOpen(false);
      setClientLoginData({ login: "", senha: "" });
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || "Erro no login";
      alert(msg);
    }
  };

  const handleAdminLogin = () => {
    if (adminLoginData.login === "tkookies_" && adminLoginData.senha === "TKookies") {
      setIsLoggedIn(true);
      localStorage.setItem("cookie_erp_admin", "true");
      setAdminLoginOpen(false);
      setAdminLoginData({ login: "", senha: "" });
      navigate("/produtos");
    } else {
      alert("Credenciais de administrador inválidas.");
    }
  };

  // Funções do Carrinho
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { ...product, quantidade: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateCartQuantity = (productId, newQty) => {
    if (newQty < 1) return;
    setCart((prev) => prev.map((item) => item.id === productId ? { ...item, quantidade: newQty } : item));
  };

  const clearCart = () => setCart([]);

  return (
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
      <AppBar position="sticky" sx={{ top: 0, zIndex: 1100 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h5" component={Link} to="/" sx={{ flexGrow: 1, fontWeight: '900', textDecoration: 'none', color: 'primary.main', letterSpacing: '-0.5px' }}>
            TKookies
          </Typography>
          <Box display={{ xs: 'none', md: 'flex' }} gap={1}>
            <Button color="inherit" component={Link} to="/">Início</Button>
            
            {isLoggedIn ? (
              <>
                {/* Menu Cadastros */}
                <Button color="inherit" onClick={(e) => setAnchorCad(e.currentTarget)}>CADASTROS</Button>
                <Menu anchorEl={anchorCad} open={openCad} onClose={handleClose}>
                  <MenuItem component={Link} to="/produtos/novo" onClick={handleClose}>Novo Produto</MenuItem>
                  <MenuItem component={Link} to="/ingredientes/novo" onClick={handleClose}>Novo Ingrediente</MenuItem>
                  <MenuItem component={Link} to="/clientes/novo" onClick={handleClose}>Novo Cliente</MenuItem>
                  <MenuItem component={Link} to="/combos/novo" onClick={handleClose}>Novo Combo</MenuItem>
                  <MenuItem component={Link} to="/revendedores" onClick={handleClose}>Novo Revendedor</MenuItem>
                </Menu>

                {/* Menu Consultas */}
                <Button color="inherit" onClick={(e) => setAnchorCons(e.currentTarget)}>CONSULTAS</Button>
                <Menu anchorEl={anchorCons} open={openCons} onClose={handleClose}>
                  <MenuItem component={Link} to="/produtos" onClick={handleClose}>Produtos</MenuItem>
                  <MenuItem component={Link} to="/ingredientes" onClick={handleClose}>Ingredientes</MenuItem>
                  <MenuItem component={Link} to="/clientes" onClick={handleClose}>Clientes</MenuItem>
                  <MenuItem component={Link} to="/combos" onClick={handleClose}>Combos</MenuItem>
                  <MenuItem component={Link} to="/estoque" onClick={handleClose}>Estoque</MenuItem>
                  <MenuItem component={Link} to="/revendedores" onClick={handleClose}>Revendedores</MenuItem>
                  <MenuItem component={Link} to="/status" onClick={handleClose}>Status do Sistema</MenuItem>
                </Menu>

                <Button color="inherit" component={Link} to="/production">PRODUÇÃO</Button>
                <Button color="inherit" component={Link} to="/financeiro">FINANCEIRO</Button>
                <Button color="inherit" component={Link} to="/configuracoes">Configurações</Button>
                {/* Menu Pedidos */}
                <Button color="inherit" onClick={(e) => setAnchorPed(e.currentTarget)}>PEDIDOS</Button>
                <Menu anchorEl={anchorPed} open={openPed} onClose={handleClose}>
                  <MenuItem component={Link} to="/pedidos/novo" onClick={handleClose}>Novo Pedido</MenuItem>
                  <MenuItem component={Link} to="/pedidos" onClick={handleClose}>Consultar Pedidos</MenuItem>
                  <MenuItem component={Link} to="/painel-cozinha" onClick={handleClose}>Painel de Cozinha (KDS)</MenuItem>
                </Menu>

                {/* Menu Relatórios */}
                <Button color="inherit" onClick={(e) => setAnchorRel(e.currentTarget)}>RELATÓRIOS</Button>
                <Menu anchorEl={anchorRel} open={openRel} onClose={handleClose}>
                  <MenuItem component={Link} to="/relatorios/dizimo" onClick={handleClose}>Dízimo</MenuItem>
                  <MenuItem component={Link} to="/relatorios/top-produtos" onClick={handleClose}>Sabores mais Amados</MenuItem>
                </Menu>

                <Button color="inherit" onClick={handleLogout}>SAIR</Button>
              </>
            ) : (
              <>
                {clientUser ? (
                  <>
                    <Button color="inherit" startIcon={<AccountCircle />} onClick={(e) => setAnchorClient(e.currentTarget)}>
                      Olá, {clientUser.nome.split(' ')[0]} {clientUser.is_revendedor ? '(Parceiro)' : ''}
                    </Button>
                    <Menu anchorEl={anchorClient} open={openClient} onClose={handleClose}>
                      <MenuItem component={Link} to="/perfil" onClick={handleClose}>Meu Perfil</MenuItem>
                      <MenuItem component={Link} to="/meus-favoritos" onClick={handleClose}>Meus Favoritos</MenuItem>
                      <MenuItem component={Link} to="/meus-pedidos" onClick={handleClose}>Meus Pedidos</MenuItem>
                      <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Sair</MenuItem>
                    </Menu>
                  </>
                ) : (
                  <>
                    <Button color="inherit" onClick={() => handleOpenLogin('client')}>
                      Área do Cliente
                    </Button>
                    <Button color="inherit" onClick={() => handleOpenLogin('reseller')} sx={{ bgcolor: 'rgba(78, 52, 46, 0.1)' }}>
                      Área do Parceiro
                    </Button>
                  </>
                )}
              </>
            )}
            
            {/* Ícone do Carrinho (Sempre visível ou apenas para clientes) */}
            {!isLoggedIn && (
              <IconButton color="inherit" component={Link} to="/carrinho">
                <Badge badgeContent={cart.reduce((acc, item) => acc + item.quantidade, 0)} color="error"><ShoppingCart /></Badge>
              </IconButton>
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
            width: 250,
            backgroundColor: "rgba(255, 255, 255, 0.8)", // Fundo branco translúcido
            backdropFilter: "blur(12px)", // Efeito de vidro (Glassmorphism)
            borderRight: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "4px 0 20px rgba(78, 52, 46, 0.1)" // Sombra marrom suave
          },
        }}
      >
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ my: 2, fontWeight: '900', color: 'primary.main' }}>
            <Box component="span" sx={{ 
              background: 'linear-gradient(135deg, #4E342E 0%, #8D6E63 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px'
            }}>TK<Box component="span" sx={{ fontSize: '0.8em' }}>🍪🍪</Box>kies</Box>
          </Typography>
          <Divider />
          <List>
            <ListItem disablePadding><ListItemButton component={Link} to="/"><ListItemText primary="HOME" /></ListItemButton></ListItem>
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
                <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="SAIR" sx={{ color: 'error.main' }} /></ListItemButton></ListItem>
              </>
            ) : (
               clientUser ? (
                 <>
                   <ListItem disablePadding><ListItemButton component={Link} to="/perfil"><ListItemText primary="Meu Perfil" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton component={Link} to="/meus-pedidos"><ListItemText primary="Meus Pedidos" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="SAIR" sx={{ color: 'error.main' }} /></ListItemButton></ListItem>
                 </>
               ) : (
                 <>
                   <ListItem disablePadding><ListItemButton onClick={() => handleOpenLogin('client')}><ListItemText primary="Área do Cliente" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton onClick={() => handleOpenLogin('reseller')}><ListItemText primary="Área do Parceiro" sx={{ color: 'primary.main', fontWeight: 'bold' }} /></ListItemButton></ListItem>
                 </>
               )
            )}
            <ListItem disablePadding><ListItemButton component={Link} to="/carrinho"><ListItemText primary="Carrinho" /></ListItemButton></ListItem>
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

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Routes>
          <Route path="/" element={<Home isLoggedIn={isLoggedIn} onLoginClick={() => setClientLoginOpen(true)} clientUser={clientUser} cart={cart} addToCart={addToCart} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} />} />
          <Route path="/cadastro" element={<ClientRegister />} />
          <Route path="/perfil" element={<ClientProfile user={clientUser} onUserUpdate={setClientUser} />} />
          <Route path="/carrinho" element={<Cart cart={cart} updateQuantity={updateCartQuantity} removeFromCart={removeFromCart} clearCart={clearCart} clientUser={clientUser} />} />
          <Route path="/pedido-confirmado" element={<OrderConfirmation />} />
          <Route path="/meus-pedidos" element={<ProtectedRoute isAllowed={!!clientUser}><ClientOrders clientUser={clientUser} /></ProtectedRoute>} />
          <Route path="/meus-pedidos/:id" element={<ProtectedRoute isAllowed={!!clientUser}><ClientOrderDetails /></ProtectedRoute>} />
          <Route path="/meus-favoritos" element={<ProtectedRoute isAllowed={!!clientUser}><ClientFavorites clientUser={clientUser} addToCart={addToCart} /></ProtectedRoute>} />
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
          <Route path="/relatorios/top-produtos" element={<ProtectedRoute isAllowed={isLoggedIn}><TopProductsReport /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* Rodapé */}
      <Box component="footer" sx={{ bgcolor: 'primary.main', color: 'white', py: 6, mt: 'auto' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                TK<Box component="span" sx={{ fontSize: '0.8em' }}>🍪🍪</Box>kies
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                Um pedacinho de felicidade em cada mordida. Feito com amor e os melhores ingredientes para você.
              </Typography>
              <Button color="inherit" component={Link} to="/sobre" sx={{ p: 0, minWidth: 0, textTransform: 'none', fontWeight: 'normal', textDecoration: 'underline' }}>
                Sobre Nós
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Contato
              </Typography>
              <Typography variant="body2" display="block" sx={{ mb: 0.5 }}>📍 Três de Maio - RS</Typography>
              <Typography variant="body2" display="block" sx={{ mb: 0.5 }}>📞 (55) 9 9731 2557</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Redes Sociais
              </Typography>
              <Box display="flex" gap={1}>
                <IconButton color="inherit" href="https://www.instagram.com/tkookies_/" target="_blank" aria-label="Instagram">
                  <Instagram />
                </IconButton>
                <IconButton color="inherit" href="https://www.facebook.com/tkookiestm" target="_blank" aria-label="Facebook">
                  <Facebook />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.6, mb: 1 }}>
              Todos o direitos reservados - TK<Box component="span" sx={{ fontSize: '0.8em' }}>🍪🍪</Box>kies © {new Date().getFullYear()}
            </Typography>
            <IconButton 
              onClick={() => isLoggedIn ? navigate('/produtos') : setAdminLoginOpen(true)} 
              sx={{ 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.3)', 
                opacity: 0.7,
                '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' }
              }}
              title="Acesso Administrativo"
            >
              <Lock fontSize="small" />
            </IconButton>
          </Box>
        </Container>
      </Box>
      </Box>

      {/* Drawer Login Cliente */}
      <Drawer 
        anchor="right" 
        open={clientLoginOpen} 
        onClose={() => setClientLoginOpen(false)}
        sx={{
          '& .MuiDrawer-paper': { 
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "-4px 0 20px rgba(78, 52, 46, 0.1)"
          },
        }}
      >
        <Box sx={{ width: 300, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#4E342E', textAlign: 'center' }}>
            {loginMode === 'reseller' ? 'Área do Parceiro' : 'Área do Cliente'}
          </Typography>
          <TextField 
            label="Login" 
            fullWidth 
            value={clientLoginData.login} 
            onChange={(e) => setClientLoginData({...clientLoginData, login: e.target.value})} 
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }}
          />
          <TextField 
            label="Senha" 
            type="password" 
            fullWidth 
            value={clientLoginData.senha} 
            onChange={(e) => setClientLoginData({...clientLoginData, senha: e.target.value})} 
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }}
          />
          <Button variant="contained" fullWidth onClick={handleClientLogin} sx={{ borderRadius: 50, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' }, py: 1.5 }}>ENTRAR</Button>
          <Button color="primary" onClick={() => { setClientLoginOpen(false); }} sx={{ textTransform: 'none', color: '#5D4037' }}>Esqueci minha senha</Button>
          {loginMode === 'client' && (
            <Button variant="outlined" fullWidth component={Link} to="/cadastro" onClick={() => setClientLoginOpen(false)} sx={{ borderRadius: 50, borderColor: '#4E342E', color: '#4E342E', py: 1.5 }}>CRIAR CONTA</Button>
          )}
        </Box>
      </Drawer>

      {/* Drawer Login Admin */}
      <Drawer 
        anchor="right" 
        open={adminLoginOpen} 
        onClose={() => setAdminLoginOpen(false)}
        sx={{
          '& .MuiDrawer-paper': { 
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "-4px 0 20px rgba(78, 52, 46, 0.1)"
          },
        }}
      >
        <Box sx={{ width: 300, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#4E342E', textAlign: 'center' }}>
            Acesso Administrativo
          </Typography>
          <TextField label="Usuário Admin" fullWidth value={adminLoginData.login} onChange={(e) => setAdminLoginData({...adminLoginData, login: e.target.value})} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          <TextField label="Senha" type="password" fullWidth value={adminLoginData.senha} onChange={(e) => setAdminLoginData({...adminLoginData, senha: e.target.value})} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.5)' } }} />
          <Button variant="contained" fullWidth onClick={handleAdminLogin} sx={{ borderRadius: 50, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' }, py: 1.5 }}>ENTRAR</Button>
        </Box>
      </Drawer>
      </>
    )}
    </ThemeProvider>
  );
}