import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Divider, Button, Chip } from "@mui/material";
import { ArrowBack, LocalShipping, Storefront, AttachMoney, QrCode } from "@mui/icons-material";
import { motion } from "framer-motion";
import api from "../services/api";

export default function ClientOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/pedidos/${id}`)
      .then(res => setOrder(res.data))
      .catch(err => console.error("Erro ao carregar pedido", err));
  }, [id]);

  // Estilos "Organic Soft Tech" (Versão Light/Café)
  const glassStyle = {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 8px 32px 0 rgba(78, 52, 46, 0.08)",
    borderRadius: "24px",
    color: "#3E2723"
  };

  if (!order) return (
    <Box sx={{ bgcolor: '#D7CCC8', minHeight: '100vh', color: '#3E2723', overflowX: 'hidden', position: 'relative' }}>
      <Container sx={{ mt: 4, position: 'relative', zIndex: 1 }}><Typography>Carregando detalhes do pedido...</Typography></Container>
    </Box>
  );

  const isDelivery = Number(order.frete) > 0;

  return (
    <Box sx={{ bgcolor: '#D7CCC8', minHeight: '100vh', color: '#3E2723', overflowX: 'hidden', position: 'relative' }}>
      {/* Background Wrapper Animado */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <motion.div 
          animate={{ 
            background: [
              `radial-gradient(circle at 20% 30%, rgba(141, 110, 99, 0.15) 0%, transparent 50%)`,
              `radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)`
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
        />
        <Box sx={{ position: 'absolute', top: '-20%', left: '-10%', width: '50%', height: '50%', background: '#EFEBE9', filter: 'blur(150px)', opacity: 0.4, borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: '#FFE0B2', filter: 'blur(180px)', opacity: 0.3, borderRadius: '50%' }} />
      </Box>

    <Container maxWidth="lg" sx={{ mt: 6, mb: 8, position: 'relative', zIndex: 1 }}>
      <Box mb={4} display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Button startIcon={<ArrowBack />} component={Link} to="/meus-pedidos" sx={{ fontWeight: 'bold', color: '#4E342E', borderRadius: 50, bgcolor: 'rgba(255,255,255,0.5)' }}>
          Voltar
        </Button>
        <Typography variant="h4" fontWeight="900" sx={{ color: '#4E342E' }}>
          Pedido #{order.id}
        </Typography>
        <Chip 
          label={order.status} 
          color={order.status === 'Finalizado' ? 'success' : order.status === 'Cancelado' ? 'error' : 'primary'} 
          sx={{ fontWeight: 'bold', borderRadius: 2 }} 
        />
      </Box>

      <Grid container spacing={5}>
        {/* Coluna da Esquerda: Itens (Visual idêntico ao Carrinho) */}
        <Grid item xs={12} md={8}>
          <Box sx={{ ...glassStyle, p: 0, overflow: 'hidden', mb: 4 }}>
          <TableContainer component={Box} sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Produto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Preço</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Qtd</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.itens.map((item) => (
                  <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        {item.imagem && (
                          <img 
                            src={item.imagem} 
                            alt={item.produto_nome} 
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} 
                          />
                        )}
                        <Typography variant="subtitle1" fontWeight="bold" color="#4E342E">{item.produto_nome}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="#5D4037">R$ {Number(item.valor_unitario).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight="bold" color="#4E342E">{Number(item.quantidade)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="#2E7D32">R$ {Number(item.valor_total).toFixed(2)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>

          {order.observacao && (
            <Box sx={{ ...glassStyle, p: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#4E342E">Observações / Endereço:</Typography>
              <Typography variant="body2" color="#5D4037">{order.observacao}</Typography>
            </Box>
          )}
        </Grid>

        {/* Coluna da Direita: Resumo */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...glassStyle, p: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3, color: '#4E342E' }}>Resumo da Compra</Typography>
            
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="#5D4037">Data</Typography>
              <Typography fontWeight="bold" color="#4E342E">{new Date(order.data_pedido).toLocaleDateString()} {new Date(order.data_pedido).toLocaleTimeString().slice(0,5)}</Typography>
            </Box>
            
            <Divider sx={{ my: 2, borderColor: 'rgba(78, 52, 46, 0.1)' }} />

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {isDelivery ? <LocalShipping sx={{ color: '#5D4037' }} /> : <Storefront sx={{ color: '#5D4037' }} />}
              <Typography variant="body2" fontWeight="bold" color="#4E342E">
                {isDelivery ? "Entrega" : "Retirada"}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {order.forma_pagamento === 'Pix' ? <QrCode sx={{ color: '#5D4037' }} /> : <AttachMoney sx={{ color: '#5D4037' }} />}
              <Typography variant="body2" fontWeight="bold" color="#4E342E">
                Pagamento: {order.forma_pagamento}
              </Typography>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(78, 52, 46, 0.1)' }} />

            <Box display="flex" justifyContent="space-between" mb={3}>
              <Typography variant="h6" fontWeight="bold" color="#4E342E">Total</Typography>
              <Typography variant="h6" fontWeight="bold" color="#2E7D32">R$ {Number(order.valor_total).toFixed(2)}</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
    </Box>
  );
}