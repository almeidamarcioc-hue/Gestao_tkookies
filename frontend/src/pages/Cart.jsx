import { useState, useEffect } from "react";
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, RadioGroup, FormControlLabel, Radio, Divider, IconButton, TextField, Grid } from "@mui/material";
import { Delete, ArrowBack, RemoveShoppingCart, LocalShipping, AttachMoney, CreditCard, QrCode, Storefront } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Cart({ cart, updateQuantity, removeFromCart, clearCart, clientUser }) {
  const [deliveryType, setDeliveryType] = useState("retira"); // 'retira' ou 'entrega'
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [freightValue, setFreightValue] = useState(0);
  const [observacao, setObservacao] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Busca o valor do frete configurado no sistema
    api.get("/pedidos/config/frete")
      .then((res) => setFreightValue(res.data.valor))
      .catch((err) => console.error("Erro ao buscar frete", err));
  }, []);

  const getItemPrice = (item) => {
    if (item.eh_destaque && item.desconto_destaque > 0) {
      return Number(item.preco_venda) * (1 - Number(item.desconto_destaque) / 100);
    }
    return Number(item.preco_venda);
  };

  const totalItems = cart.reduce((acc, item) => acc + (getItemPrice(item) * item.quantidade), 0);
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
      forma_pagamento: paymentMethod,
      observacao: observacao + (deliveryType === "entrega" ? " (Entrega)" : " (Retirada)"),
      frete: finalFreight,
      status: "Novo",
      itens: cart.map(item => ({
        produto_id: item.id,
        quantidade: item.quantidade,
        valor_unitario: getItemPrice(item)
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
      <Container maxWidth="md" sx={{ mt: 8, textAlign: "center" }}>
        <RemoveShoppingCart sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary" fontWeight="bold">Seu carrinho está vazio</Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>Que tal adicionar alguns cookies deliciosos?</Typography>
        <Button variant="contained" size="large" component={Link} to="/" sx={{ borderRadius: 50, px: 4 }}>Voltar para o Menu</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <IconButton component={Link} to="/" color="primary"><ArrowBack /></IconButton>
        <Typography variant="h4" fontWeight="900" color="primary">Meu Carrinho</Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Coluna da Esquerda: Itens */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e0e0e0', overflow: 'hidden', mb: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Produto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Qtd</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell align="center"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold" variant="body1">{item.nome}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unit: R$ {getItemPrice(item).toFixed(2)}
                        {item.eh_destaque && item.desconto_destaque > 0 && (
                          <Typography component="span" variant="caption" sx={{ textDecoration: 'line-through', ml: 1 }}>
                            R$ {Number(item.preco_venda).toFixed(2)}
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" sx={{ border: '1px solid #ddd', borderRadius: 50, width: 'fit-content', mx: 'auto' }}>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantidade - 1)} color="primary">-</IconButton>
                        <Typography sx={{ mx: 1, fontWeight: 'bold' }}>{item.quantidade}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantidade + 1)} color="primary">+</IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="primary">
                        R$ {(item.quantidade * getItemPrice(item)).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton color="error" onClick={() => removeFromCart(item.id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <TextField
            label="Observações do Pedido (Ex: Sem talheres, troco para 50...)"
            multiline
            rows={3}
            fullWidth
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            sx={{ bgcolor: 'white' }}
          />
        </Grid>

        {/* Coluna da Direita: Resumo e Opções */}
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" gap={3}>
            
            {/* Entrega */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e0e0e0' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                <LocalShipping color="primary"/> Entrega
              </Typography>
              <RadioGroup value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                <FormControlLabel value="retira" control={<Radio />} label={<Box display="flex" alignItems="center" gap={1}><Storefront fontSize="small" color="action"/> Retirar (Grátis)</Box>} />
                <FormControlLabel value="entrega" control={<Radio />} label={<Box display="flex" alignItems="center" gap={1}><LocalShipping fontSize="small" color="action"/> Entrega (+ R$ {Number(freightValue).toFixed(2)})</Box>} />
              </RadioGroup>
              
              {deliveryType === "entrega" && clientUser && (
                <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">ENDEREÇO:</Typography>
                  <Typography variant="body2">{clientUser.endereco}, {clientUser.numero}</Typography>
                  <Typography variant="body2">{clientUser.bairro} - {clientUser.cidade}</Typography>
                </Box>
              )}
            </Paper>

            {/* Pagamento */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e0e0e0' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                <AttachMoney color="primary"/> Pagamento
              </Typography>
              <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <FormControlLabel value="Pix" control={<Radio />} label={<Box display="flex" alignItems="center" gap={1}><QrCode fontSize="small" color="action"/> Pix</Box>} />
                <FormControlLabel value="Cartão" control={<Radio />} label={<Box display="flex" alignItems="center" gap={1}><CreditCard fontSize="small" color="action"/> Cartão</Box>} />
                <FormControlLabel value="Dinheiro" control={<Radio />} label={<Box display="flex" alignItems="center" gap={1}><AttachMoney fontSize="small" color="action"/> Dinheiro</Box>} />
              </RadioGroup>
            </Paper>

            {/* Resumo */}
            <Paper elevation={4} sx={{ p: 3, borderRadius: 4, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Resumo</Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Subtotal</Typography>
                <Typography variant="body2">R$ {totalItems.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Frete</Typography>
                <Typography variant="body2">R$ {finalFreight.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
              <Box display="flex" justifyContent="space-between" mb={3}>
                <Typography variant="h5" fontWeight="bold">Total</Typography>
                <Typography variant="h5" fontWeight="bold">R$ {totalOrder.toFixed(2)}</Typography>
              </Box>

              <Button 
                variant="contained" 
                color="secondary" 
                fullWidth 
                size="large" 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                sx={{ borderRadius: 50, fontWeight: 'bold', py: 1.5, boxShadow: 'none' }}
              >
                FINALIZAR PEDIDO
              </Button>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}