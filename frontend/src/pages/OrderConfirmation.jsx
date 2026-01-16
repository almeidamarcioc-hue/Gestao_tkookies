import { useEffect } from "react";
import { Container, Typography, Box, Button, Paper } from "@mui/material";
import { CheckCircleOutline, ReceiptLong, Home } from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId;

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    // Carrega confete dinamicamente para efeito visual
    import("canvas-confetti").then((module) => {
      const confetti = module.default;
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
      
      return () => clearInterval(interval);
    }).catch(() => console.log("Confetti opcional não carregado"));

  }, [orderId, navigate]);

  if (!orderId) return null;

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
      <Paper elevation={3} sx={{ p: 5, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CheckCircleOutline sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
        
        <Typography variant="h4" fontWeight="900" gutterBottom color="primary">
          Pedido Confirmado!
        </Typography>
        
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Obrigado pela sua compra.
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Seu pedido <strong>#{orderId}</strong> foi recebido e já estamos preparando tudo com muito carinho.
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
          <Button variant="contained" size="large" startIcon={<ReceiptLong />} component={Link} to="/meus-pedidos" fullWidth sx={{ borderRadius: 50, py: 1.5 }}>
            Acompanhar Meus Pedidos
          </Button>
          
          <Button variant="outlined" size="large" startIcon={<Home />} component={Link} to="/" fullWidth sx={{ borderRadius: 50, py: 1.5 }}>
            Voltar para o Início
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}