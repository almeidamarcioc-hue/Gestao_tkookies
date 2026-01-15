import { Box, Typography, Button, Container } from "@mui/material";
import { Link } from "react-router-dom";

export default function Home({ isLoggedIn, onLoginClick }) {
  return (
    <Container maxWidth="md">
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" textAlign="center" gap={3}>
        <Typography variant="h2" fontWeight="900" color="primary" sx={{ letterSpacing: '-1px', textShadow: '2px 2px 0px #D7CCC8' }}>
          Gestão Tkookies
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 500, maxWidth: 600 }}>
          Controle total de custos, produção e revenda para o seu negócio de cookies.
        </Typography>
        
        {isLoggedIn ? (
          <Box display="flex" gap={2} mt={2}>
            <Button variant="contained" size="large" component={Link} to="/produtos/novo" sx={{ px: 4, py: 1.5 }}>
              Novo Produto
            </Button>
            <Button variant="outlined" size="large" component={Link} to="/produtos" sx={{ px: 4, py: 1.5 }}>
              Consultar
            </Button>
          </Box>
        ) : (
          <Box mt={2}>
            <Button variant="contained" size="large" onClick={onLoginClick} sx={{ px: 4, py: 1.5 }}>
              Fazer Login
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}