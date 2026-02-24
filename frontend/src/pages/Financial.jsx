import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Container, Typography, Box, Paper, Grid, Card, CardContent, 
  Table, TableBody, TableCell, TableHead, TableRow, 
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Chip, FormControlLabel, Switch
} from '@mui/material';
import { Edit, Delete, Add, TrendingUp, TrendingDown, AccountBalanceWallet, AttachMoney, FilterList } from '@mui/icons-material';
import AutoLogout from '../components/AutoLogout';

export default function Financial() {
  const [dashboard, setDashboard] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showOnlyTithe, setShowOnlyTithe] = useState(false);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    tipo: 'Saída',
    descricao: '',
    valor: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    status: 'Pendente',
    parcelas: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const [dashRes, listRes] = await Promise.all([
        api.get('/financeiro/dashboard', { params }),
        api.get('/financeiro', { params })
      ]);

      let lancamentosData = listRes.data;
      if (showOnlyTithe) {
        lancamentosData = lancamentosData.filter(lanc => lanc.descricao.startsWith('Dízimo Período:'));
      }

      setDashboard(dashRes.data);
      setLancamentos(lancamentosData);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros", error);
    }
  }

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({
        tipo: item.tipo,
        descricao: item.descricao,
        valor: item.valor,
        data_vencimento: item.data_vencimento.split('T')[0],
        status: item.status,
        parcelas: 1 // Na edição, não permitimos re-parcelar o item individual
      });
    } else {
      setEditItem(null);
      setFormData({
        tipo: 'Saída',
        descricao: '',
        valor: '',
        data_vencimento: new Date().toISOString().split('T')[0],
        status: 'Pendente',
        parcelas: 1
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formData.descricao || !formData.valor) return alert("Preencha os campos obrigatórios");

    // Se for novo lançamento e parcelado, abre modal de confirmação
    if (!editItem && Number(formData.parcelas) > 1) {
      setInstallmentDialogOpen(true);
      return;
    }

    await processSubmit(formData);
  };

  const processSubmit = async (data) => {
    try {
      if (editItem) {
        await api.put(`/financeiro/${editItem.id}`, data);
      } else {
        await api.post('/financeiro', data);
      }
      setOpen(false);
      setInstallmentDialogOpen(false);
      await loadData();
    } catch (error) {
      alert("Erro ao salvar lançamento");
    }
  };

  const handleInstallmentChoice = (isParcela) => {
    let dataToSend = { ...formData };
    if (isParcela) {
      dataToSend.valor = Number(formData.valor) * Number(formData.parcelas);
    }
    processSubmit(dataToSend);
  };

  const handleDelete = async (item) => {
    if (!confirm('Deseja excluir este lançamento?')) return;

    let deleteAll = false;
    // Se for parcelado (total_parcelas > 1), pergunta se quer apagar tudo
    if (item.total_parcelas > 1) {
      deleteAll = confirm('Este lançamento faz parte de um parcelamento.\n\nDeseja apagar TODAS as parcelas vinculadas?\n(OK = Sim, apagar todas | Cancelar = Não, apagar apenas esta)');
    }

    try {
      // Passa o parâmetro deleteAll se o usuário confirmou
      await api.delete(`/financeiro/${item.id}${deleteAll ? '?deleteAll=true' : ''}`);
      await loadData();
    } catch (error) {
      alert("Erro ao excluir");
    }
  };

  return (
    <Container maxWidth="xl">
      <AutoLogout />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Financeiro</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Novo Lançamento</Button>
      </Box>

      {/* FILTROS DE PERÍODO */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <TextField 
            label="Data Início" 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            InputLabelProps={{ shrink: true }} 
            size="small"
          />
          <TextField 
            label="Data Fim" 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            InputLabelProps={{ shrink: true }} 
            size="small"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showOnlyTithe}
                onChange={(e) => setShowOnlyTithe(e.target.checked)}
              />
            }
            label="Apenas Dízimo"
          />
          <Button variant="contained" startIcon={<FilterList />} onClick={loadData}>Filtrar</Button>
        </Box>
      </Paper>

      {/* DASHBOARD DE METAS E PROVISÃO */}
      {dashboard && (
        <Grid container spacing={3} mb={4}>
          {/* Card 1: Contas a Pagar Hoje */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#FFEBEE', height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingDown color="error" />
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">META DA SEMANA</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  R$ {Number(dashboard.meta_diaria).toFixed(2)}
                </Typography>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">DESAFIO DIÁRIO</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    R$ {Number(dashboard.desafio_diario || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">META MENSAL</Typography>
                  <Typography variant="h6" fontWeight="bold" color="error.main">
                    R$ {Number(dashboard.meta_mensal || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                   {new Date(dashboard.periodo_inicio + 'T00:00:00').toLocaleDateString()} até {new Date(dashboard.periodo_fim + 'T00:00:00').toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Vendas Pagas Hoje */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#E8F5E9', height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingUp color="success" />
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">VENDAS PAGAS</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  R$ {Number(dashboard.vendas_pagas_hoje).toFixed(2)}
                </Typography>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">HOJE</Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    R$ {Number(dashboard.vendas_hoje_real || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">MENSAL</Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    R$ {Number(dashboard.vendas_mensal || 0).toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Ponto de Equilíbrio (Falta Vender) */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#FFF3E0', height: '100%', border: '1px solid #FFB74D' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <AccountBalanceWallet color="warning" />
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">FALTA PARA META</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  R$ {Number(dashboard.falta_para_meta).toFixed(2)}
                </Typography>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">FALTA HOJE</Typography>
                  <Typography variant="h6" fontWeight="bold" color="warning.main">
                    R$ {Number(dashboard.desafio_diario || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">FALTA MENSAL</Typography>
                  <Typography variant="h6" fontWeight="bold" color="warning.main">
                    R$ {Number(dashboard.falta_meta_mensal || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Typography variant="caption" display="block">
                  {dashboard.falta_para_meta === 0 ? "Meta batida! 🎉" : "Necessário vender para cobrir contas"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 4: Provisão de Entrada */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#E3F2FD', height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <AttachMoney color="primary" />
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">PROVISÃO (A RECEBER)</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="primary.main">
                  R$ {Number(dashboard.provisao_recebimento).toFixed(2)}
                </Typography>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">VENCE HOJE</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    R$ {Number(dashboard.provisao_hoje || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box mt={1} pt={1} borderTop="1px dashed rgba(0,0,0,0.1)">
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">VENCE NO MÊS</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    R$ {Number(dashboard.provisao_mensal || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Typography variant="caption">Pedidos sem pagamento</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TABELA DE LANÇAMENTOS */}
      <Paper sx={{ width: '100%', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vencimento</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lancamentos.map((lanc) => (
              <TableRow key={lanc.id}>
                <TableCell>{new Date(lanc.data_vencimento).toLocaleDateString()}</TableCell>
                <TableCell>{lanc.descricao}</TableCell>
                <TableCell>
                  <Chip 
                    label={lanc.tipo} 
                    size="small" 
                    color={lanc.tipo === 'Entrada' ? 'success' : 'error'} 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: lanc.tipo === 'Entrada' ? 'success.main' : 'error.main' }}>
                  R$ {Number(lanc.valor).toFixed(2)}
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={lanc.status} 
                    size="small" 
                    color={lanc.status === 'Pago' || lanc.status === 'Recebido' ? 'success' : 'warning'} 
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleOpen(lanc)}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(lanc)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {lancamentos.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">Nenhum lançamento encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField 
              select 
              label="Tipo" 
              value={formData.tipo} 
              onChange={e => setFormData({...formData, tipo: e.target.value})}
              fullWidth
            >
              <MenuItem value="Entrada">Entrada (Receber)</MenuItem>
              <MenuItem value="Saída">Saída (Pagar)</MenuItem>
            </TextField>
            
            <TextField 
              label="Descrição" 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})}
              fullWidth 
            />
            
            <Box display="flex" gap={2}>
              <TextField 
                label="Valor Total" 
                type="number" 
                value={formData.valor} 
                onChange={e => setFormData({...formData, valor: e.target.value})}
                fullWidth 
              />
              {!editItem && (
                <TextField 
                  label="Parcelas" 
                  type="number" 
                  value={formData.parcelas} 
                  onChange={e => setFormData({...formData, parcelas: e.target.value})}
                  sx={{ width: 120 }}
                  inputProps={{ min: 1 }}
                />
              )}
            </Box>
            
            <TextField 
              label="Data de Vencimento" 
              type="date" 
              value={formData.data_vencimento} 
              onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
              fullWidth 
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField 
              select 
              label="Status" 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              fullWidth
            >
              <MenuItem value="Pendente">Pendente</MenuItem>
              <MenuItem value="Pago">Pago / Recebido</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE PARCELAMENTO */}
      <Dialog open={installmentDialogOpen} onClose={() => setInstallmentDialogOpen(false)}>
        <DialogTitle>Confirmação de Valor</DialogTitle>
        <DialogContent>
          <Typography>
            O valor informado (R$ {Number(formData.valor).toFixed(2)}) refere-se a <b>CADA PARCELA</b> ou ao <b>VALOR TOTAL</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallmentDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={() => handleInstallmentChoice(false)} color="primary">NÃO (Valor Total)</Button>
          <Button onClick={() => handleInstallmentChoice(true)} variant="contained" color="primary">SIM (Parcela)</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}