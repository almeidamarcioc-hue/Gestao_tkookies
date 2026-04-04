import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, CircularProgress, Alert, Box, Chip
} from "@mui/material";

export default function RelatorioUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    try {
      setLoading(true);
      // Chamada ao novo endpoint de relatórios
      const res = await api.get("/relatorios/usuarios");
      setUsuarios(res.data);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
      setError("Não foi possível carregar os dados. Verifique sua conexão ou permissões de acesso.");
    } finally {
      setLoading(false);
    }
  }

  const renderNivelAcesso = (role) => {
    const config = {
      admin: { label: "Administrador", color: "primary" },
      vendedor: { label: "Vendedor", color: "success" },
      producao: { label: "Produção", color: "warning" }
    };
    const current = config[role?.toLowerCase()] || { label: role, color: "default" };
    return <Chip label={current.label} color={current.color} size="small" variant="outlined" />;
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold">Relatório de Usuários</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Dados de acesso e níveis de permissão dos colaboradores.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Nome</strong></TableCell>
              <TableCell><strong>E-mail / Login</strong></TableCell>
              <TableCell><strong>Nível de Acesso</strong></TableCell>
              <TableCell><strong>Data Cadastro</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.length > 0 ? (
              usuarios.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.id}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{renderNivelAcesso(u.role)}</TableCell>
                  <TableCell>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  Nenhum usuário cadastrado no sistema.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}