import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, Container, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid 
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

export default function Resellers() {
  const [revendedores, setRevendedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    carregarRevendedores();
  }, []);

  function carregarRevendedores() {
    api.get("/revendedores")
      .then(res => setRevendedores(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Erro ao carregar revendedores", err));
  }

  function handleEdit(item) {
    setEditItem({ ...item });
    setOpen(true);
  }

  async function handleSaveEdit() {
    try {
      await api.put(`/revendedores/${editItem.id}`, editItem);
      alert("Revendedor atualizado!");
      setOpen(false);
      carregarRevendedores();
    } catch (err) {
      alert("Erro ao atualizar.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Deseja excluir este revendedor?")) return;
    try {
      await api.delete(`/revendedores/${id}`);
      carregarRevendedores();
    } catch (err) {
      alert("Erro ao excluir.");
    }
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" mb={3} fontWeight="bold">Revendedores Parceiros</Typography>
      
      <TextField 
        label="Buscar Revendedor" 
        variant="outlined" 
        fullWidth 
        sx={{ mb: 3 }} 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Paper sx={{ width: '100%', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Razão Social</TableCell>
              <TableCell>Contato</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Cidade/UF</TableCell>
              <TableCell>CNPJ/CPF</TableCell>
              <TableCell>Data Cadastro</TableCell>
              <TableCell>Acesso</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {revendedores.filter(r => r.razao_social.toLowerCase().includes(searchTerm.toLowerCase())).map((rev) => (
              <TableRow key={rev.id}>
                <TableCell>{rev.razao_social}</TableCell>
                <TableCell>{rev.nome_contato}</TableCell>
                <TableCell>{rev.telefone}</TableCell>
                <TableCell>{rev.cidade} - {rev.estado}</TableCell>
                <TableCell>{rev.cpf_cnpj}</TableCell>
                <TableCell>{new Date(rev.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{rev.login ? "Sim" : "Não"}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleEdit(rev)}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(rev.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {revendedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">Nenhum revendedor cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal de Edição */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Revendedor</DialogTitle>
        <DialogContent>
          {editItem && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField label="Razão Social" fullWidth value={editItem.razao_social} onChange={e => setEditItem({...editItem, razao_social: e.target.value})} /></Grid>
                <Grid item xs={12} md={6}><TextField label="CPF/CNPJ" fullWidth value={editItem.cpf_cnpj} onChange={e => setEditItem({...editItem, cpf_cnpj: e.target.value})} /></Grid>
                <Grid item xs={12} md={6}><TextField label="Nome Contato" fullWidth value={editItem.nome_contato} onChange={e => setEditItem({...editItem, nome_contato: e.target.value})} /></Grid>
                <Grid item xs={12} md={6}><TextField label="Telefone" fullWidth value={editItem.telefone} onChange={e => setEditItem({...editItem, telefone: e.target.value})} /></Grid>
                <Grid item xs={12} md={4}><TextField label="CEP" fullWidth value={editItem.cep} onChange={e => setEditItem({...editItem, cep: e.target.value})} /></Grid>
                <Grid item xs={12} md={6}><TextField label="Cidade" fullWidth value={editItem.cidade} onChange={e => setEditItem({...editItem, cidade: e.target.value})} /></Grid>
                <Grid item xs={12} md={2}><TextField label="UF" fullWidth value={editItem.estado} onChange={e => setEditItem({...editItem, estado: e.target.value})} /></Grid>
                
                <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'primary.main' }}>Dados de Acesso (Área do Parceiro)</Typography></Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Login de Acesso" fullWidth value={editItem.login || ""} onChange={e => setEditItem({...editItem, login: e.target.value})} placeholder="Ex: revenda.loja" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Senha" type="password" fullWidth value={editItem.senha || ""} onChange={e => setEditItem({...editItem, senha: e.target.value})} placeholder="******" />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}