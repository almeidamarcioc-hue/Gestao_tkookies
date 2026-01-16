import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Divider, Button, Chip } from "@mui/material";
import { ArrowBack, LocalShipping, Storefront, AttachMoney, QrCode } from "@mui/icons-material";
import api from "../services/api";

export default function ClientOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/pedidos/${id}`)
      .then(res => setOrder(res.data))
      .catch(err => console.error("Erro ao carregar pedido", err));
  }, [id]);

  if (!order) return <Container sx={{ mt: 4 }}><Typography>Carregando detalhes do pedido...</Typography></Container>;

  const isDelivery = Number(order.frete) > 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
      <Box mb={4} display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Button startIcon={<ArrowBack />} component={Link} to="/meus-pedidos" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          Voltar
        </Button>
        <Typography variant="h4" fontWeight="900" color="primary">
          Pedido #{order.id}
        </Typography>
        <Chip 
          label={order.status} 
          color={order.status === 'Finalizado' ? 'success' : order.status === 'Cancelado' ? 'error' : 'primary'} 
          sx={{ fontWeight: 'bold' }} 
        />
      </Box>

      <Grid container spacing={5}>
        {/* Coluna da Esquerda: Itens (Visual idêntico ao Carrinho) */}
        <Grid item xs={12} md={8}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Produto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Preço</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Qtd</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        {item.imagem && (
                          <img 
                            src={item.imagem} 
                            alt={item.produto_nome} 
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} 
                          />
                        )}
                        <Typography variant="subtitle1" fontWeight="bold">{item.produto_nome}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">R$ {Number(item.valor_unitario).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight="bold">{Number(item.quantidade)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold">R$ {Number(item.valor_total).toFixed(2)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {order.observacao && (
            <Paper elevation={0} sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 2, border: '1px solid #eee' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Observações / Endereço:</Typography>
              <Typography variant="body2" color="text.secondary">{order.observacao}</Typography>
            </Paper>
          )}
        </Grid>

        {/* Coluna da Direita: Resumo */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 4, bgcolor: '#F9F9F9', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>Resumo da Compra</Typography>
            
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Data</Typography>
              <Typography fontWeight="bold">{new Date(order.data_pedido).toLocaleDateString()} {new Date(order.data_pedido).toLocaleTimeString().slice(0,5)}</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {isDelivery ? <LocalShipping color="action" /> : <Storefront color="action" />}
              <Typography variant="body2" fontWeight="bold">
                {isDelivery ? "Entrega" : "Retirada"}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {order.forma_pagamento === 'Pix' ? <QrCode color="action" /> : <AttachMoney color="action" />}
              <Typography variant="body2" fontWeight="bold">
                Pagamento: {order.forma_pagamento}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box display="flex" justifyContent="space-between" mb={3}>
              <Typography variant="h6" fontWeight="bold">Total</Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">R$ {Number(order.valor_total).toFixed(2)}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}