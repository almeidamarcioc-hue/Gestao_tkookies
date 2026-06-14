import { useState } from "react";
import api from "../services/api";
import {
  Box, Typography, Paper, TextField, Button, Grid, Table, TableBody, TableCell,
  TableHead, TableRow, Container, Alert
} from "@mui/material";
import { Search, BarChart } from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function BestSellersReport() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  async function gerarRelatorio() {
    setLoading(true);
    try {
      const res = await api.get(`/relatorios/top-produtos?startDate=${startDate}&endDate=${endDate}`);
      setReportData(res.data);
    } catch (error) {
      alert("Erro ao gerar relatório");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Produtos mais vendidos de ${new Date(startDate + 'T00:00:00').toLocaleDateString()} a ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`,
      },
    },
  };

  const chartData = {
    labels: reportData.map(item => item.nome),
    datasets: [
      {
        label: 'Quantidade Vendida',
        data: reportData.map(item => item.total_vendido),
        backgroundColor: 'rgba(78, 52, 46, 0.7)',
        borderColor: 'rgba(78, 52, 46, 1)',
        borderWidth: 1,
      },
    ],
  };

  const produtosEncalhados = reportData.filter(item => Number(item.total_vendido) === 0 && Number(item.estoque_atual) > 0);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" mb={3} fontWeight="bold" display="flex" alignItems="center" gap={1}>
        <BarChart fontSize="large" color="primary" /> Sabores mais Amados (Top Produtos)
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
              {loading ? "Gerando..." : "Gerar Relatório"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {reportData.length > 0 && (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Bar options={chartOptions} data={chartData} />
          </Paper>

          {/* Tabela detalhada */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">Detalhamento por Produto</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: 40 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Produto</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qtd Vendida</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Receita Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Estoque Atual</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((item, i) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{i + 1}</Typography>
                    </TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell align="right">{Number(item.total_vendido).toLocaleString('pt-BR')}</TableCell>
                    <TableCell align="right">
                      R$ {Number(item.receita_total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">{Number(item.estoque_atual).toLocaleString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {produtosEncalhados.length > 0 && (
            <Alert severity="warning" sx={{ mb: 4 }}>
              <Typography fontWeight="bold">Atenção! Produtos com estoque mas sem vendas no período:</Typography>
              <ul>
                {produtosEncalhados.map(p => <li key={p.id}>{p.nome} (Estoque: {p.estoque_atual})</li>)}
              </ul>
            </Alert>
          )}
        </>
      )}
    </Container>
  );
}