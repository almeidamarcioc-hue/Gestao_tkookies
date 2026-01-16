import { useState, useEffect } from "react";
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, RadioGroup, FormControlLabel, Radio, Divider, IconButton, TextField, Grid } from "@mui/material";
import { Delete, ArrowBack, RemoveShoppingCart, LocalShipping, AttachMoney, QrCode, Storefront, Add, Remove } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Cart({ cart, updateQuantity, removeFromCart, clearCart, clientUser }) {
  const [deliveryType, setDeliveryType] = useState("retira"); // 'retira' ou 'entrega'
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [addressOption, setAddressOption] = useState("cadastrado");
  const [customAddress, setCustomAddress] = useState({ endereco: "", numero: "", bairro: "", cidade: "" });
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

    let obsFinal = observacao;
    if (deliveryType === "entrega") {
      if (addressOption === "outro") {
        if (!customAddress.endereco || !customAddress.numero || !customAddress.bairro) {
          alert("Por favor, preencha o endereço de entrega completo.");
          return;
        }
        obsFinal += ` | Entrega: ${customAddress.endereco}, ${customAddress.numero}, ${customAddress.bairro} - ${customAddress.cidade || ""}`;
      } else {
        obsFinal += ` | Entrega: ${clientUser.endereco}, ${clientUser.numero}, ${clientUser.bairro}`;
      }
    } else {
      obsFinal += " (Retirada)";
    }

    const payload = {
      cliente_id: clientUser.id,
      data_pedido: new Date(),
      forma_pagamento: paymentMethod,
      observacao: obsFinal,
      frete: finalFreight,
      status: "Novo",
      itens: cart.map(item => ({
        produto_id: item.id,
        quantidade: item.quantidade,
        valor_unitario: getItemPrice(item)
      }))
    };

    try {
      const res = await api.post("/pedidos", payload);
      clearCart();
      navigate("/pedido-confirmado", { state: { orderId: res.data.id } });
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
    <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
      <Typography variant="h4" fontWeight="900" gutterBottom sx={{ mb: 4 }}>Meu Carrinho</Typography>

      <Grid container spacing={5}>
        {/* Coluna da Esquerda: Tabela de Itens */}
        <Grid item xs={12} md={8}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Produto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Preço</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Qtd</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #f0f0f0' }}>Total</TableCell>
                  <TableCell align="center"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <img 
                          src={item.imagens?.find(img => img.eh_capa)?.imagem || item.imagens?.[0]?.imagem} 
                          alt={item.nome} 
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} 
                        />
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{item.nome}</Typography>
                          {item.eh_destaque && item.desconto_destaque > 0 && (
                            <Typography variant="caption" color="error">Oferta Especial</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">R$ {getItemPrice(item).toFixed(2)}</Typography>
                      {item.eh_destaque && item.desconto_destaque > 0 && (
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                          R$ {Number(item.preco_venda).toFixed(2)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" border="1px solid #ddd" borderRadius={1} width="fit-content" mx="auto">
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantidade - 1)}><Remove fontSize="small" /></IconButton>
                        <Typography sx={{ px: 2, fontWeight: 'bold' }}>{item.quantidade}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantidade + 1)}><Add fontSize="small" /></IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold">R$ {(item.quantidade * getItemPrice(item)).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => removeFromCart(item.id)} color="default"><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
             <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ textTransform: 'none', fontWeight: 'bold', color: 'text.primary' }}>Continuar Comprando</Button>
          </Box>

          <TextField
            label="Observações do Pedido"
            placeholder="Ex: Sem talheres, troco para 50..."
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </Grid>

        {/* Coluna da Direita: Resumo e Opções */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 4, bgcolor: '#F9F9F9', borderRadius: 2 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>Resumo do Pedido</Typography>
            
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography fontWeight="bold">R$ {totalItems.toFixed(2)}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Entrega</Typography>
            <RadioGroup value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
               <FormControlLabel value="retira" control={<Radio size="small" />} label={<Box display="flex" alignItems="center" gap={1}><Storefront fontSize="small" color="action"/><Typography variant="body2">Retirar (Grátis)</Typography></Box>} />
               <FormControlLabel value="entrega" control={<Radio size="small" />} label={<Box display="flex" alignItems="center" gap={1}><LocalShipping fontSize="small" color="action"/><Typography variant="body2">Entrega (+ R$ {Number(freightValue).toFixed(2)})</Typography></Box>} />
            </RadioGroup>
            
            {deliveryType === "entrega" && (
              <Box mt={2} p={2} bgcolor="#fff" border="1px solid #eee" borderRadius={2}>
                {clientUser && (
                  <RadioGroup value={addressOption} onChange={(e) => setAddressOption(e.target.value)}>
                    <FormControlLabel 
                      value="cadastrado" 
                      control={<Radio size="small" />} 
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="bold">Usar endereço cadastrado</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {clientUser.endereco}, {clientUser.numero} - {clientUser.bairro}
                          </Typography>
                        </Box>
                      } 
                    />
                    <FormControlLabel 
                      value="outro" 
                      control={<Radio size="small" />} 
                      label={<Typography variant="body2" fontWeight="bold">Entregar em outro endereço</Typography>} 
                    />
                  </RadioGroup>
                )}

                {(addressOption === "outro" || !clientUser) && (
                  <Box mt={2} display="flex" flexDirection="column" gap={2}>
                    <TextField label="Endereço" size="small" fullWidth value={customAddress.endereco} onChange={(e) => setCustomAddress({...customAddress, endereco: e.target.value})} />
                    <Box display="flex" gap={2}>
                      <TextField label="Número" size="small" value={customAddress.numero} onChange={(e) => setCustomAddress({...customAddress, numero: e.target.value})} />
                      <TextField label="Bairro" size="small" fullWidth value={customAddress.bairro} onChange={(e) => setCustomAddress({...customAddress, bairro: e.target.value})} />
                    </Box>
                    <TextField label="Cidade" size="small" fullWidth value={customAddress.cidade} onChange={(e) => setCustomAddress({...customAddress, cidade: e.target.value})} />
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Pagamento</Typography>
            <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
               <FormControlLabel value="Pix" control={<Radio size="small" />} label={<Box display="flex" alignItems="center" gap={1}><QrCode fontSize="small" color="action"/><Typography variant="body2">Pix</Typography></Box>} />
               <FormControlLabel value="Dinheiro" control={<Radio size="small" />} label={<Box display="flex" alignItems="center" gap={1}><AttachMoney fontSize="small" color="action"/><Typography variant="body2">Dinheiro</Typography></Box>} />
            </RadioGroup>

            <Divider sx={{ my: 3 }} />

            <Box display="flex" justifyContent="space-between" mb={3}>
              <Typography variant="h6" fontWeight="bold">Total</Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">R$ {totalOrder.toFixed(2)}</Typography>
            </Box>

            <Button 
              variant="contained" 
              fullWidth 
              size="large" 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 50, boxShadow: 'none' }}
            >
              FINALIZAR COMPRA
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}