import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Box, Typography, Paper, Container, Table, TableHead, TableBody, TableRow, TableCell, Chip, Button, TextField, Grid, IconButton, Tooltip, Card, CardContent, CardActions, CardMedia } from "@mui/material";
import { Replay, AddShoppingCart } from "@mui/icons-material";

export default function ClientProfile({ user, onUserUpdate, addToCart }) {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [maisComprados, setMaisComprados] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  useEffect(() => {
    if (user) {
      setFormData(user);
      api.get(`/clientes/${user.id}/pedidos`).then(res => setPedidos(res.data));
      api.get(`/clientes/${user.id}/mais-comprados`).then(res => setMaisComprados(res.data));
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
    try {
      const res = await api.get(`/pedidos/${orderId}`);
      const pedido = res.data;
      
      pedido.itens.forEach(item => {
        addToCart({ 
          ...item, 
          id: item.produto_id, 
          nome: item.produto_nome, 
          preco_venda: item.valor_unitario,
          // Converte o campo 'imagem' simples para o formato de array esperado pelo carrinho
          imagens: item.imagem ? [{ imagem: item.imagem, eh_capa: true }] : (item.imagens || []),
          estoque: item.estoque // Inclui o estoque do produto
        }, Number(item.quantidade));
      });
      
      navigate("/carrinho");
    } catch (err) {
      alert("Erro ao carregar pedido para repetição.");
    }
  };

  const handleBuyItem = (item) => {
    addToCart({
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" fontWeight="bold">Meu Perfil</Typography>
          {!isEditing ? (
            <Button variant="outlined" onClick={() => setIsEditing(true)}>Editar Dados</Button>
          ) : (
            <Box display="flex" gap={1}>
              <Button variant="outlined" onClick={() => { setIsEditing(false); setFormData(user); setSenhaAtual(""); }}>Cancelar</Button>
              <Button variant="contained" onClick={handleSave}>Salvar</Button>
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

      {maisComprados.length > 0 && (
        <>
          <Typography variant="h5" fontWeight="bold" mb={2}>Comprar Novamente</Typography>
          <Grid container spacing={2} mb={4}>
            {maisComprados.map(item => (
              <Grid item xs={6} sm={4} md={3} key={item.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
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
                    <Button size="small" fullWidth startIcon={<AddShoppingCart />} onClick={() => handleBuyItem(item)}>
                      Comprar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <Typography variant="h5" fontWeight="bold" mb={2}>Meus Pedidos</Typography>
      <Paper>
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
                    <Tooltip title="Repetir Pedido">
                      <IconButton color="primary" onClick={() => handleRepeatOrder(pedido.id)}><Replay /></IconButton>
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