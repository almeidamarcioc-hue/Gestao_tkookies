import { Box, Typography, Button, Container, Paper } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { LockOutlined } from "@mui/icons-material";

export default function AccessDenied({ isLoggedIn, onLoginClick }) {
  const location = useLocation();
  const attemptedPath = location.state?.from?.pathname;

  let message = "Você não tem permissão para acessar esta página.";

  if (attemptedPath) {
    if (attemptedPath.includes("/pedidos")) {
        message = "A área de pedidos é restrita. Por favor, faça login para continuar.";
    } else if (attemptedPath.includes("/produtos") || attemptedPath.includes("/ingredientes") || attemptedPath.includes("/estoque")) {
        message = "O gerenciamento de catálogo e estoque é restrito a administradores.";
    } else if (attemptedPath.includes("/clientes")) {
        message = "O gerenciamento de clientes é restrito a administradores.";
    } else if (attemptedPath.includes("/configuracoes")) {
        message = "As configurações do sistema são restritas a administradores.";
    } else if (attemptedPath.includes("/combos")) {
        message = "O gerenciamento de combos é restrito a administradores.";
    } else if (attemptedPath.includes("/production")) {
        message = "A área de produção é restrita a funcionários autorizados.";
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
      <Paper sx={{ p: 5, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ bgcolor: '#FFEBEE', p: 2, borderRadius: '50%', mb: 2 }}>
            <LockOutlined sx={{ fontSize: 60, color: "error.main" }} />
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom color="error.main">
          Acesso Negado
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          {message} <br/>
          Verifique suas credenciais ou entre em contato com o administrador.
        </Typography>
        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
          <Button variant="contained" component={Link} to="/" size="large" sx={{ borderRadius: 50, px: 4 }}>
            Voltar para o Início
          </Button>
          {!isLoggedIn && (
            <Button variant="outlined" onClick={onLoginClick} size="large" sx={{ borderRadius: 50, px: 4 }}>
              Fazer Login
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}