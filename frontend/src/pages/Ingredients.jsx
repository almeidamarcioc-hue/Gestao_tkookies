import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, Container, TablePagination 
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

export default function Ingredients() {
  const [ingredientes, setIngredientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      carregarIngredientes();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [page, rowsPerPage, searchTerm]);

  function carregarIngredientes() {
    const params = new URLSearchParams();
    params.append("page", page + 1);
    params.append("limit", rowsPerPage);
    if (searchTerm) params.append("search", searchTerm);

    api.get(`/ingredientes?${params.toString()}`)
      .then(res => {
        if (res.data.data) {
          setIngredientes(res.data.data);
          setTotal(res.data.total);
        } else {
          // Fallback caso o backend retorne array direto
          setIngredientes(Array.isArray(res.data) ? res.data : []);
          setTotal(Array.isArray(res.data) ? res.data.length : 0);
        }
      })
      .catch(err => console.error("Erro ao carregar ingredientes", err));
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0); // Volta para a primeira página ao pesquisar
  };

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
        onChange={handleSearchChange}
      />

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Unidade</TableCell>
              <TableCell>Custo Emb.</TableCell>
              <TableCell>Qtd Emb. (Custo)</TableCell>
              <TableCell>Estoque Atual</TableCell>
              <TableCell>Revenda?</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredientes
              .map(ing => (
              <TableRow key={ing.id}>
                <TableCell>{ing.nome}</TableCell>
                <TableCell>{ing.unidade}</TableCell>
                <TableCell>R$ {Number(ing.custo).toFixed(2)}</TableCell>
                <TableCell>{ing.estoque}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: Number(ing.estoque_atual) <= 0 ? 'error.main' : 'inherit' }}>
                  {Number(ing.estoque_atual || 0).toFixed(2)}
                </TableCell>
                <TableCell>{ing.usado_para_revenda ? "Sim" : "Não"}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleEdit(ing)}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(ing.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Itens por página"
        />
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
                label="Qtd Embalagem (Custo)" type="number" fullWidth value={editItem.estoque} 
                onChange={e => setEditItem({...editItem, estoque: e.target.value})} 
                helperText="Quantidade total que vem na embalagem comprada"
              />
              <TextField 
                label="Estoque Atual (Real)" type="number" fullWidth value={editItem.estoque_atual} 
                onChange={e => setEditItem({...editItem, estoque_atual: e.target.value})} 
                helperText="Quantidade física disponível para uso"
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