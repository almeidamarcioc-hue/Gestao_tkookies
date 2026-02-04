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

  const loadPedidos = () => {
    api.get("/pedidos").then(res => setPedidos(Array.isArray(res.data) ? res.data : []));
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  const getStatusColor = (status) => {
    if (status === 'Finalizado' || status === 'Pronto') return 'success.main';
    if (status === 'Cancelado') return 'error.main';
    if (status === 'Em Produção') return 'warning.main';
    if (status === 'Novo') return 'primary.main';
    return 'text.secondary';
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/pedidos/${id}/status`, { status: newStatus });
      loadPedidos();
    } catch (error) {
      alert("Erro ao atualizar status");
    }
  };

  const handlePrint = async (id) => {
    const isVercel = api.defaults.baseURL.includes('vercel.app');

    if (isVercel) {
      // Se está na Vercel, vai direto para a impressão do navegador
      console.log("Ambiente Vercel detectado. Usando impressão do navegador.");
      try {
        const res = await api.get(`/pedidos/${id}`);
        printOrder(res.data);
      } catch (fetchErr) {
        alert("Erro ao carregar dados do pedido para impressão.");
      }
    } else {
      // Se não está na Vercel (local), tenta a impressão direta
      try {
        await api.post(`/pedidos/${id}/imprimir`);
        alert("Enviado para impressora!");
      } catch (err) {
        const msg = err.response?.data?.error || err.message || "Erro na comunicação USB";
        alert(`Falha na impressão direta: ${msg}\n\nVerifique se a impressora está conectada e se os drivers estão instalados corretamente (Zadig para Windows).`);
        console.error("Erro na impressão direta:", err);
      }
    }
  };

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Pedidos</Typography>
        <Button variant="contained" startIcon={<Add />} component={Link} to="/pedidos/novo">Novo Pedido</Button>
      </Box>

      <Paper sx={{ width: '100%', overflowX: 'auto' }}>
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
                      sx={{ fontSize: '0.875rem', fontWeight: 500, color: getStatusColor(pedido.status) }}
                    >
                      <MenuItem value="Novo">Novo</MenuItem>
                      <MenuItem value="Em Produção">Em Produção</MenuItem>
                      <MenuItem value="Pronto">Pronto</MenuItem>
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