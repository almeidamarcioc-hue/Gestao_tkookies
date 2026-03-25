import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Switch, Dialog, 
  DialogTitle, DialogContent, DialogActions, Avatar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/api';

const TestimonialsManager = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    nome: '',
    cargo: '',
    texto: '',
    imagem: '',
    ativo: true
  });

  const loadData = async () => {
    try {
      const res = await api.get('/depoimentos');
      setTestimonials(res.data);
    } catch (error) {
      console.error("Erro ao carregar depoimentos", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpen = (item = null) => {
    if (item) {
      setFormData({ ...item, ativo: item.ativo === 1 || item.ativo === true });
    } else {
      setFormData({ id: null, nome: '', cargo: '', texto: '', imagem: '', ativo: true });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.texto) {
      alert("Por favor, preencha o Nome e o Texto do depoimento.");
      return;
    }

    try {
      if (formData.id) {
        await api.put(`/depoimentos/${formData.id}`, formData);
      } else {
        await api.post('/depoimentos', formData);
      }
      setOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar depoimento: ' + (error.response?.data?.details || error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir este depoimento?')) {
      try {
        await api.delete(`/depoimentos/${id}`);
        loadData();
      } catch (error) {
        alert('Erro ao excluir');
      }
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = !(currentStatus === 1 || currentStatus === true);
      await api.patch(`/depoimentos/${id}/status`, { ativo: newStatus });
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imagem: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Depoimentos</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => handleOpen()}>
          Novo Depoimento
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Foto</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Texto</TableCell>
              <TableCell>Ativo</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testimonials.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Avatar src={t.imagem} />
                </TableCell>
                <TableCell>{t.nome}</TableCell>
                <TableCell>{t.cargo}</TableCell>
                <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.texto}
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={t.ativo === 1 || t.ativo === true} 
                    onChange={() => handleToggleStatus(t.id, t.ativo)} 
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(t)} color="primary"><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(t.id)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {testimonials.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">Nenhum depoimento cadastrado</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{formData.id ? 'Editar Depoimento' : 'Novo Depoimento'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={formData.imagem} sx={{ width: 60, height: 60 }} />
              <Button variant="outlined" component="label">
                Carregar Foto
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
              </Button>
            </Box>
            
            <TextField 
              label="Nome" 
              fullWidth 
              value={formData.nome} 
              onChange={(e) => setFormData({...formData, nome: e.target.value})} 
            />
            <TextField 
              label="Cargo / Título (Ex: Revendedor SP)" 
              fullWidth 
              value={formData.cargo} 
              onChange={(e) => setFormData({...formData, cargo: e.target.value})} 
            />
            <TextField 
              label="Depoimento" 
              fullWidth 
              multiline 
              rows={3}
              value={formData.texto} 
              onChange={(e) => setFormData({...formData, texto: e.target.value})} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestimonialsManager;