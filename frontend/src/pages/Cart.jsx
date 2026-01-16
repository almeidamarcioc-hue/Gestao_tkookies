import { useState, useEffect } from "react";
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, RadioGroup, FormControlLabel, Radio, Divider, IconButton, TextField } from "@mui/material";
import { Delete, ArrowBack } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Cart({ cart, updateQuantity, removeFromCart, clearCart, clientUser }) {
  const [deliveryType, setDeliveryType] = useState("retira"); // 'retira' ou 'entrega'
  const [freightValue, setFreightValue] = useState(0);
  const [observacao, setObservacao] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Busca o valor do frete configurado no sistema
    api.get("/pedidos/config/frete")
      .then((res) => setFreightValue(res.data.valor))
      .catch((err) => console.error("Erro ao buscar frete", err));
  }, []);

  const totalItems = cart.reduce((acc, item) => acc + (Number(item.preco_venda) * item.quantidade), 0);
  const finalFreight = deliveryType === "entrega" ? freightValue : 0;
  const totalOrder = totalItems + finalFreight;

  const handleCheckout = async () => {
    if (!clientUser) {
      alert("Por favor, faça login para finalizar o pedido.");
      return;
    }

    if (cart.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    const payload = {
      cliente_id: clientUser.id,
      data_pedido: new Date(),
      forma_pagamento: "A Combinar", // Pode ser melhorado futuramente
      observacao: observacao + (deliveryType === "entrega" ? " (Entrega)" : " (Retirada)"),
      frete: finalFreight,
      status: "Novo",
      itens: cart.map(item => ({
        produto_id: item.id,
        quantidade: item.quantidade,
        valor_unitario: item.preco_venda
      }))
    };

    try {
      await api.post("/pedidos", payload);
      alert("Pedido realizado com sucesso!");
      clearCart();
      navigate("/pedidos"); // Redireciona para meus pedidos
    } catch (error) {
      console.error(error);
      alert("Erro ao finalizar pedido: " + (error.response?.data?.error || error.message));
    }
  };

  if (cart.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>Seu carrinho está vazio 🍪</Typography>
        <Button variant="contained" component={Link} to="/">Voltar para o Menu</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ mb: 2 }}>Continuar Comprando</Button>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">Carrinho de Compras</Typography>

      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produto</TableCell>
              <TableCell align="center">Qtd</TableCell>
              <TableCell align="right">Preço Unit.</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.nome}</TableCell>
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <Button size="small" onClick={() => updateQuantity(item.id, item.quantidade - 1)}>-</Button>
                    {item.quantidade}
                    <Button size="small" onClick={() => updateQuantity(item.id, item.quantidade + 1)}>+</Button>
                  </Box>
                </TableCell>
                <TableCell align="right">R$ {Number(item.preco_venda).toFixed(2)}</TableCell>
                <TableCell align="right">R$ {(item.quantidade * item.preco_venda).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton color="error" onClick={() => removeFromCart(item.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Opções de Entrega</Typography>
        <RadioGroup row value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
          <FormControlLabel value="retira" control={<Radio />} label="Retirar no Local (Grátis)" />
          <FormControlLabel value="entrega" control={<Radio />} label={`Entrega (+ R$ ${Number(freightValue).toFixed(2)})`} />
        </RadioGroup>
        
        {deliveryType === "entrega" && clientUser && (
          <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
            <Typography variant="body2"><strong>Endereço de Entrega:</strong></Typography>
            <Typography variant="body2">{clientUser.endereco}, {clientUser.numero}</Typography>
            <Typography variant="body2">{clientUser.bairro} - {clientUser.cidade}</Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Resumo do Pedido</Typography>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography>Subtotal:</Typography>
          <Typography>R$ {totalItems.toFixed(2)}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography>Frete:</Typography>
          <Typography>R$ {finalFreight.toFixed(2)}</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box display="flex" justifyContent="space-between" mb={3}>
          <Typography variant="h5" fontWeight="bold">Total:</Typography>
          <Typography variant="h5" fontWeight="bold" color="primary">R$ {totalOrder.toFixed(2)}</Typography>
        </Box>

        <TextField
          label="Observações do Pedido"
          multiline
          rows={2}
          fullWidth
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Button 
          variant="contained" 
          size="large" 
          fullWidth 
          onClick={handleCheckout}
          disabled={cart.length === 0}
        >
          FINALIZAR PEDIDO
        </Button>
      </Paper>
    </Container>
  );
}