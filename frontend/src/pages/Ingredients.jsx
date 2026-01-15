import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, Container 
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

export default function Ingredients() {
  const [ingredientes, setIngredientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    carregarIngredientes();
  }, []);

  function carregarIngredientes() {
    api.get("/ingredientes").then(res => setIngredientes(res.data));
  }

  function handleEdit(item) {
    setEditItem({ ...item });
    setOpen(true);
  }

  async function handleSaveEdit() {
    try {
      await api.put(`/ingredientes/${editItem.id}`, editItem);
      alert("Ingrediente atualizado!");
      setOpen(false);
      carregarIngredientes();
    } catch (err) {
      alert("Erro ao atualizar.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Deseja excluir este ingrediente?")) return;
    try {
      await api.delete(`/ingredientes/${id}`);
      carregarIngredientes();
    } catch (err) {
      alert("Erro ao excluir.");
    }
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" mb={3} fontWeight="bold">Consulta de Ingredientes</Typography>
      
      <TextField 
        label="Buscar Ingrediente" 
        variant="outlined" 
        fullWidth 
        sx={{ mb: 3 }} 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Unidade</TableCell>
              <TableCell>Custo Emb.</TableCell>
              <TableCell>Qtd Emb.</TableCell>
              <TableCell>Revenda?</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredientes
              .filter(ing => ing.nome.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(ing => (
              <TableRow key={ing.id}>
                <TableCell>{ing.nome}</TableCell>
                <TableCell>{ing.unidade}</TableCell>
                <TableCell>R$ {Number(ing.custo).toFixed(2)}</TableCell>
                <TableCell>{ing.estoque}</TableCell>
                <TableCell>{ing.usado_para_revenda ? "Sim" : "Não"}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleEdit(ing)}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(ing.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal de Edição */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Editar Ingrediente</DialogTitle>
        <DialogContent>
          {editItem && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
              <TextField 
                label="Nome" fullWidth value={editItem.nome} 
                onChange={e => setEditItem({...editItem, nome: e.target.value})} 
              />
              <TextField 
                label="Unidade" fullWidth value={editItem.unidade} 
                onChange={e => setEditItem({...editItem, unidade: e.target.value})} 
              />
              <TextField 
                label="Custo Embalagem" type="number" fullWidth value={editItem.custo} 
                onChange={e => setEditItem({...editItem, custo: e.target.value})} 
              />
              <TextField 
                label="Qtd Embalagem" type="number" fullWidth value={editItem.estoque} 
                onChange={e => setEditItem({...editItem, estoque: e.target.value})} 
              />
              <FormControlLabel 
                control={<Checkbox checked={editItem.usado_para_revenda || false} onChange={(e) => setEditItem({...editItem, usado_para_revenda: e.target.checked})} />} 
                label="Usado para revenda?" 
              />
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