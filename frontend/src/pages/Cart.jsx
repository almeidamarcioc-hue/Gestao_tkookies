import { useState, useEffect } from "react";
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, RadioGroup, FormControlLabel, Radio, Divider, IconButton, TextField, Grid } from "@mui/material";
import { Delete, ArrowBack, RemoveShoppingCart, LocalShipping, AttachMoney, QrCode, Storefront, Add, Remove, ContentCopy } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { Pix } from 'qrcode-pix';
import QRCode from 'qrcode.react';

export default function Cart({ cart, updateQuantity, removeFromCart, clearCart, clientUser }) {
  const [deliveryType, setDeliveryType] = useState("retira"); // 'retira' ou 'entrega'
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [addressOption, setAddressOption] = useState("cadastrado");
  const [customAddress, setCustomAddress] = useState({ endereco: "", numero: "", bairro: "", cidade: "" });
  const [pixPayload, setPixPayload] = useState('');
  const [freightValue, setFreightValue] = useState(0);
  const [observacao, setObservacao] = useState("");
  const navigate = useNavigate();

  // Estilos "Organic Soft Tech" (Versão Light/Café)
  const glassStyle = {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 8px 32px 0 rgba(78, 52, 46, 0.08)",
    borderRadius: "24px",
    color: "#3E2723"
  };

  useEffect(() => {
    // Busca o valor do frete configurado no sistema
    api.get("/pedidos/config/frete")
      .then((res) => setFreightValue(res.data.valor))
      .catch((err) => console.error("Erro ao buscar frete", err));
  }, []);

  const getItemPrice = (item) => {
    if (clientUser?.is_revendedor) {
      return Number(item.preco_revenda);
    }
    else if (item.eh_destaque && item.desconto_destaque > 0) {
      return Number(item.preco_venda) * (1 - Number(item.desconto_destaque) / 100);
    }
    return Number(item.preco_venda);
  };

  const totalItems = cart.reduce((acc, item) => acc + (getItemPrice(item) * item.quantidade), 0);
  const finalFreight = deliveryType === "entrega" ? freightValue : 0;
  const totalOrder = totalItems + finalFreight;

  useEffect(() => {
    if (paymentMethod === 'Pix' && totalOrder > 0) {
      const pix = Pix({
        pixKey: '54209675000174', // Seu CNPJ
        merchant: 'TKOOKIES',
        city: 'TRES DE MAIO',
        amount: parseFloat(totalOrder.toFixed(2)),
      });
      setPixPayload(pix.payload());
    } else {
      setPixPayload('');
    }
  }, [paymentMethod, totalOrder]);

  const handleCopyPix = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      alert('Código PIX (copia e cola) copiado para a área de transferência!');
    }
  };

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

        <Container maxWidth="md" sx={{ mt: 8, textAlign: "center", position: 'relative', zIndex: 1 }}>
          <Box sx={{ ...glassStyle, p: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <RemoveShoppingCart sx={{ fontSize: 80, color: "#8D6E63", mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ color: "#4E342E", fontWeight: 900 }}>Seu carrinho está vazio</Typography>
            <Typography variant="body1" sx={{ color: "#5D4037", mb: 4 }}>Que tal adicionar alguns cookies deliciosos?</Typography>
            <Button variant="contained" size="large" component={Link} to="/" sx={{ borderRadius: 50, px: 4, bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }}>Voltar para o Menu</Button>
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

    <Container maxWidth="lg" sx={{ mt: 6, mb: 8, position: 'relative', zIndex: 1 }}>
      <Typography variant="h3" fontWeight="900" gutterBottom sx={{ mb: 4, color: '#4E342E', textAlign: 'center' }}>Meu Carrinho</Typography>

      <Grid container spacing={5}>
        {/* Coluna da Esquerda: Tabela de Itens */}
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
                  <TableCell align="center" sx={{ borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <img 
                          src={item.imagens?.find(img => img.eh_capa)?.imagem || item.imagens?.[0]?.imagem} 
                          alt={item.nome} 
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} 
                        />
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" color="#4E342E">{item.nome}</Typography>
                          {item.eh_destaque && item.desconto_destaque > 0 && (
                            <Typography variant="caption" color="error">Oferta Especial</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="#5D4037">R$ {getItemPrice(item).toFixed(2)}</Typography>
                      {!clientUser?.is_revendedor && item.eh_destaque && item.desconto_destaque > 0 && (
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#8D6E63' }}>
                          R$ {Number(item.preco_venda).toFixed(2)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" border="1px solid rgba(78, 52, 46, 0.2)" borderRadius={2} width="fit-content" mx="auto">
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantidade - 1)} sx={{ color: '#4E342E' }}><Remove fontSize="small" /></IconButton>
                        <Typography sx={{ px: 2, fontWeight: 'bold', color: '#4E342E' }}>{item.quantidade}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantidade + 1)} sx={{ color: '#4E342E' }}><Add fontSize="small" /></IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="#2E7D32">R$ {(item.quantidade * getItemPrice(item)).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => removeFromCart(item.id)} sx={{ color: '#C62828' }}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
             <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ textTransform: 'none', fontWeight: 'bold', color: '#4E342E', borderRadius: 50, bgcolor: 'rgba(255,255,255,0.5)' }}>Continuar Comprando</Button>
          </Box>

          <Box sx={{ ...glassStyle, p: 3 }}>
          <TextField
            label="Observações do Pedido"
            placeholder="Ex: Sem talheres, troco para 50..."
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            sx={{ 
                '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.5)' },
                '& .MuiInputLabel-root': { color: '#5D4037' }
            }}
          />
          </Box>
        </Grid>

        {/* Coluna da Direita: Resumo e Opções */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...glassStyle, p: 4 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3, color: '#4E342E' }}>Resumo do Pedido</Typography>
            
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography color="#5D4037">Subtotal</Typography>
              <Typography fontWeight="bold" color="#4E342E">R$ {totalItems.toFixed(2)}</Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: 'rgba(78, 52, 46, 0.1)' }} />

            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#4E342E">Entrega</Typography>
            <RadioGroup value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
               <FormControlLabel value="retira" control={<Radio size="small" sx={{ color: '#4E342E', '&.Mui-checked': { color: '#4E342E' } }} />} label={<Box display="flex" alignItems="center" gap={1}><Storefront fontSize="small" sx={{ color: '#5D4037' }}/><Typography variant="body2" color="#3E2723">Retirar (Grátis)</Typography></Box>} />
               <FormControlLabel value="entrega" control={<Radio size="small" sx={{ color: '#4E342E', '&.Mui-checked': { color: '#4E342E' } }} />} label={<Box display="flex" alignItems="center" gap={1}><LocalShipping fontSize="small" sx={{ color: '#5D4037' }}/><Typography variant="body2" color="#3E2723">Entrega (+ R$ {Number(freightValue).toFixed(2)})</Typography></Box>} />
            </RadioGroup>
            
            {deliveryType === "entrega" && (
              <Box mt={2} p={2} bgcolor="rgba(255,255,255,0.5)" border="1px solid rgba(78, 52, 46, 0.1)" borderRadius={2}>
                {clientUser && (
                  <RadioGroup value={addressOption} onChange={(e) => setAddressOption(e.target.value)}>
                    <FormControlLabel 
                      value="cadastrado" 
                      control={<Radio size="small" sx={{ color: '#4E342E', '&.Mui-checked': { color: '#4E342E' } }} />} 
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="bold" color="#4E342E">Usar endereço cadastrado</Typography>
                          <Typography variant="caption" color="#5D4037" display="block">
                            {clientUser.endereco}, {clientUser.numero} - {clientUser.bairro}
                          </Typography>
                        </Box>
                      } 
                    />
                    <FormControlLabel 
                      value="outro" 
                      control={<Radio size="small" sx={{ color: '#4E342E', '&.Mui-checked': { color: '#4E342E' } }} />} 
                      label={<Typography variant="body2" fontWeight="bold" color="#4E342E">Entregar em outro endereço</Typography>} 
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

            <Divider sx={{ my: 2, borderColor: 'rgba(78, 52, 46, 0.1)' }} />

            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#4E342E">Pagamento</Typography>
            <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
               <FormControlLabel value="Pix" control={<Radio size="small" sx={{ color: '#4E342E', '&.Mui-checked': { color: '#4E342E' } }} />} label={<Box display="flex" alignItems="center" gap={1}><QrCode fontSize="small" sx={{ color: '#5D4037' }}/><Typography variant="body2" color="#3E2723">Pix</Typography></Box>} />
               
               {paymentMethod === 'Pix' && pixPayload && (
                <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.8)', borderRadius: 2, textAlign: 'center', border: '1px solid rgba(78, 52, 46, 0.1)' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Pague com Pix para confirmar</Typography>
                  <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, display: 'inline-block' }}>
                    <QRCode value={pixPayload} size={180} />
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopy />}
                    onClick={handleCopyPix}
                    fullWidth
                    sx={{ mt: 2, borderRadius: 50, color: '#4E342E', borderColor: '#4E342E' }}
                  >
                    Copiar Código
                  </Button>
                </Box>
               )}

               <FormControlLabel value="Dinheiro" control={<Radio size="small" sx={{ color: '#4E342E', '&.Mui-checked': { color: '#4E342E' } }} />} label={<Box display="flex" alignItems="center" gap={1}><AttachMoney fontSize="small" sx={{ color: '#5D4037' }}/><Typography variant="body2" color="#3E2723">Dinheiro</Typography></Box>} />
            </RadioGroup>

            <Divider sx={{ my: 3, borderColor: 'rgba(78, 52, 46, 0.1)' }} />

            <Box display="flex" justifyContent="space-between" mb={3}>
              <Typography variant="h6" fontWeight="bold" color="#4E342E">Total</Typography>
              <Typography variant="h6" fontWeight="bold" color="#2E7D32">R$ {totalOrder.toFixed(2)}</Typography>
            </Box>

            <Button 
              variant="contained" 
              fullWidth 
              size="large" 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 50, boxShadow: 'none', bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }}
            >
              FINALIZAR COMPRA
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
    </Box>
  );
}