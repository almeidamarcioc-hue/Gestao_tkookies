import { useEffect } from "react";
import { Container, Typography, Box, Button } from "@mui/material";
import { ReceiptLong, Home } from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function OrderConfirmation({ clearCart }) {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId;

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    // Garante que o carrinho foi limpo após o sucesso
    if (clearCart) {
      clearCart();
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

  }, [orderId, navigate, clearCart]);

  if (!orderId) return null;

  return (
    <Box sx={{ bgcolor: '#FFFAF5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Box
          sx={{
            background: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 2px 20px rgba(78,52,46,0.09)',
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Animated checkmark */}
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              bgcolor: '#E8F5E9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              '@keyframes popIn': {
                '0%': { transform: 'scale(0)', opacity: 0 },
                '100%': { transform: 'scale(1)', opacity: 1 },
              },
            }}
          >
            <Typography sx={{ fontSize: 52, lineHeight: 1 }}>✓</Typography>
          </Box>

          <Typography variant="h4" fontWeight="900" gutterBottom sx={{ color: '#4E342E' }}>
            Pedido Confirmado!
          </Typography>

          <Typography variant="body1" sx={{ color: '#795548', mb: 3 }}>
            Já estamos preparando seu pedido com muito amor! 🍪
          </Typography>

          {/* Order number highlight box */}
          <Box
            sx={{
              bgcolor: '#FFF8F0',
              border: '1px solid #FFCC80',
              borderRadius: '12px',
              px: 4,
              py: 2,
              mb: 4,
            }}
          >
            <Typography variant="caption" sx={{ color: '#795548', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
              Número do Pedido
            </Typography>
            <Typography variant="h5" fontWeight="900" sx={{ color: '#E65100' }}>
              #{orderId}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ReceiptLong />}
              component={Link}
              to="/meus-pedidos"
              fullWidth
              sx={{
                borderRadius: 50,
                py: 1.5,
                bgcolor: '#4E342E',
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#3E2723' },
              }}
            >
              Acompanhar Meus Pedidos
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<Home />}
              component={Link}
              to="/"
              fullWidth
              sx={{
                borderRadius: 50,
                py: 1.5,
                borderColor: '#4E342E',
                color: '#4E342E',
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#FFF8F0', borderColor: '#3E2723' },
              }}
            >
              Voltar para o Início
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
