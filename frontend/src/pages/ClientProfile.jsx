import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Box, Typography, Paper, Container, Table, TableHead, TableBody, TableRow, TableCell, Chip, Button, TextField, Grid, IconButton, Tooltip, Card, CardContent, CardActions, Divider } from "@mui/material";
import { Replay, AddShoppingCart, Star } from "@mui/icons-material";

export default function ClientProfile({ user, onUserUpdate, addToCart }) {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [maisComprados, setMaisComprados] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [config, setConfig] = useState({});
  const [pontosSaldo, setPontosSaldo] = useState(0);
  const [pontosHistorico, setPontosHistorico] = useState([]);

  const checkIfOpen = (cfg) => {
    const now = new Date();
    const today = now.getDay();
    const current = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    if (cfg.opening_hours) {
      try {
        const hours = JSON.parse(cfg.opening_hours);
        const todaySchedule = hours.find(h => h.day === today);
        if (!todaySchedule || !todaySchedule.open) return false;
        return current >= todaySchedule.open_time && current <= todaySchedule.close_time;
      } catch (e) { /* fallback */ }
    }

    if (cfg.open_days) {
      const allowedDays = cfg.open_days.split(',').map(Number);
      if (!allowedDays.includes(today)) return false;
    }
    if (!cfg.open_time || !cfg.close_time) return true;
    return current >= cfg.open_time && current <= cfg.close_time;
  };

  useEffect(() => {
    if (user) {
      setFormData(user);
      api.get(`/clientes/${user.id}/pedidos`).then(res => setPedidos(res.data));
      api.get(`/clientes/${user.id}/mais-comprados`).then(res => setMaisComprados(res.data));
    }

    api.get("/configuracoes").then(res => {
      if (res.data) {
        setConfig(res.data);
        setIsStoreOpen(checkIfOpen(res.data));
      }
    });

    if (user) {
      api.get(`/fidelidade/${user.id}`).then(res => {
        if (res.data) {
          setPontosSaldo(res.data.saldo || 0);
          setPontosHistorico(res.data.historico || []);
        }
      }).catch(() => {});
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (formData.senha && !senhaAtual) {
      alert("Por favor, informe sua senha atual para alterar a senha.");
      return;
    }

    try {
      await api.put(`/clientes/${user.id}`, { ...formData, senha_atual: senhaAtual });
      alert("Dados atualizados com sucesso!");
      setIsEditing(false);
      setSenhaAtual("");
      if (onUserUpdate) onUserUpdate(formData);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao atualizar dados.");
    }
  };

  const handleRepeatOrder = async (orderId) => {
    if (!checkIfOpen(config)) {
      setIsStoreOpen(false);
      alert("No momento estamos fechados. Volte dentro do horário de atendimento!");
      return;
    }

    try {
      const res = await api.get(`/pedidos/${orderId}`);
      const pedido = res.data;
      
      for (const item of pedido.itens) {
        await addToCart({
          ...item, 
          id: item.produto_id, 
          nome: item.produto_nome, 
          preco_venda: item.valor_unitario,
          // Converte o campo 'imagem' simples para o formato de array esperado pelo carrinho
          imagens: item.imagem ? [{ imagem: item.imagem, eh_capa: true }] : (item.imagens || []),
          estoque: item.estoque // Inclui o estoque do produto
        }, Number(item.quantidade));
      }
      
      navigate("/carrinho");
    } catch (err) {
      alert("Erro ao carregar pedido para repetição.");
    }
  };

  const handleBuyItem = async (item) => {
    if (!checkIfOpen(config)) {
      setIsStoreOpen(false);
      alert("No momento estamos fechados. Volte dentro do horário de atendimento!");
      return;
    }

    await addToCart({
      ...item,
      // Garante que a imagem apareça no carrinho ao comprar novamente um item individual
      imagens: item.imagens || (item.imagem ? [{ imagem: item.imagem, eh_capa: true }] : []),
      estoque: item.estoque // Inclui o estoque do produto
    }, 1);
    navigate("/carrinho");
  };

  const getStatusColor = (status) => {
    if (status === 'Finalizado') return 'success';
    if (status === 'Cancelado') return 'error';
    return 'primary';
  };

  if (!user) return <Typography sx={{ p: 4, textAlign: 'center' }}>Faça login para ver seu perfil.</Typography>;

  return (
    <Container maxWidth="md" sx={{ py: 4, bgcolor: '#FFFAF5', minHeight: '100vh', pb: { xs: 12, md: 4 } }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 5, boxShadow: '0 4px 24px rgba(44,24,16,0.10)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#2C1810' }}>Meu Perfil</Typography>
          {!isEditing ? (
            <Button variant="outlined" onClick={() => setIsEditing(true)} sx={{ borderRadius: 50, borderColor: '#D4580A', color: '#D4580A' }}>Editar Dados</Button>
          ) : (
            <Box display="flex" gap={1}>
              <Button variant="outlined" onClick={() => { setIsEditing(false); setFormData(user); setSenhaAtual(""); }} sx={{ borderRadius: 50 }}>Cancelar</Button>
              <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 50, bgcolor: '#D4580A', '&:hover': { bgcolor: '#B84508' } }}>Salvar</Button>
            </Box>
          )}
        </Box>

        {!isEditing ? (
          <>
            <Typography variant="h6">{user.nome}</Typography>
            <Typography color="text.secondary">{user.endereco}, {user.numero} {user.complemento && `- ${user.complemento}`} - {user.bairro}</Typography>
            <Typography color="text.secondary">{user.cidade}</Typography>
            <Typography color="text.secondary">{user.telefone}</Typography>
          </>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField label="Nome" name="nome" fullWidth value={formData.nome || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Telefone" name="telefone" fullWidth value={formData.telefone || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField label="Endereço" name="endereco" fullWidth value={formData.endereco || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Número" name="numero" fullWidth value={formData.numero || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Complemento" name="complemento" fullWidth value={formData.complemento || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Bairro" name="bairro" fullWidth value={formData.bairro || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Cidade" name="cidade" fullWidth value={formData.cidade || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Nova Senha" name="senha" type="password" fullWidth value={formData.senha || ""} onChange={handleChange} placeholder="Deixe em branco para manter" />
            </Grid>
            {formData.senha && (
              <Grid item xs={12} md={4}>
                <TextField label="Senha Atual (Obrigatório)" type="password" fullWidth value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
              </Grid>
            )}
          </Grid>
        )}
      </Paper>

      {/* Meus Pontos */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 5, background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', boxShadow: '0 4px 24px rgba(212,88,10,0.15)' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Star sx={{ color: '#D4580A' }} />
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#2C1810' }}>Meus Pontos de Fidelidade</Typography>
        </Box>
        <Typography variant="h3" fontWeight="bold" sx={{ color: '#D4580A', mb: 1 }}>{pontosSaldo}</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Acumule pontos a cada compra e troque por descontos!
        </Typography>
        {pontosHistorico.length > 0 && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>Histórico</Typography>
            <Table size="small">
              <TableBody>
                {pontosHistorico.slice(0, 5).map(h => (
                  <TableRow key={h.id}>
                    <TableCell sx={{ py: 0.5 }}>{h.descricao}</TableCell>
                    <TableCell align="right" sx={{ py: 0.5, color: h.tipo === 'credito' ? 'green' : 'red', fontWeight: 'bold' }}>
                      {h.tipo === 'credito' ? '+' : '-'}{h.pontos} pts
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, color: 'text.secondary', fontSize: 12 }}>
                      {new Date(h.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>

      {maisComprados.length > 0 && (
        <>
          <Typography variant="h5" fontWeight="bold" mb={2} sx={{ color: '#2C1810' }}>Comprar Novamente</Typography>
          <Grid container spacing={2} mb={4}>
            {maisComprados.map(item => (
              <Grid item xs={6} sm={4} md={3} key={item.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: '0 2px 12px rgba(44,24,16,0.08)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 6px 20px rgba(44,24,16,0.14)' } }}>
                  <Box
                    component="img"
                    src={item.imagem || (item.imagens?.[0]?.imagem) || "https://via.placeholder.com/300?text=Sem+Imagem"}
                    alt={item.nome}
                    sx={{ width: '100%', height: 120, objectFit: 'cover' }}
                  />
                  <CardContent sx={{ pb: 1, flexGrow: 1 }}>
                    <Typography variant="subtitle2" noWrap fontWeight="bold">{item.nome}</Typography>
                    <Typography variant="caption" color="text.secondary">Comprado {item.total_comprado}x</Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      fullWidth
                      variant="contained"
                      startIcon={<AddShoppingCart />}
                      onClick={() => handleBuyItem(item)}
                      disabled={!isStoreOpen}
                      sx={{ borderRadius: 50, bgcolor: '#D4580A', '&:hover': { bgcolor: '#B84508' } }}
                    >
                      Comprar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <Typography variant="h5" fontWeight="bold" mb={2} sx={{ color: '#2C1810' }}>Meus Pedidos</Typography>
      <Paper sx={{ borderRadius: 4, boxShadow: '0 4px 24px rgba(44,24,16,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidos.length > 0 ? (
              pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{new Date(pedido.data_pedido).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={pedido.status} color={getStatusColor(pedido.status)} size="small" />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>R$ {Number(pedido.valor_total).toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={isStoreOpen ? "Repetir Pedido" : "Loja Fechada"}>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleRepeatOrder(pedido.id)}
                        disabled={!isStoreOpen}
                      ><Replay /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">Nenhum pedido encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}