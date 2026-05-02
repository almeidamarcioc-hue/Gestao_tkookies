import { useState, useMemo } from "react";
import {
  Box, Typography, Grid, IconButton,
  Button, Tooltip
} from "@mui/material";
import { Add, Remove, ShoppingBag } from "@mui/icons-material";

const BOX_SIZES = [
  { qty: 4,  label: "Mini",   desc: "4 un" },
  { qty: 6,  label: "Média",  desc: "6 un" },
  { qty: 8,  label: "Grande", desc: "8 un" },
  { qty: 12, label: "Festa",  desc: "12 un" },
];

export default function BoxBuilder({ products = [], addToCart, isStoreOpen, kitDescontos = {} }) {
  const [boxSize, setBoxSize] = useState(null);
  const [selections, setSelections] = useState({});

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
    const discountRatio = hasDiscount && totalPrice > 0 ? discountedPrice / totalPrice : 1;

    for (const [id, qty] of Object.entries(selections)) {
      const prod = products.find(p => String(p.id) === String(id));
      if (!prod) continue;
      const prodParaCarrinho = discountRatio < 1
        ? {
            ...prod,
            preco_venda: parseFloat((Number(prod.preco_venda) * discountRatio).toFixed(2)),
            preco_original_kit: Number(prod.preco_venda),
          }
        : prod;
      await addToCart(prodParaCarrinho, qty);
    }
    setSelections({});
    setBoxSize(null);
  };

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
    <Box sx={{
      mx: { xs: -3, md: '-6vw' },
      px: { xs: 3, md: '6vw' },
      py: { xs: 8, md: 12 },
      bgcolor: 'var(--paper)',
      borderTop: '1px solid var(--rule)',
    }}>
      {/* CABEÇALHO */}
      <Box mb={6}>
        <Typography sx={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--caramel)',
          mb: 2,
        }}>
          § — Monte seu Kit
        </Typography>
        <Typography sx={{
          fontFamily: '"Fraunces", Georgia, serif',
          fontWeight: 300,
          fontSize: { xs: '34px', md: '48px' },
          letterSpacing: '-0.04em',
          color: 'var(--ink)',
          mb: 2,
          lineHeight: 1.1,
        }}>
          Escolha seus sabores
        </Typography>
        <Typography sx={{
          fontFamily: 'Inter',
          fontSize: '14px',
          color: 'var(--ink)',
          opacity: 0.65,
          lineHeight: 1.8,
          maxWidth: 480,
        }}>
          Escolha o tamanho da sua caixinha e selecione os sabores que mais te encantam.
          Cada kit é montado com carinho especialmente para você.
        </Typography>
      </Box>

      {/* SELETOR DE TAMANHO */}
      <Box mb={6}>
        <Typography sx={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
          opacity: 0.45,
          mb: 2,
        }}>
          1 — Tamanho
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          {activeSizes.map(s => {
            const kd = kitDescontos[String(s.qty)];
            const discountLabel = kd && Number(kd.valor) > 0
              ? kd.tipo === 'percentual' ? `-${kd.valor}%` : `-R$${Number(kd.valor).toFixed(2)}`
              : null;
            const isSelected = boxSize === s.qty;
            return (
              <Box
                key={s.qty}
                onClick={() => handleChangeSize(s.qty)}
                sx={{
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--terracotta)' : '1px solid var(--rule)',
                  borderRadius: '2px',
                  px: 3,
                  py: 1.5,
                  textAlign: 'center',
                  bgcolor: isSelected ? 'rgba(180,70,20,0.05)' : 'transparent',
                  minWidth: 90,
                  position: 'relative',
                  transition: 'border-color 0.15s, background 0.15s',
                  '&:hover': {
                    borderColor: isSelected ? 'var(--terracotta)' : 'var(--ink)',
                  },
                }}
              >
                {discountLabel && (
                  <Box sx={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    bgcolor: 'var(--terracotta)',
                    color: 'var(--cream)',
                    borderRadius: '2px',
                    px: 0.75,
                    py: 0.15,
                    fontFamily: '"DM Mono", monospace',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}>
                    {discountLabel}
                  </Box>
                )}
                <Typography sx={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 300,
                  fontSize: '16px',
                  color: isSelected ? 'var(--terracotta)' : 'var(--ink)',
                  lineHeight: 1.2,
                }}>
                  {s.label}
                </Typography>
                <Typography sx={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '11px',
                  color: 'var(--ink)',
                  opacity: 0.5,
                  letterSpacing: '0.05em',
                }}>
                  {s.desc}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {boxSize && (
        <>
          {/* BARRA DE PROGRESSO */}
          <Box mb={6}>
            <Typography sx={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              opacity: 0.45,
              mb: 2,
            }}>
              2 — Sua caixinha
            </Typography>

            {/* Slots visuais */}
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {slots.map((prod, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '2px',
                    border: prod
                      ? '2px solid var(--terracotta)'
                      : '1px dashed var(--rule)',
                    bgcolor: prod ? 'rgba(180,70,20,0.05)' : 'transparent',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {prod && (
                    prod.imagens?.[0]?.imagem
                      ? <Box component="img"
                          src={prod.imagens.find(im => im.eh_capa)?.imagem || prod.imagens[0].imagem}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: 'var(--terracotta)', letterSpacing: '0.05em' }}>
                          ok
                        </Typography>
                  )}
                </Box>
              ))}
            </Box>

            {/* Barra de progresso thin */}
            <Box sx={{ height: '2px', bgcolor: 'var(--rule)', maxWidth: 340, position: 'relative' }}>
              <Box sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(totalSelected / boxSize) * 100}%`,
                bgcolor: isFull ? 'var(--caramel)' : 'var(--terracotta)',
                transition: 'width 0.3s ease',
              }} />
            </Box>
            <Typography sx={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '11px',
              color: 'var(--ink)',
              opacity: isFull ? 1 : 0.5,
              letterSpacing: '0.05em',
              mt: 1,
            }}>
              {isFull
                ? '✓ Caixinha completa'
                : `${totalSelected} de ${boxSize} — faltam ${slotsRemaining}`}
            </Typography>
          </Box>

          {/* GRID DE PRODUTOS */}
          <Box mb={6}>
            <Typography sx={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              opacity: 0.45,
              mb: 2,
            }}>
              3 — Sabores
            </Typography>
            <Grid container spacing={2}>
              {availableProducts.map(prod => {
                const qty = selections[prod.id] || 0;
                const img = prod.imagens?.find(i => i.eh_capa)?.imagem || prod.imagens?.[0]?.imagem;
                const canAddMore = totalSelected < boxSize && qty < Number(prod.estoque);

                return (
                  <Grid item xs={6} sm={4} md={3} key={prod.id}>
                    <Box sx={{
                      borderRadius: '2px',
                      border: qty > 0 ? '2px solid var(--terracotta)' : '1px solid var(--rule)',
                      bgcolor: qty > 0 ? 'rgba(180,70,20,0.04)' : 'var(--cream)',
                      transition: 'border-color 0.15s, background 0.15s',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {qty > 0 && (
                        <Box sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          zIndex: 2,
                          bgcolor: 'var(--terracotta)',
                          color: 'var(--cream)',
                          borderRadius: '2px',
                          minWidth: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: '"DM Mono", monospace',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>
                          {qty}
                        </Box>
                      )}
                      {img && (
                        <Box component="img" src={img}
                          sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                      )}
                      <Box sx={{ p: 1.5 }}>
                        <Typography sx={{
                          fontFamily: '"Fraunces", Georgia, serif',
                          fontWeight: 300,
                          fontSize: '13px',
                          color: 'var(--ink)',
                          mb: 0.25,
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {prod.nome}
                        </Typography>
                        <Typography sx={{
                          fontFamily: '"DM Mono", monospace',
                          fontSize: '11px',
                          color: 'var(--terracotta)',
                          letterSpacing: '0.04em',
                        }}>
                          R$ {Number(prod.preco_venda).toFixed(2)}
                        </Typography>
                        <Typography sx={{
                          fontFamily: '"DM Mono", monospace',
                          fontSize: '10px',
                          color: Number(prod.estoque) <= 3 ? 'var(--terracotta)' : 'var(--ink)',
                          opacity: Number(prod.estoque) <= 3 ? 1 : 0.4,
                          mt: 0.3,
                          letterSpacing: '0.04em',
                        }}>
                          {Number(prod.estoque)} disponíve{Number(prod.estoque) === 1 ? 'l' : 'is'}
                        </Typography>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1.25}>
                          <IconButton size="small" onClick={() => handleRemove(prod)} disabled={qty === 0}
                            sx={{
                              p: 0.5,
                              border: '1px solid var(--rule)',
                              borderRadius: '2px',
                              '&:disabled': { opacity: 0.25 },
                            }}>
                            <Remove sx={{ fontSize: '0.85rem' }} />
                          </IconButton>
                          <Typography sx={{
                            fontFamily: '"DM Mono", monospace',
                            fontSize: '13px',
                            fontWeight: 600,
                            minWidth: 20,
                            textAlign: 'center',
                            color: 'var(--ink)',
                          }}>
                            {qty}
                          </Typography>
                          <Tooltip title={!canAddMore && totalSelected >= boxSize ? "Caixinha cheia!" : ""}>
                            <span>
                              <IconButton size="small" onClick={() => handleAdd(prod)} disabled={!canAddMore}
                                sx={{
                                  p: 0.5,
                                  bgcolor: canAddMore ? 'var(--terracotta)' : 'transparent',
                                  color: canAddMore ? 'var(--cream)' : 'var(--ink)',
                                  border: canAddMore ? '1px solid var(--terracotta)' : '1px solid var(--rule)',
                                  borderRadius: '2px',
                                  '&:hover': { bgcolor: canAddMore ? '#b84508' : undefined },
                                  '&:disabled': { opacity: 0.2 },
                                }}>
                                <Add sx={{ fontSize: '0.85rem' }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* RODAPÉ — Resumo + Botão */}
          {totalSelected > 0 && (
            <Box sx={{
              position: 'sticky',
              bottom: { xs: 72, md: 24 },
              zIndex: 10,
              bgcolor: 'var(--ink)',
              borderRadius: '2px',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Box>
                <Typography sx={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  color: 'rgba(253,248,240,0.55)',
                  mb: 0.25,
                  textTransform: 'uppercase',
                }}>
                  {isFull
                    ? '✓ Kit pronto para o carrinho'
                    : `${slotsRemaining} cookie${slotsRemaining > 1 ? 's' : ''} ainda falta${slotsRemaining > 1 ? 'm' : ''}`}
                </Typography>
                <Box display="flex" alignItems="baseline" gap={1.5} flexWrap="wrap">
                  {hasDiscount && (
                    <Typography sx={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: '12px',
                      color: 'rgba(253,248,240,0.35)',
                      textDecoration: 'line-through',
                    }}>
                      R$ {totalPrice.toFixed(2)}
                    </Typography>
                  )}
                  <Typography sx={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontWeight: 300,
                    fontSize: '22px',
                    color: hasDiscount ? 'var(--caramel)' : 'var(--cream)',
                    letterSpacing: '-0.02em',
                  }}>
                    R$ {discountedPrice.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                disabled={!isFull || !isStoreOpen}
                onClick={handleAddToCart}
                startIcon={<ShoppingBag sx={{ fontSize: '1rem' }} />}
                sx={{
                  bgcolor: isFull ? 'var(--terracotta)' : 'rgba(255,255,255,0.1)',
                  color: 'var(--cream)',
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  borderRadius: '2px',
                  px: 3,
                  py: 1.25,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: isFull ? '#b84508' : undefined,
                    boxShadow: 'none',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.06)',
                    color: 'rgba(253,248,240,0.3)',
                  },
                }}
              >
                {isFull ? 'Adicionar ao Carrinho' : `Faltam ${slotsRemaining}`}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
