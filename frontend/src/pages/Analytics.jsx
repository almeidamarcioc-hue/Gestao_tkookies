import { useState, useEffect } from "react";
import {
  Box, Container, Typography, Grid, Paper, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Table, TableHead,
  TableBody, TableRow, TableCell
} from "@mui/material";
import {
  People, Visibility, TrendingUp, PhoneAndroid,
  Timeline, TrafficOutlined
} from "@mui/icons-material";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import api from "../services/api";

const COLORS = ["#4E342E", "#E65100", "#FFCC80", "#8D6E63", "#A5D6A7", "#EF9A9A", "#90CAF9", "#CE93D8"];

const StatCard = ({ icon, label, value, unit }) => (
  <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(78,52,46,0.08)' }}>
    <Box sx={{ bgcolor: '#FFF3E0', borderRadius: 2, p: 1.5, color: '#E65100' }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Typography>
      <Typography variant="h5" fontWeight="bold" sx={{ color: '#4E342E' }}>
        {value} {unit && <Typography component="span" variant="body2" color="text.secondary">{unit}</Typography>}
      </Typography>
    </Box>
  </Paper>
);

const formatDate = (d) => `${d.slice(6,8)}/${d.slice(4,6)}`;
const formatDuration = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [sessionsByDay, setSessionsByDay] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [trafficSources, setTrafficSources] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get(`/analytics/overview?days=${days}`),
      api.get(`/analytics/sessions-by-day?days=${days}`),
      api.get(`/analytics/top-pages?days=${days}`),
      api.get(`/analytics/traffic-sources?days=${days}`),
      api.get(`/analytics/devices?days=${days}`),
    ]).then(([ov, sbd, tp, ts, dv]) => {
      setOverview(ov.data);
      setSessionsByDay(sbd.data);
      setTopPages(tp.data);
      setTrafficSources(ts.data);
      setDevices(dv.data);
    }).catch(err => {
      setError(err.response?.data?.error || "Erro ao carregar dados do Analytics.");
    }).finally(() => setLoading(false));
  }, [days]);

  return (
    <Container maxWidth="xl">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#4E342E' }}>
          Google Analytics
        </Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Período</InputLabel>
          <Select value={days} label="Período" onChange={e => setDays(e.target.value)}>
            <MenuItem value={7}>Últimos 7 dias</MenuItem>
            <MenuItem value={30}>Últimos 30 dias</MenuItem>
            <MenuItem value={90}>Últimos 90 dias</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
      )}

      {error && (
        <Paper sx={{ p: 3, bgcolor: '#FFF3E0', borderRadius: 3 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {!loading && !error && overview && (
        <>
          {/* Cartões de visão geral */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<People />} label="Usuários Ativos" value={overview.users.toLocaleString()} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<TrendingUp />} label="Sessões" value={overview.sessions.toLocaleString()} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<Visibility />} label="Visualizações" value={overview.pageViews.toLocaleString()} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<Timeline />} label="Duração Média" value={formatDuration(Number(overview.avgSessionDuration))} />
            </Grid>
          </Grid>

          {/* Sessões por dia */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>Sessões por Dia</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={sessionsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e4" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={v => `Data: ${formatDate(v)}`} />
                <Legend />
                <Line type="monotone" dataKey="sessions" stroke="#E65100" strokeWidth={2} dot={false} name="Sessões" />
                <Line type="monotone" dataKey="users" stroke="#4E342E" strokeWidth={2} dot={false} name="Usuários" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Grid container spacing={3} mb={3}>
            {/* Origem do tráfego */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>
                  <TrafficOutlined sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Origem do Tráfego
                </Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={trafficSources} dataKey="sessions" nameKey="source" cx="50%" cy="50%" outerRadius={90} label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {trafficSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Sessões']} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Dispositivos */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>
                  <PhoneAndroid sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Dispositivos
                </Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={devices} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="device" type="category" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="sessions" name="Sessões" radius={4}>
                      {devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Taxa de rejeição */}
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>Taxa de Rejeição</Typography>
                <Typography variant="h2" fontWeight="900" sx={{ color: Number(overview.bounceRate) > 60 ? '#E53935' : '#43A047' }}>
                  {overview.bounceRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1} textAlign="center">
                  {Number(overview.bounceRate) > 60 ? 'Acima da média — revise o conteúdo' : 'Dentro do esperado'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Páginas mais acessadas */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2} sx={{ color: '#4E342E' }}>Páginas Mais Acessadas</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Página</TableCell>
                  <TableCell align="right">Visualizações</TableCell>
                  <TableCell align="right">Usuários</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topPages.map((p, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ color: '#BDBDBD', fontWeight: 'bold' }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{p.page}</TableCell>
                    <TableCell align="right">{p.views.toLocaleString()}</TableCell>
                    <TableCell align="right">{p.users.toLocaleString()}</TableCell>
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
