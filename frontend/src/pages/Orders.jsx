import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { 
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Container, Chip, IconButton, MenuItem, Select, FormControl 
} from "@mui/material";
import { Edit, Add, Print } from "@mui/icons-material";
import { printOrder } from "../utils/printOrder";

export default function Orders() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    api.get("/pedidos").then(res => setPedidos(Array.isArray(res.data) ? res.data : []));
  }, []);

  const getStatusColor = (status) => {
    if (status === 'Finalizado') return 'success';
    if (status === 'Cancelado') return 'error';
    return 'primary';
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/pedidos/${id}/status`, { status: newStatus });
      setPedidos(pedidos.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (error) {
      alert("Erro ao atualizar status");
    }
  };

  const handlePrint = async (id) => {
    try {
      await api.post(`/pedidos/${id}/imprimir`);
      alert("Enviado para impressora!");
    } catch (err) {
      console.log("Impressão direta falhou, usando navegador:", err);
      // Fallback: Buscar dados e imprimir via navegador
      try {
        const res = await api.get(`/pedidos/${id}`);
        printOrder(res.data);
      } catch (fetchErr) {
        alert("Erro ao carregar dados para impressão");
      }
    }
  };

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Pedidos</Typography>
        <Button variant="contained" startIcon={<Add />} component={Link} to="/pedidos/novo">Novo Pedido</Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Pagamento</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidos.map((pedido) => (
              <TableRow key={pedido.id}>
                <TableCell>{pedido.id}</TableCell>
                <TableCell>{new Date(pedido.data_pedido).toLocaleDateString()}</TableCell>
                <TableCell>{pedido.cliente_nome}</TableCell>
                <TableCell>
                  <FormControl size="small" variant="standard" sx={{ minWidth: 100 }}>
                    <Select
                      value={pedido.status}
                      onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                      disableUnderline
                      sx={{ fontSize: '0.875rem', fontWeight: 500, color: getStatusColor(pedido.status) === 'success' ? 'green' : getStatusColor(pedido.status) === 'error' ? 'red' : 'inherit' }}
                    >
                      <MenuItem value="Novo">Novo</MenuItem>
                      <MenuItem value="Finalizado">Finalizado</MenuItem>
                      <MenuItem value="Cancelado">Cancelado</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>{pedido.forma_pagamento}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>R$ {Number(pedido.valor_total).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton color="secondary" onClick={() => handlePrint(pedido.id)}>
                    <Print />
                  </IconButton>
                  <IconButton color="primary" component={Link} to={`/pedidos/${pedido.id}`}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}