import { useState, useEffect } from "react";
import { Container, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
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

  if (!clientUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6">Faça login para visualizar seus pedidos.</Typography>
        <Button variant="contained" component={Link} to="/" sx={{ mt: 2 }}>Ir para Home</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Meus Pedidos</Typography>
      
      <Paper sx={{ width: '100%', overflowX: 'auto', mb: 4, p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Pedido #</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidos.length > 0 ? (
              pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>#{pedido.id}</TableCell>
                  <TableCell>{new Date(pedido.data_pedido).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={pedido.status} color={getStatusColor(pedido.status)} size="small" />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>R$ {Number(pedido.valor_total).toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined" component={Link} to={`/pedidos/${pedido.id}`}>
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">Você ainda não fez nenhum pedido.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      
      <Box textAlign="center">
        <Button variant="contained" component={Link} to="/">Voltar para o Início</Button>
      </Box>
    </Container>
  );
}