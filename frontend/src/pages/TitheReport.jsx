import { useState } from "react";
import api from "../services/api";
import { 
  Box, Typography, Paper, TextField, Button, Grid, Table, TableBody, TableCell, 
  TableHead, TableRow, Container, Card, CardContent
} from "@mui/material";
import { Search, VolunteerActivism } from "@mui/icons-material";

export default function TitheReport() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function gerarRelatorio() {
    setLoading(true);
    try {
      const res = await api.get(`/relatorios/dizimo?startDate=${startDate}&endDate=${endDate}`);
      setReportData(res.data);
    } catch (error) {
      alert("Erro ao gerar relatório");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (val) => `R$ ${Number(val).toFixed(2)}`;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" mb={3} fontWeight="bold" display="flex" alignItems="center" gap={1}>
        <VolunteerActivism fontSize="large" color="primary" /> Relatório de Dízimo
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField 
              label="Data Inicial" type="date" fullWidth 
              InputLabelProps={{ shrink: true }} 
              value={startDate} onChange={e => setStartDate(e.target.value)} 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField 
              label="Data Final" type="date" fullWidth 
              InputLabelProps={{ shrink: true }} 
              value={endDate} onChange={e => setEndDate(e.target.value)} 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              variant="contained" fullWidth size="large" 
              startIcon={<Search />} onClick={gerarRelatorio}
              disabled={loading}
            >
              {loading ? "Calculando..." : "Gerar Relatório"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {reportData && (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Vendas</Typography>
                  <Typography variant="h5" fontWeight="bold">{formatMoney(reportData.resumo.total_vendas)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#ffebee' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Custo Estimado</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error">{formatMoney(reportData.resumo.total_custo)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Lucro Operacional</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">{formatMoney(reportData.resumo.lucro_operacional)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#fff8e1', border: '2px solid #ffb300' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom fontWeight="bold">Dízimo (10%)</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary">{formatMoney(reportData.resumo.valor_dizimo)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>Detalhamento por Produto</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="center">Qtd Vendida</TableCell>
                  <TableCell align="right">Total Venda</TableCell>
                  <TableCell align="right">Custo Total</TableCell>
                  <TableCell align="right">Lucro</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.detalhes.map((item) => (
                  <TableRow key={`${item.id}-${item.tipo_cliente}`}>
                    <TableCell>{item.nome_display || item.nome}</TableCell>
                    <TableCell align="center">{item.qtd_vendida}</TableCell>
                    <TableCell align="right">{formatMoney(item.total_venda)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{formatMoney(item.custo_total)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>{formatMoney(item.lucro)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Container>
  );
}