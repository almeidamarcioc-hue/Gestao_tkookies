import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Container, Grid 
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

export default function Clients() {
  const [clientes, setClientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    carregarClientes();
  }, []);

  function carregarClientes() {
    api.get("/clientes").then(res => setClientes(Array.isArray(res.data) ? res.data : []));
  }

  function handleEdit(item) {
    setEditItem({ ...item });
    setOpen(true);
  }

  async function handleSaveEdit() {
    try {
      await api.put(`/clientes/${editItem.id}`, editItem);
      alert("Cliente atualizado!");
      setOpen(false);
      carregarClientes();
    } catch (err) {
      alert("Erro ao atualizar.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Deseja excluir este cliente?")) return;
    try {
      await api.delete(`/clientes/${id}`);
      carregarClientes();
    } catch (err) {
      alert("Erro ao excluir.");
    }
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" mb={3} fontWeight="bold">Consulta de Clientes</Typography>
      
      <TextField 
        label="Buscar Cliente" 
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
              <TableCell>Nome</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Endereço</TableCell>
              <TableCell>Bairro</TableCell>
              <TableCell>Cidade</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientes
              .filter(cli => cli.nome.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(cli => (
              <TableRow key={cli.id}>
                <TableCell>{cli.nome}</TableCell>
                <TableCell>{cli.telefone}</TableCell>
                <TableCell>{cli.endereco}, {cli.numero} {cli.complemento}</TableCell>
                <TableCell>{cli.bairro}</TableCell>
                <TableCell>{cli.cidade}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleEdit(cli)}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(cli.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal de Edição */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Cliente</DialogTitle>
        <DialogContent>
          {editItem && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField label="Nome" fullWidth value={editItem.nome} onChange={e => setEditItem({...editItem, nome: e.target.value})} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField label="Telefone" fullWidth value={editItem.telefone} onChange={e => setEditItem({...editItem, telefone: e.target.value})} />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField label="Endereço" fullWidth value={editItem.endereco} onChange={e => setEditItem({...editItem, endereco: e.target.value})} />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField label="Número" fullWidth value={editItem.numero} onChange={e => setEditItem({...editItem, numero: e.target.value})} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField label="Complemento" fullWidth value={editItem.complemento} onChange={e => setEditItem({...editItem, complemento: e.target.value})} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField label="Bairro" fullWidth value={editItem.bairro} onChange={e => setEditItem({...editItem, bairro: e.target.value})} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField label="Cidade" fullWidth value={editItem.cidade} onChange={e => setEditItem({...editItem, cidade: e.target.value})} /></Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Atualizar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}