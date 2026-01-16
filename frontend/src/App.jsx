// App.jsx
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Button, Box, Typography, Menu, MenuItem, createTheme, ThemeProvider, CssBaseline, TextField, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider, Container, Grid, Badge } from "@mui/material";
import { Menu as MenuIcon, Instagram, WhatsApp, Facebook, AccountCircle, ShoppingCart } from "@mui/icons-material";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Ingredients from "./pages/Ingredients";
import IngredientForm from "./pages/IngredientForm";
import Products from "./pages/Products";
import Production from "./pages/Production";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import Orders from "./pages/Orders";
import OrderForm from "./pages/OrderForm";
import Combos from "./pages/Combos";
import ComboForm from "./pages/ComboForm";
import Inventory from "./pages/Inventory";
import Settings from "./pages/Settings";
import ClientRegister from "./pages/ClientRegister";
import ClientProfile from "./pages/ClientProfile";
import Cart from "./pages/Cart";
import api from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessDenied from "./pages/AccessDenied";

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

// Helper component for redirecting
function RedirectHandler({ to, onReset }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
    onReset();
  }, [to, navigate, onReset]);
  return null;
}

export default function App() {
  const [anchorCad, setAnchorCad] = useState(null);
  const [anchorCons, setAnchorCons] = useState(null);
  const [anchorPed, setAnchorPed] = useState(null);

  // Estados de Autenticação
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Estados Login Cliente
  const [clientLoginOpen, setClientLoginOpen] = useState(false);
  const [clientUser, setClientUser] = useState(null); // Objeto do cliente logado
  const [clientLoginData, setClientLoginData] = useState({ login: "", senha: "" });
  const [redirectTo, setRedirectTo] = useState(null);
  const [cart, setCart] = useState([]);

  const openCad = Boolean(anchorCad);
  const openCons = Boolean(anchorCons);
  const openPed = Boolean(anchorPed);

  const handleClose = () => {
    setAnchorCad(null);
    setAnchorCons(null);
    setAnchorPed(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setClientUser(null);
    handleClose();
    setRedirectTo("/");
  };

  const handleClientLogin = async () => {
    // 1. Verifica se é Admin
    if (clientLoginData.login === "tkookies_" && clientLoginData.senha === "TKookies") {
      setIsLoggedIn(true);
      setClientLoginOpen(false);
      setClientLoginData({ login: "", senha: "" });
      return;
    }

    // 2. Tenta login como Cliente
    try {
      const res = await api.post("/clientes/login", clientLoginData);
      setClientUser(res.data);
      setClientLoginOpen(false);
      setClientLoginData({ login: "", senha: "" });
      setRedirectTo("/");
    } catch (err) {
      const msg = err.response?.data?.error || "Erro no login";
      alert(msg);
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
    <BrowserRouter>
      {redirectTo && <RedirectHandler to={redirectTo} onReset={() => setRedirectTo(null)} />}
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
            🍪 TKookies
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
                </Menu>

                {/* Menu Consultas */}
                <Button color="inherit" onClick={(e) => setAnchorCons(e.currentTarget)}>CONSULTAS</Button>
                <Menu anchorEl={anchorCons} open={openCons} onClose={handleClose}>
                  <MenuItem component={Link} to="/produtos" onClick={handleClose}>Produtos</MenuItem>
                  <MenuItem component={Link} to="/ingredientes" onClick={handleClose}>Ingredientes</MenuItem>
                  <MenuItem component={Link} to="/clientes" onClick={handleClose}>Clientes</MenuItem>
                  <MenuItem component={Link} to="/combos" onClick={handleClose}>Combos</MenuItem>
                  <MenuItem component={Link} to="/estoque" onClick={handleClose}>Estoque</MenuItem>
                  <MenuItem component={Link} to="/status" onClick={handleClose}>Status do Sistema</MenuItem>
                </Menu>

                <Button color="inherit" component={Link} to="/configuracoes">Configurações</Button>
                {/* Menu Pedidos */}
                <Button color="inherit" onClick={(e) => setAnchorPed(e.currentTarget)}>PEDIDOS</Button>
                <Menu anchorEl={anchorPed} open={openPed} onClose={handleClose}>
                  <MenuItem component={Link} to="/pedidos/novo" onClick={handleClose}>Novo Pedido</MenuItem>
                  <MenuItem component={Link} to="/pedidos" onClick={handleClose}>Consultar Pedidos</MenuItem>
                </Menu>
                <Button color="inherit" onClick={handleLogout}>SAIR</Button>
              </>
            ) : (
              <>
                {clientUser ? (
                  <>
                    <Button color="inherit" startIcon={<AccountCircle />} component={Link} to="/perfil">
                      Olá, {clientUser.nome.split(' ')[0]}
                    </Button>
                    <Button color="inherit" onClick={handleLogout}>SAIR</Button>
                  </>
                ) : (
                  <Button color="inherit" onClick={() => setClientLoginOpen(true)}>
                    Login
                  </Button>
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
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ my: 2, fontWeight: 'bold', color: 'primary.main' }}>
            🍪 TKookies
          </Typography>
          <Divider />
          <List>
            <ListItem disablePadding><ListItemButton component={Link} to="/"><ListItemText primary="HOME" /></ListItemButton></ListItem>
            {isLoggedIn ? (
              <>
                <ListItem disablePadding><ListItemButton component={Link} to="/pedidos/novo"><ListItemText primary="Novo Pedido" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/pedidos"><ListItemText primary="Pedidos" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/produtos"><ListItemText primary="Produtos" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/clientes"><ListItemText primary="Clientes" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/combos"><ListItemText primary="Combos" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/estoque"><ListItemText primary="Estoque" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton component={Link} to="/configuracoes"><ListItemText primary="Configurações" /></ListItemButton></ListItem>
                <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="SAIR" sx={{ color: 'error.main' }} /></ListItemButton></ListItem>
              </>
            ) : (
               clientUser ? (
                 <>
                   <ListItem disablePadding><ListItemButton component={Link} to="/perfil"><ListItemText primary="Meu Perfil" /></ListItemButton></ListItem>
                   <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="SAIR" sx={{ color: 'error.main' }} /></ListItemButton></ListItem>
                 </>
               ) : (
                 <ListItem disablePadding><ListItemButton onClick={() => setClientLoginOpen(true)}><ListItemText primary="Login" /></ListItemButton></ListItem>
               )
            )}
            <ListItem disablePadding><ListItemButton component={Link} to="/carrinho"><ListItemText primary="Carrinho" /></ListItemButton></ListItem>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Routes>
          <Route path="/" element={<Home isLoggedIn={isLoggedIn} onLoginClick={() => setClientLoginOpen(true)} clientUser={clientUser} addToCart={addToCart} />} />
          <Route path="/cadastro" element={<ClientRegister />} />
          <Route path="/perfil" element={<ClientProfile user={clientUser} onUserUpdate={setClientUser} />} />
          <Route path="/carrinho" element={<Cart cart={cart} updateQuantity={updateCartQuantity} removeFromCart={removeFromCart} clearCart={clearCart} clientUser={clientUser} />} />
          <Route path="/acesso-negado" element={<AccessDenied isLoggedIn={isLoggedIn || !!clientUser} onLoginClick={() => setClientLoginOpen(true)} />} />
          
          {/* Rotas Administrativas Protegidas */}
          <Route path="/produtos" element={<ProtectedRoute isAllowed={isLoggedIn}><Dashboard /></ProtectedRoute>} />
          <Route path="/produtos/novo" element={<ProtectedRoute isAllowed={isLoggedIn}><Products /></ProtectedRoute>} />
          <Route path="/ingredientes" element={<ProtectedRoute isAllowed={isLoggedIn}><Ingredients /></ProtectedRoute>} />
          <Route path="/ingredientes/novo" element={<ProtectedRoute isAllowed={isLoggedIn}><IngredientForm /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute isAllowed={isLoggedIn}><Clients /></ProtectedRoute>} />
          <Route path="/clientes/novo" element={<ProtectedRoute isAllowed={isLoggedIn}><ClientForm /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute isAllowed={isLoggedIn}><Orders /></ProtectedRoute>} />
          
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
          <Route path="/production" element={<ProtectedRoute isAllowed={isLoggedIn}><Production /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* Rodapé */}
      <Box component="footer" sx={{ bgcolor: 'primary.main', color: 'white', py: 6, mt: 'auto' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                🍪 TKookies
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Um pedacinho de felicidade em cada mordida. Feito com amor e os melhores ingredientes para você.
              </Typography>
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
          <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
            Todos o direitos reservados - TKookies © {new Date().getFullYear()}
          </Typography>
        </Container>
      </Box>
      </Box>

      {/* Drawer Login Cliente */}
      <Drawer anchor="right" open={clientLoginOpen} onClose={() => setClientLoginOpen(false)}>
        <Box sx={{ width: 300, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">Login</Typography>
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
          <Button variant="contained" fullWidth onClick={handleClientLogin}>ENTRAR</Button>
          <Button color="primary" onClick={() => { setClientLoginOpen(false); }}>Esqueci minha senha</Button>
          <Button variant="outlined" fullWidth component={Link} to="/cadastro" onClick={() => setClientLoginOpen(false)}>CRIAR CONTA</Button>
        </Box>
      </Drawer>
    </BrowserRouter>
    </ThemeProvider>
  );
}