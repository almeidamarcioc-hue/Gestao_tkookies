// App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { AppBar, Toolbar, Button, Box, Typography, Menu, MenuItem, createTheme, ThemeProvider, CssBaseline, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
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
  const [anchorCad, setAnchorCad] = useState(null);
  const [anchorCons, setAnchorCons] = useState(null);
  const [anchorPed, setAnchorPed] = useState(null);

  // Estados de Autenticação
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const openCad = Boolean(anchorCad);
  const openCons = Boolean(anchorCons);
  const openPed = Boolean(anchorPed);

  const handleClose = () => {
    setAnchorCad(null);
    setAnchorCons(null);
    setAnchorPed(null);
  };

  const handleLogin = () => {
    if (username === "tkookies_" && password === "TKookies") {
      setIsLoggedIn(true);
      setLoginOpen(false);
      setUsername("");
      setPassword("");
    } else {
      alert("Usuário ou senha incorretos!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    handleClose();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
    <BrowserRouter>
      <AppBar position="sticky" sx={{ top: 0, zIndex: 1100 }}>
        <Toolbar>
          <Typography variant="h5" component={Link} to="/" sx={{ flexGrow: 1, fontWeight: '900', textDecoration: 'none', color: 'primary.main', letterSpacing: '-0.5px' }}>
            🍪 Gestão Tkookies
          </Typography>
          <Box display="flex" gap={1}>
            <Button color="inherit" component={Link} to="/">HOME</Button>
            
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
                </Menu>

                {/* Menu Pedidos */}
                <Button color="inherit" onClick={(e) => setAnchorPed(e.currentTarget)}>PEDIDOS</Button>
                <Menu anchorEl={anchorPed} open={openPed} onClose={handleClose}>
                  <MenuItem component={Link} to="/pedidos/novo" onClick={handleClose}>Novo Pedido</MenuItem>
                  <MenuItem component={Link} to="/pedidos" onClick={handleClose}>Consultar Pedidos</MenuItem>
                </Menu>
                <Button color="inherit" onClick={handleLogout}>SAIR</Button>
              </>
            ) : (
              <Button color="inherit" onClick={() => setLoginOpen(true)}>LOGIN</Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ py: 4, minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Home isLoggedIn={isLoggedIn} onLoginClick={() => setLoginOpen(true)} />} />
          
          {isLoggedIn ? (
            <>
              <Route path="/produtos" element={<Dashboard />} />
              <Route path="/produtos/novo" element={<Products />} />
              <Route path="/ingredientes" element={<Ingredients />} />
              <Route path="/ingredientes/novo" element={<IngredientForm />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/novo" element={<ClientForm />} />
              <Route path="/pedidos" element={<Orders />} />
              <Route path="/pedidos/novo" element={<OrderForm />} />
              <Route path="/pedidos/:id" element={<OrderForm />} />
              <Route path="/combos" element={<Combos />} />
              <Route path="/combos/novo" element={<ComboForm />} />
              <Route path="/combos/:id" element={<ComboForm />} />
              <Route path="/estoque" element={<Inventory />} />
              <Route path="/production" element={<Production />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/" replace />} />
          )}
        </Routes>
      </Box>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onClose={() => setLoginOpen(false)}>
        <DialogTitle>Acesso Restrito</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Usuário"
            fullWidth
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Senha"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)}>Cancelar</Button>
          <Button onClick={handleLogin} variant="contained">Entrar</Button>
        </DialogActions>
      </Dialog>
    </BrowserRouter>
    </ThemeProvider>
  );
}