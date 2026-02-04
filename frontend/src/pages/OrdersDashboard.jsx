import { useState, useEffect, useRef } from "react";
import { 
  Box, Container, Typography, Grid, Card, CardContent, CardActions, 
  Button, Chip, IconButton, Switch, FormControlLabel, Paper, CircularProgress 
} from "@mui/material";
import { 
  AccessTime, CheckCircle, LocalDining, NotificationsActive, 
  NotificationsOff, VolumeUp 
} from "@mui/icons-material";
import api from "../services/api";

// Componente para o cronômetro do pedido
function OrderTimer({ startTime }) {
  const [elapsedTime, setElapsedTime] = useState("Calculando...");

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = now - start;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `Há ${hours}h ${minutes % 60}min`;
      }
      if (minutes < 1) {
        return "Agora";
      }
      return `Há ${minutes} min`;
    };

    setElapsedTime(calculateTime()); // Cálculo inicial

    // Atualiza a cada 30 segundos para não sobrecarregar
    const interval = setInterval(() => {
      setElapsedTime(calculateTime());
    }, 30000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Chip 
      icon={<AccessTime fontSize="small" />} 
      label={elapsedTime} 
      size="small" 
      variant="outlined"
      sx={{
        color: 'text.secondary',
        borderColor: 'rgba(0, 0, 0, 0.23)',
      }}
    />
  );
}


export default function OrdersDashboard() {
  const [orders, setOrders] = useState([]);
  const [unacknowledgedOrders, setUnacknowledgedOrders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const audioRef = useRef(new Audio("/notification.mp3")); 
  const lastOrderIdRef = useRef(0); 

  const loadOrders = async (isPolling = false) => {
    try {
      const res = await api.get("/pedidos");
      const data = Array.isArray(res.data) ? res.data : [];
      const activeOrders = data.filter(o => o.status !== 'Finalizado' && o.status !== 'Cancelado');
      activeOrders.sort((a, b) => b.id - a.id);

      if (isPolling && activeOrders.length > 0) {
        const newOrdersFound = activeOrders.filter(o => o.id > lastOrderIdRef.current);
        if (newOrdersFound.length > 0) {
            setUnacknowledgedOrders(prevSet => {
                const newSet = new Set(prevSet);
                newOrdersFound.forEach(o => newSet.add(o.id));
                return newSet;
            });
        }
      }
      setOrders(activeOrders);
    } catch (error) {
      console.error("Erro ao carregar pedidos", error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    if (orders.length > 0) {
      const newestId = orders[0].id;
      if (newestId > lastOrderIdRef.current) {
        lastOrderIdRef.current = newestId;
      }
    }
  }, [orders]);

  useEffect(() => {
    loadOrders(false);
    const interval = setInterval(() => {
      loadOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSoundToggle = (event) => {
    const isEnabled = event.target.checked;
    setSoundEnabled(isEnabled);

    // Se estiver ativando, tenta tocar o som bem baixo para "desbloquear" o áudio no navegador.
    // Isso é necessário por causa das políticas de autoplay dos navegadores.
    if (isEnabled) {
      const audio = audioRef.current;
      audio.volume = 0.01; // Quase inaudível
      audio.play().then(() => {
        // Pausa rapidamente após o desbloqueio
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1; // Restaura o volume
        }, 50);
      }).catch(error => console.warn("Não foi possível desbloquear o áudio no clique:", error));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (soundEnabled && unacknowledgedOrders.size > 0) {
      audio.loop = true;
      audio.play().catch(e => console.warn("Autoplay do som de notificação bloqueado pelo navegador.", e));
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [unacknowledgedOrders, soundEnabled]);

  const testNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.loop = false;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Autoplay do teste de som bloqueado pelo navegador:", e));
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setUnacknowledgedOrders(prevSet => {
        const newSet = new Set(prevSet);
        newSet.delete(id);
        return newSet;
    });

    try {
      await api.patch(`/pedidos/${id}/status`, { status: newStatus });
      
      if (newStatus === 'Finalizado') {
        setTimeout(() => {
          setOrders(prev => prev.filter(o => o.id !== id));
        }, 1000);
      }
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));

    } catch (error) {
      alert("Erro ao atualizar status");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ 
      py: 4,
      '@keyframes pulse': {
        '0%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.5)' },
        '70%': { boxShadow: '0 0 0 12px rgba(211, 47, 47, 0)' },
        '100%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)' },
      }
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4" fontWeight="bold" color="primary">
            Painel de Cozinha (KDS)
          </Typography>
          <Chip 
            icon={<LocalDining />} 
            label={`${orders.length} Pendentes`} 
            color="primary" 
            variant="outlined" 
          />
        </Box>

        <Paper sx={{ p: 1, px: 2, borderRadius: 50, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={soundEnabled} 
                onChange={handleSoundToggle} 
                color="success"
              />
            }
            label={soundEnabled ? "Som Ativado" : "Som Desativado"}
          />
          {soundEnabled ? <NotificationsActive color="success" /> : <NotificationsOff color="disabled" />}
          <IconButton size="small" onClick={testNotificationSound} title="Testar Som">
            <VolumeUp fontSize="small" />
          </IconButton>
        </Paper>
      </Box>

      <Grid container spacing={3}>
        {orders.map((order) => {
          const isUnacknowledged = unacknowledgedOrders.has(order.id);
          return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={order.id} sx={{ animation: isUnacknowledged ? 'pulse 1.5s infinite' : 'none' }}>
            <Card 
              elevation={4} 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderTop: `6px solid`,
                borderColor: order.status === 'Novo' ? '#d32f2f' : order.status === 'Em Produção' ? '#ed6c02' : '#2e7d32',
                bgcolor: isUnacknowledged ? '#fff8f8' : '#fff'
              }}
            >
              {order.status === 'Novo' && (
                <Chip 
                  label="NOVO" 
                  color="error" 
                  size="small" 
                  sx={{ position: 'absolute', top: 10, right: 10, fontWeight: 'bold' }} 
                />
              )}
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h5" fontWeight="bold">
                    #{order.id}
                  </Typography>
                  <OrderTimer startTime={order.data_pedido} />
                </Box>
                
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                  {order.cliente_nome || "Cliente Balcão"}
                </Typography>

                <Box sx={{ my: 2, bgcolor: '#f5f5f5', p: 1.5, borderRadius: 2 }}>
                  {order.itens && order.itens.map((item, idx) => (
                    <Box key={idx} display="flex" justifyContent="space-between" mb={0.5} borderBottom="1px dashed #e0e0e0" pb={0.5}>
                      <Typography variant="body1" fontWeight="bold">
                        {Number(item.quantidade)}x {item.produto_nome || item.nome}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {order.observacao && (
                  <Typography variant="body2" color="error" sx={{ bgcolor: '#ffebee', p: 1, borderRadius: 1, fontWeight: 'bold' }}>
                    ⚠️ Obs: {order.observacao}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
                <Box display="flex" gap={1} width="100%">
                  {order.status === 'Novo' && (
                    <Button 
                      variant="contained" 
                      color="warning" 
                      fullWidth 
                      startIcon={<LocalDining />}
                      onClick={() => handleStatusChange(order.id, 'Em Produção')}
                    >
                      Produzir
                    </Button>
                  )}
                  
                  {order.status === 'Em Produção' && (
                    <Button 
                      variant="contained" 
                      color="success" 
                      fullWidth 
                      startIcon={<CheckCircle />}
                      onClick={() => handleStatusChange(order.id, 'Pronto')}
                    >
                      Pronto
                    </Button>
                  )}

                  {order.status === 'Pronto' && (
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      fullWidth 
                      onClick={() => handleStatusChange(order.id, 'Finalizado')}
                    >
                      Entregar
                    </Button>
                  )}
                </Box>
              </CardActions>
            </Card>
          </Grid>
          )
        })}
        
        {orders.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 5, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              <AccessTime sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary">
                Tudo tranquilo por aqui! Aguardando novos pedidos...
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                O painel atualizará automaticamente a cada 15 segundos.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}