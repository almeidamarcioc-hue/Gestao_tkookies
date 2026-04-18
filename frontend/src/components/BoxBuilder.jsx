import { useState, useMemo } from "react";
import {
  Box, Typography, Grid, Card, CardContent, IconButton,
  Button, Chip, LinearProgress, Tooltip
} from "@mui/material";
import { Add, Remove, CheckCircle, ShoppingBag } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

const terracotta = '#D4580A';
const espresso = '#2C1810';
const caramel = '#C4922A';

const BOX_SIZES = [
  { qty: 4,  label: "Mini",    desc: "4 cookies",  icon: "🍪" },
  { qty: 6,  label: "Média",   desc: "6 cookies",  icon: "🍪🍪" },
  { qty: 8,  label: "Grande",  desc: "8 cookies",  icon: "🍪🍪🍪" },
  { qty: 12, label: "Festa",   desc: "12 cookies", icon: "🍪🍪🍪🍪" },
];

export default function BoxBuilder({ products = [], addToCart, isStoreOpen, kitDescontos = {} }) {
  const [boxSize, setBoxSize] = useState(null);
  const [selections, setSelections] = useState({}); // { productId: quantity }

  // Only show sizes that are marked active (or all if no config was set)
  const hasConfig = Object.keys(kitDescontos).length > 0;
  const activeSizes = BOX_SIZES.filter(s => {
    if (!hasConfig) return true;
    const kd = kitDescontos[String(s.qty)];
    return !kd || kd.ativo !== false;
  });

  const availableProducts = products.filter(p => p.estoque > 0 && p.ativo !== false);

  if (activeSizes.length === 0 || availableProducts.length === 0) return null;

  const totalSelected = useMemo(
    () => Object.values(selections).reduce((a, b) => a + b, 0),
    [selections]
  );

  const slotsRemaining = boxSize ? boxSize - totalSelected : 0;
  const isFull = boxSize && totalSelected === boxSize;

  const totalPrice = useMemo(() => {
    return Object.entries(selections).reduce((acc, [id, qty]) => {
      const prod = products.find(p => String(p.id) === String(id));
      return acc + (prod ? Number(prod.preco_venda) * qty : 0);
    }, 0);
  }, [selections, products]);

  const discountedPrice = useMemo(() => {
    if (!boxSize) return totalPrice;
    const kd = kitDescontos[String(boxSize)];
    if (!kd || !kd.valor || Number(kd.valor) === 0) return totalPrice;
    if (kd.tipo === 'percentual') return totalPrice * (1 - Number(kd.valor) / 100);
    return Math.max(0, totalPrice - Number(kd.valor));
  }, [totalPrice, boxSize, kitDescontos]);

  const hasDiscount = discountedPrice < totalPrice;

  const handleAdd = (product) => {
    if (totalSelected >= boxSize) return;
    const current = selections[product.id] || 0;
    const stockLimit = Number(product.estoque);
    if (current >= stockLimit) return;
    setSelections(prev => ({ ...prev, [product.id]: current + 1 }));
  };

  const handleRemove = (product) => {
    const current = selections[product.id] || 0;
    if (current <= 0) return;
    if (current === 1) {
      setSelections(prev => { const n = { ...prev }; delete n[product.id]; return n; });
    } else {
      setSelections(prev => ({ ...prev, [product.id]: current - 1 }));
    }
  };

  const handleChangeSize = (size) => {
    setBoxSize(size);
    setSelections({});
  };

  const handleAddToCart = async () => {
    if (!isFull) return;
    for (const [id, qty] of Object.entries(selections)) {
      const prod = products.find(p => String(p.id) === String(id));
      if (prod) await addToCart(prod, qty);
    }
    setSelections({});
    setBoxSize(null);
  };

  // Visual slots (empty/filled cookies)
  const slots = boxSize
    ? Array.from({ length: boxSize }, (_, i) => {
        let filled = 0;
        for (const [id, qty] of Object.entries(selections)) {
          if (i < filled + qty) {
            const prod = products.find(p => String(p.id) === String(id));
            return prod;
          }
          filled += qty;
        }
        return null;
      })
    : [];

  return (
    <Box sx={{ mt: 8, p: { xs: 3, md: 5 }, bgcolor: '#FDF3E7', borderRadius: 5, border: '1px solid rgba(196,146,42,0.15)' }}>
      {/* CABEÇALHO */}
      <Box mb={4} textAlign="center">
        <Typography variant="h5" fontWeight="900" sx={{ color: espresso, mb: 1 }}>
          Monte seu Kit
        </Typography>
        <Box sx={{ bgcolor: caramel, height: 3, width: 48, borderRadius: 2, mb: 2, mx: 'auto' }} />
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          Escolha o tamanho da sua caixinha e selecione os sabores que mais te encantam.
          Cada kit é montado com carinho especialmente para você.
        </Typography>
      </Box>

      {/* SELETOR DE TAMANHO */}
      <Box mb={4}>
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1.5} textAlign="center" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.72rem' }}>
          1. Escolha o tamanho
        </Typography>
        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
          {activeSizes.map(s => {
            const kd = kitDescontos[String(s.qty)];
            const discountLabel = kd && Number(kd.valor) > 0
              ? kd.tipo === 'percentual' ? `-${kd.valor}%` : `-R$${Number(kd.valor).toFixed(2)}`
              : null;
            return (
              <Box
                key={s.qty}
                component={motion.div}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleChangeSize(s.qty)}
                sx={{
                  cursor: 'pointer',
                  border: boxSize === s.qty ? `2px solid ${terracotta}` : '2px solid rgba(44,24,16,0.12)',
                  borderRadius: 4,
                  px: 3, py: 2,
                  textAlign: 'center',
                  bgcolor: boxSize === s.qty ? 'rgba(212,88,10,0.06)' : 'white',
                  minWidth: 90,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {discountLabel && (
                  <Box sx={{
                    position: 'absolute', top: -10, right: -10,
                    bgcolor: '#2E7D32', color: 'white', borderRadius: 50,
                    px: 1, py: 0.2, fontSize: '0.65rem', fontWeight: 'bold',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}>{discountLabel}</Box>
                )}
                <Typography sx={{ fontSize: '1.4rem', mb: 0.5 }}>{s.icon}</Typography>
                <Typography fontWeight="bold" sx={{ color: boxSize === s.qty ? terracotta : espresso }}>{s.label}</Typography>
                <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {boxSize && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* SLOTS VISUAIS */}
          <Box mb={4}>
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1.5} textAlign="center" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.72rem' }}>
              2. Sua caixinha
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center" mb={1.5}>
              {slots.map((prod, i) => (
                <Box
                  key={i}
                  component={motion.div}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  sx={{
                    width: 56, height: 56,
                    borderRadius: 3,
                    border: prod ? `2px solid ${terracotta}` : '2px dashed rgba(44,24,16,0.15)',
                    bgcolor: prod ? 'rgba(212,88,10,0.07)' : '#FDFAF6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {prod ? (
                    prod.imagens?.[0]?.imagem
                      ? <Box component="img" src={prod.imagens.find(i => i.eh_capa)?.imagem || prod.imagens[0].imagem}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Typography sx={{ fontSize: '1.6rem' }}>🍪</Typography>
                  ) : (
                    <Typography color="text.disabled" sx={{ fontSize: '1.4rem' }}>○</Typography>
                  )}
                </Box>
              ))}
            </Box>
            <LinearProgress
              variant="determinate"
              value={(totalSelected / boxSize) * 100}
              sx={{
                height: 6, borderRadius: 3, mx: 'auto', maxWidth: 340,
                bgcolor: 'rgba(44,24,16,0.08)',
                '& .MuiLinearProgress-bar': { bgcolor: isFull ? '#2E7D32' : terracotta, borderRadius: 3 }
              }}
            />
            <Typography variant="caption" color={isFull ? 'success.main' : 'text.secondary'}
              display="block" textAlign="center" mt={0.5} fontWeight="bold">
              {isFull ? '✓ Caixinha completa!' : `${totalSelected} de ${boxSize} selecionados — faltam ${slotsRemaining}`}
            </Typography>
          </Box>

          {/* GRID DE PRODUTOS */}
          <Box mb={4}>
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1.5} textAlign="center" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.72rem' }}>
              3. Escolha os sabores
            </Typography>
            <Grid container spacing={2}>
              {availableProducts.map(prod => {
                const qty = selections[prod.id] || 0;
                const img = prod.imagens?.find(i => i.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
                const canAddMore = totalSelected < boxSize && qty < Number(prod.estoque);

                return (
                  <Grid item xs={6} sm={4} md={3} key={prod.id}>
                    <Card sx={{
                      borderRadius: 4,
                      border: qty > 0 ? `2px solid ${terracotta}` : '1px solid rgba(44,24,16,0.10)',
                      bgcolor: qty > 0 ? 'rgba(212,88,10,0.04)' : '#FDFAF6',
                      boxShadow: qty > 0 ? `0 4px 16px rgba(212,88,10,0.15)` : '0 2px 8px rgba(44,24,16,0.06)',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}>
                      {qty > 0 && (
                        <Chip
                          label={qty}
                          size="small"
                          sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2, bgcolor: terracotta, color: 'white', fontWeight: 'bold', minWidth: 28, height: 24 }}
                        />
                      )}
                      {img && (
                        <Box component="img" src={img}
                          sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: '16px 16px 0 0' }} />
                      )}
                      <CardContent sx={{ p: 1.5, pb: '8px !important' }}>
                        <Typography variant="caption" fontWeight="bold" display="block" noWrap sx={{ color: espresso, mb: 0.5 }}>
                          {prod.nome}
                        </Typography>
                        <Typography variant="caption" color={terracotta} fontWeight="bold">
                          R$ {Number(prod.preco_venda).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ color: Number(prod.estoque) <= 3 ? '#E65100' : 'text.secondary', fontSize: '0.65rem', mt: 0.3 }}>
                          {Number(prod.estoque)} disponíve{Number(prod.estoque) === 1 ? 'l' : 'is'}
                        </Typography>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1}>
                          <IconButton size="small" onClick={() => handleRemove(prod)} disabled={qty === 0}
                            sx={{ p: 0.5, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 2, '&:disabled': { opacity: 0.3 } }}>
                            <Remove fontSize="small" sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                          <Typography fontWeight="bold" sx={{ minWidth: 20, textAlign: 'center', fontSize: '0.9rem' }}>{qty}</Typography>
                          <Tooltip title={!canAddMore && totalSelected >= boxSize ? "Caixinha cheia!" : ""}>
                            <span>
                              <IconButton size="small" onClick={() => handleAdd(prod)} disabled={!canAddMore}
                                sx={{ p: 0.5, bgcolor: canAddMore ? terracotta : 'rgba(44,24,16,0.08)', color: canAddMore ? 'white' : 'rgba(44,24,16,0.3)', borderRadius: 2,
                                  '&:hover': { bgcolor: canAddMore ? '#B84508' : undefined }, '&:disabled': { bgcolor: 'rgba(44,24,16,0.06)' } }}>
                                <Add fontSize="small" sx={{ fontSize: '0.9rem' }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* RODAPÉ — Resumo + Botão */}
          <AnimatePresence>
            {totalSelected > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <Box sx={{
                  position: 'sticky', bottom: { xs: 72, md: 24 }, zIndex: 10,
                  bgcolor: isFull ? espresso : 'rgba(44,24,16,0.92)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 4, p: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
                  flexWrap: 'wrap',
                  boxShadow: '0 8px 32px rgba(44,24,16,0.25)',
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {isFull ? '✓ Kit pronto para o carrinho!' : `${slotsRemaining} cookie${slotsRemaining > 1 ? 's' : ''} ainda falta${slotsRemaining > 1 ? 'm' : ''}`}
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                      {hasDiscount && (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'line-through' }}>
                          R$ {totalPrice.toFixed(2)}
                        </Typography>
                      )}
                      <Typography variant="h6" fontWeight="bold" sx={{ color: hasDiscount ? '#81C784' : caramel }}>
                        Total: R$ {discountedPrice.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    disabled={!isFull || !isStoreOpen}
                    onClick={handleAddToCart}
                    startIcon={<ShoppingBag />}
                    sx={{
                      bgcolor: isFull ? terracotta : 'rgba(255,255,255,0.15)',
                      color: 'white',
                      fontWeight: 'bold',
                      px: 3,
                      '&:hover': { bgcolor: '#B84508' },
                      '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' },
                    }}
                  >
                    {isFull ? 'Adicionar ao Carrinho' : `Faltam ${slotsRemaining}`}
                  </Button>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </Box>
  );
}
