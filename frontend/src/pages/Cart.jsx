import { useState, useEffect } from "react";
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, RadioGroup, FormControlLabel, Radio, Divider, IconButton, TextField, Grid, Alert } from "@mui/material";
import { Delete, ArrowBack, RemoveShoppingCart, LocalShipping, AttachMoney, QrCode, Storefront, Add, Remove, ContentCopy, CardGiftcard } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { QrCodePix } from "qrcode-pix";
import { QRCodeSVG } from "qrcode.react";

export default function Cart({ cart, updateQuantity, removeFromCart, clearCart, clientUser, addToCart }) {
  const [deliveryType, setDeliveryType] = useState("retira"); // 'retira' ou 'entrega'
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [addressOption, setAddressOption] = useState("cadastrado");
  const [customAddress, setCustomAddress] = useState({ endereco: "", numero: "", bairro: "", cidade: "" });
  const [pixPayload, setPixPayload] = useState('');
  const [freightValue, setFreightValue] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [config, setConfig] = useState({ open_time: "", close_time: "", open_days: "", pix_key: "", pix_name: "TKOOKIES", pix_city: "TRES DE MAIO" });
  const navigate = useNavigate();

  // Estilos "Cozy Bakery"
  const cardStyle = {
    background: "#FFFFFF",
    borderRadius: "4px",
    boxShadow: "0 2px 20px rgba(78, 52, 46, 0.08)",
    border: "1px solid rgba(78, 52, 46, 0.05)",
    color: "#3E2723"
  };

  // Lógica para sugestões de agregados (Embalagens/Extras)
  // Coleta todos os agregados dos produtos no carrinho que ainda não foram adicionados
  const suggestions = cart.reduce((acc, item) => {
    if (item.agregados && Array.isArray(item.agregados)) {
        item.agregados.forEach(agg => {
            // Evita duplicatas na lista de sugestões e verifica se já não está no carrinho
            if (!acc.some(a => a.id === agg.id) && !cart.some(c => c.id === `extra-${agg.id}`)) {
                acc.push(agg);
            }
        });
    }
    return acc;
  }, []);

  const handleAddAggregate = (agg) => {
    const itemToAdd = {
        id: `extra-${agg.id}`,
        original_id: agg.id,
        nome: agg.nome,
        preco_venda: Number(agg.preco || 0),
        quantidade: 1,
        eh_agregado: true,
        imagens: agg.imagem ? [{ imagem: agg.imagem, eh_capa: true }] : []
    };
    addToCart(itemToAdd, 1);
  };

  const checkIfOpen = (cfg) => {
    const now = new Date();
    const day = now.getDay();
    const current = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    if (cfg.opening_hours) {
      try {
        const schedule = JSON.parse(cfg.opening_hours);
        const today = schedule.find(s => s.day === day);
        if (!today || !today.open) return false;
        return current >= today.open_time && current <= today.close_time;
      } catch (e) {
        console.error("Erro no parsing do horário", e);
      }
    }

    if (cfg.open_days) {
      const allowedDays = cfg.open_days.split(',').map(Number);
      if (!allowedDays.includes(day)) return false;
    }

    if (!cfg.open_time || !cfg.close_time) return true;
    return current >= cfg.open_time && current <= cfg.close_time;
  };

  useEffect(() => {
    // Busca configurações para validar horário (usa cache de sessão se disponível)
    const cachedCfg = sessionStorage.getItem('_cfg');
    if (cachedCfg) {
      const parsed = JSON.parse(cachedCfg);
      setConfig(parsed);
      setIsStoreOpen(checkIfOpen(parsed));
    } else {
      api.get("/configuracoes").then(res => {
        sessionStorage.setItem('_cfg', JSON.stringify(res.data));
        setConfig(res.data);
        setIsStoreOpen(checkIfOpen(res.data));
      });
    }

    // Busca o valor do frete configurado no sistema
    api.get("/pedidos/config/frete")
      .then((res) => setFreightValue(Number(res.data.valor) || 0))
      .catch((err) => console.error("Erro ao buscar frete", err));
  }, []);

  const getItemPrice = (item) => {
    // Agregados sempre usam o preço de venda definido no vínculo (extras)
    if (item.eh_agregado) {
      return Number(item.preco_venda);
    }
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
      const pixKey = config.pix_key || '54209675000174';
      const pixName = config.pix_name || 'TKOOKIES';
      const pixCity = config.pix_city || 'TRES DE MAIO';
      const pix = QrCodePix({
        version: '01',
        key: pixKey,
        name: pixName,
        city: pixCity,
        value: parseFloat(totalOrder.toFixed(2)),
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

    if (!checkIfOpen(config)) {
      setIsStoreOpen(false);
      alert("Infelizmente acabamos de fechar. Não é possível finalizar pedidos agora.");
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
      origem: 'carrinho',
      itens: cart.map(item => ({
        produto_id: item.original_id || item.id,
        tipo: (item.itens || item.ingredientes) ? 'combo' : 'produto',
        quantidade: item.quantidade,
        valor_unitario: getItemPrice(item),
      }))
    };

    try {
      const res = await api.post("/pedidos", payload);
      clearCart({ skipLiberar: true }); // estoque já foi deduzido pela reserva, não devolver
      navigate("/pedido-confirmado", { state: { orderId: res.data.id } });
    } catch (error) {
      console.error(error);
      alert("Erro ao finalizar pedido: " + (error.response?.data?.error || error.message));
    }
  };

  if (cart.length === 0) {
    return (
      <Box sx={{ bgcolor: '#FFFAF5', minHeight: '100vh', color: '#2C1810' }}>
        <Container maxWidth="md" sx={{ mt: 4, textAlign: "center" }}>
          <Box sx={{ ...cardStyle, p: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4, boxShadow: '0 4px 24px rgba(44,24,16,0.10)' }}>
            <RemoveShoppingCart sx={{ fontSize: 80, color: "#D4580A", mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ color: "#2C1810", fontWeight: 900 }}>Seu carrinho está vazio</Typography>
            <Typography variant="body1" sx={{ color: "#795548", mb: 4 }}>Que tal adicionar alguns cookies deliciosos?</Typography>
            <Button variant="contained" size="large" component={Link} to="/" sx={{ borderRadius: 50, px: 4 }}>Voltar para o Menu</Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#FFFAF5', minHeight: '100vh', color: '#2C1810', pb: { xs: 14, md: 0 } }}>
    <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
      <Typography variant="h3" fontWeight="900" gutterBottom sx={{ mb: 4, color: '#2C1810', textAlign: 'center' }}>Meu Carrinho</Typography>

      <Grid container spacing={5}>
        {/* Coluna da Esquerda: Tabela de Itens */}
        <Grid item xs={12} md={8}>
          <Box sx={{ ...cardStyle, p: 0, overflow: 'hidden', mb: 4 }}>
          <TableContainer component={Box} sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#FFF8F0' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#795548', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Produto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#795548', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Preço</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#795548', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Qtd</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#795548', borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}>Total</TableCell>
                  <TableCell align="center" sx={{ borderBottom: '1px solid rgba(78, 52, 46, 0.1)' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((item) => {
                  const price = getItemPrice(item);
                  const stock = Number(item.estoque) || 0;
                  return (
                    <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          {item.imagens && item.imagens.length > 0 ? (
                            <img 
                              src={item.imagens.find(img => img.eh_capa)?.imagem || item.imagens[0]?.imagem} 
                              alt={item.nome} 
                              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} 
                            />
                          ) : (
                            <Box sx={{ width: 80, height: 80, borderRadius: 2, bgcolor: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FFB74D' }}>
                                <CardGiftcard sx={{ color: '#E65100', fontSize: 40 }} />
                            </Box>
                          )}
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold" color="#4E342E">{item.nome}</Typography>
                            {item.eh_destaque && item.desconto_destaque > 0 && (
                              <Typography variant="caption" color="error">Oferta Especial</Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="#5D4037">R$ {price.toFixed(2)}</Typography>
                        {!clientUser?.is_revendedor && item.eh_destaque && item.desconto_destaque > 0 && (
                          <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#8D6E63' }}>
                            R$ {Number(item.preco_venda).toFixed(2)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" border="1px solid rgba(78, 52, 46, 0.2)" borderRadius={2} width="fit-content" mx="auto" sx={{ opacity: stock <= 0 ? 0.5 : 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => updateQuantity(item.id, item.quantidade - 1)} 
                            sx={{ color: '#4E342E' }} 
                            disabled={stock <= 0 || item.quantidade <= 1}
                          ><Remove fontSize="small" /></IconButton>
                          <Typography sx={{ px: 2, fontWeight: 'bold', color: '#4E342E' }}>{item.quantidade}</Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => updateQuantity(item.id, item.quantidade + 1)} 
                            sx={{ color: '#4E342E' }} 
                            disabled={stock <= 0 || item.quantidade >= stock}
                          ><Add fontSize="small" /></IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color="#2E7D32">R$ {(item.quantidade * price).toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => removeFromCart(item.id)} sx={{ color: '#C62828' }}><Delete /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
              })}
                {cart.some(item => (Number(item.estoque) || 0) <= 0 || item.quantidade > (Number(item.estoque) || 0)) && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Alert severity="warning">Alguns produtos no seu carrinho estão com estoque baixo ou esgotado. Ajuste as quantidades para prosseguir.</Alert>
                    </TableCell>
                  </TableRow>
              )}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
             <Button startIcon={<ArrowBack />} component={Link} to="/" sx={{ textTransform: 'none', fontWeight: 'bold', color: '#4E342E', borderRadius: 50, bgcolor: 'rgba(255,255,255,0.5)' }}>Continuar Comprando</Button>
          </Box>

          <Box sx={{ ...cardStyle, p: 3 }}>
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

          {/* Seção de Sugestões / Propaganda de Agregados */}
          {suggestions.length > 0 && (
            <Box sx={{ mt: 4, mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#4E342E', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CardGiftcard color="primary" /> Turbine seu presente
                </Typography>
                <Grid container spacing={2}>
                    {suggestions.map((agg) => (
                        <Grid item xs={12} sm={6} key={agg.id}>
                            <Paper sx={{ 
                                p: 2, 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                bgcolor: '#FFF8E1', // Fundo amarelado para destaque
                                borderRadius: 3,
                                border: '1px dashed #FFB74D',
                                gap: 2
                            }}>
                                {agg.imagem ? (
                                    <Box 
                                        component="img" 
                                        src={agg.imagem} 
                                        sx={{ width: 50, height: 50, borderRadius: 2, objectFit: 'cover' }} 
                                    />
                                ) : (
                                <Box sx={{ 
                                    width: 50, 
                                    height: 50, 
                                    borderRadius: 2, 
                                    bgcolor: 'rgba(255, 255, 255, 0.5)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    border: '1px solid #FFB74D',
                                    flexShrink: 0
                                }}>
                                    <CardGiftcard sx={{ color: '#E65100' }} />
                                </Box>
                                )}
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="#E65100">{agg.nome}</Typography>
                                    <Typography variant="caption" color="text.secondary">Adicione por R$ {Number(agg.preco || 0).toFixed(2)}</Typography>
                                </Box>
                                <Button 
                                    size="small" 
                                    variant="contained" 
                                    color="warning" 
                                    onClick={() => handleAddAggregate(agg)}
                                    sx={{ borderRadius: 20, textTransform: 'none', boxShadow: 'none' }}
                                >
                                    Adicionar
                                </Button>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>
          )}
        </Grid>

        {/* Coluna da Direita: Resumo e Opções */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...cardStyle, p: 4 }}>
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
                    <QRCodeSVG value={pixPayload} size={180} />
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
              disabled={cart.length === 0 || !isStoreOpen || cart.some(item => (Number(item.estoque) || 0) <= 0 || item.quantidade > (Number(item.estoque) || 0))}
              sx={{
                py: 1.5,
                fontWeight: 'bold',
                borderRadius: 50,
                boxShadow: 'none',
                display: { xs: 'none', md: 'block' }
              }}
            >
              FINALIZAR COMPRA
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>

    {/* Sticky Footer for Mobile */}
    <Paper
      elevation={10}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        px: 3,
        py: 2,
        pb: 'max(16px, env(safe-area-inset-bottom))',
        bgcolor: '#2C1810',
        borderTop: '1px solid rgba(212,88,10,0.2)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        display: { xs: 'flex', md: 'none' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2
      }}
    >
      <Box>
        <Typography variant="caption" color="rgba(255,255,255,0.7)" fontWeight="bold" display="block">TOTAL</Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#C4922A' }}>R$ {totalOrder.toFixed(2)}</Typography>
      </Box>
      <Button
        variant="contained"
        onClick={handleCheckout}
        disabled={cart.length === 0 || !isStoreOpen || cart.some(item => (Number(item.estoque) || 0) <= 0 || item.quantidade > (Number(item.estoque) || 0))}
        sx={{ borderRadius: 50, px: 4, py: 1.2, fontWeight: 'bold' }}
      >
        FINALIZAR
      </Button>
    </Paper>
    </Box>
  );
}