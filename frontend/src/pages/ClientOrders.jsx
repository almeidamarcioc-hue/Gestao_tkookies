import { useState, useEffect } from "react";
import { Container, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";

export default function ClientOrders({ clientUser }) {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    if (clientUser) {
      api.get(`/clientes/${clientUser.id}/pedidos`)
        .then(res => setPedidos(res.data))
        .catch(err => console.error("Erro ao buscar pedidos", err));
    }
  }, [clientUser]);

  const getStatusColor = (status) => {
    if (status === 'Finalizado') return 'success';
    if (status === 'Cancelado') return 'error';
    return 'primary';
  };

  // Estilos "Organic Soft Tech" (Versão Light/Café)
  const glassStyle = {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 8px 32px 0 rgba(78, 52, 46, 0.08)",
    borderRadius: "24px",
    color: "#3E2723"
  };

  if (!clientUser) {
    return (
      <Box sx={{ bgcolor: '#D7CCC8', minHeight: '100vh', color: '#3E2723', overflowX: 'hidden', position: 'relative' }}>
        <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Box sx={{ ...glassStyle, p: 8 }}>
            <Typography variant="h6" sx={{ color: "#4E342E", mb: 2 }}>Faça login para visualizar seus pedidos.</Typography>
            <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 50, px: 4, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }}>Ir para Home</Button>
          </Box>
        </Container>
      </Box>
    );
  }

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

    <Container maxWidth="md" sx={{ mt: 4, mb: 8, position: 'relative', zIndex: 1 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4, color: '#4E342E', textAlign: 'center' }}>Meus Pedidos</Typography>
      
      <Box sx={{ ...glassStyle, p: 0, overflow: 'hidden', mb: 4 }}>
      <Paper sx={{ width: '100%', overflowX: 'auto', bgcolor: 'transparent', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Pedido #</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Data</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Total</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#5D4037', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidos.length > 0 ? (
              pedidos.map((pedido) => (
                <TableRow key={pedido.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ color: '#4E342E', fontWeight: 'bold' }}>#{pedido.id}</TableCell>
                  <TableCell sx={{ color: '#5D4037' }}>{new Date(pedido.data_pedido).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={pedido.status} color={getStatusColor(pedido.status)} size="small" sx={{ fontWeight: 'bold' }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2E7D32' }}>R$ {Number(pedido.valor_total).toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined" component={Link} to={`/meus-pedidos/${pedido.id}`} sx={{ borderRadius: 20, color: '#4E342E', borderColor: '#4E342E', '&:hover': { borderColor: '#3E2723', bgcolor: 'rgba(78, 52, 46, 0.05)' } }}>
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#5D4037' }}>Você ainda não fez nenhum pedido.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      </Box>
      
      <Box textAlign="center">
        <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 50, px: 4, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }}>Voltar para o Início</Button>
      </Box>
    </Container>
    </Box>
  );
}