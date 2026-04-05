import { useState } from "react";
import api from "../services/api";
import {
  Box, Typography, Paper, TextField, Button, Grid, Container,
  Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, Chip
} from "@mui/material";
import { Search, EmojiEvents, TrendingDown, Person, Inventory } from "@mui/icons-material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const COLORS_TOP = ["#E65100", "#EF6C00", "#F57C00", "#FB8C00", "#FFA726", "#FFB74D", "#FFCC80", "#FFE0B2", "#FFF3E0", "#FFF8F0"];
const COLORS_LOW = ["#6D4C41", "#795548", "#8D6E63", "#A1887F", "#BCAAA4", "#D7CCC8", "#EFEBE9", "#F5F0EE", "#FAF7F6", "#FDFCFC"];

const fmtMoney = (v) => `R$ ${Number(v).toFixed(2)}`;
const fmtNum = (v) => Number(v).toLocaleString('pt-BR');

function RankingTable({ data, cols }) {
  if (!data.length) return (
    <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
      Nenhum dado encontrado para o período selecionado.
    </Typography>
  );
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', width: 40 }}>#</TableCell>
          {cols.map(c => <TableCell key={c.key} align={c.align || 'left'} sx={{ fontWeight: 'bold' }}>{c.label}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={row.id} hover>
            <TableCell>
              {i < 3
                ? <Chip label={i + 1} size="small" sx={{ bgcolor: COLORS_TOP[i], color: '#fff', fontWeight: 'bold', minWidth: 28 }} />
                : <Typography variant="body2" color="text.secondary">{i + 1}</Typography>}
            </TableCell>
            {cols.map(c => (
              <TableCell key={c.key} align={c.align || 'left'}>
                {c.format ? c.format(row[c.key]) : row[c.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BarSection({ data, nameKey, valueKey, title, colors }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe8" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v, n) => [typeof v === 'number' && n.includes('gasto') ? fmtMoney(v) : fmtNum(v), title]} />
        <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const tabs = [
  { label: "Top Clientes", icon: <EmojiEvents fontSize="small" />, key: "top-clientes" },
  { label: "Clientes Inativos", icon: <Person fontSize="small" />, key: "clientes-inativos" },
  { label: "Top Produtos", icon: <EmojiEvents fontSize="small" />, key: "top-produtos" },
  { label: "Produtos Parados", icon: <Inventory fontSize="small" />, key: "produtos-parados" },
];

const colsTopClientes = [
  { key: "nome", label: "Cliente" },
  { key: "telefone", label: "Telefone" },
  { key: "total_pedidos", label: "Pedidos", align: "right", format: fmtNum },
  { key: "total_gasto", label: "Total Gasto", align: "right", format: fmtMoney },
];
const colsClientesInativos = [
  { key: "nome", label: "Cliente" },
  { key: "telefone", label: "Telefone" },
  { key: "total_pedidos", label: "Pedidos", align: "right", format: fmtNum },
  { key: "total_gasto", label: "Total Gasto", align: "right", format: fmtMoney },
];
const colsTopProdutos = [
  { key: "nome", label: "Produto" },
  { key: "total_vendido", label: "Qtd Vendida", align: "right", format: fmtNum },
  { key: "estoque_atual", label: "Estoque Atual", align: "right", format: fmtNum },
];
const colsProdutosParados = [
  { key: "nome", label: "Produto" },
  { key: "total_vendido", label: "Qtd Vendida", align: "right", format: fmtNum },
  { key: "estoque_atual", label: "Estoque Atual", align: "right", format: fmtNum },
];

export default function RelatorioRanking() {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(inicioMes);
  const [endDate, setEndDate] = useState(hoje);
  const [tab, setTab] = useState(0);
  const [data, setData] = useState({ "top-clientes": [], "clientes-inativos": [], "top-produtos": [], "produtos-parados": [] });
  const [loading, setLoading] = useState(false);

  async function gerarRelatorio() {
    setLoading(true);
    try {
      const [tc, ci, tp, pp] = await Promise.all([
        api.get(`/relatorios/top-clientes?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/relatorios/clientes-inativos?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/relatorios/top-produtos?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/relatorios/produtos-parados?startDate=${startDate}&endDate=${endDate}`),
      ]);
      setData({
        "top-clientes": tc.data,
        "clientes-inativos": ci.data,
        "top-produtos": tp.data,
        "produtos-parados": pp.data,
      });
    } catch (err) {
      alert("Erro ao gerar relatório: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  const currentKey = tabs[tab].key;
  const currentData = data[currentKey];
  const isTopClientes = currentKey === "top-clientes";
  const isClientesInativos = currentKey === "clientes-inativos";
  const isTopProdutos = currentKey === "top-produtos";
  const isProdutosParados = currentKey === "produtos-parados";

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" mb={3} fontWeight="bold" sx={{ color: '#4E342E' }}>
        Ranking de Clientes e Produtos
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField label="Data Inicial" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Data Final" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={endDate} onChange={e => setEndDate(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button variant="contained" fullWidth size="large" startIcon={<Search />}
              onClick={gerarRelatorio} disabled={loading}
              sx={{ bgcolor: '#4E342E', '&:hover': { bgcolor: '#3E2723' } }}>
              {loading ? "Gerando..." : "Gerar Relatório"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {currentData.length > 0 || loading ? (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}
            TabIndicatorProps={{ style: { backgroundColor: '#E65100' } }}>
            {tabs.map((t, i) => (
              <Tab key={t.key} icon={t.icon} iconPosition="start" label={t.label}
                sx={{ '&.Mui-selected': { color: '#E65100' } }} />
            ))}
          </Tabs>

          <Paper sx={{ p: 3, mb: 3 }}>
            {isTopClientes && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>
                  <EmojiEvents sx={{ mr: 1, color: '#E65100', verticalAlign: 'middle' }} />
                  Top 10 Clientes — Maior Valor Gasto
                </Typography>
                <BarSection data={currentData} nameKey="nome" valueKey="total_gasto"
                  title="Total Gasto" colors={COLORS_TOP} />
              </>
            )}
            {isClientesInativos && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>
                  <TrendingDown sx={{ mr: 1, color: '#8D6E63', verticalAlign: 'middle' }} />
                  Clientes que Menos Compram no Período
                </Typography>
                <BarSection data={currentData} nameKey="nome" valueKey="total_pedidos"
                  title="Pedidos" colors={COLORS_LOW} />
              </>
            )}
            {isTopProdutos && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>
                  <EmojiEvents sx={{ mr: 1, color: '#E65100', verticalAlign: 'middle' }} />
                  Top 10 Produtos — Mais Vendidos
                </Typography>
                <BarSection data={currentData} nameKey="nome" valueKey="total_vendido"
                  title="Qtd Vendida" colors={COLORS_TOP} />
              </>
            )}
            {isProdutosParados && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>
                  <TrendingDown sx={{ mr: 1, color: '#8D6E63', verticalAlign: 'middle' }} />
                  Produtos que Menos Saem
                </Typography>
                <BarSection data={currentData} nameKey="nome" valueKey="total_vendido"
                  title="Qtd Vendida" colors={COLORS_LOW} />
              </>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <RankingTable
              data={currentData}
              cols={isTopClientes ? colsTopClientes : isClientesInativos ? colsClientesInativos : isTopProdutos ? colsTopProdutos : colsProdutosParados}
            />
          </Paper>
        </>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
          <Typography>Selecione o período e clique em Gerar Relatório.</Typography>
        </Paper>
      )}
    </Container>
  );
}
