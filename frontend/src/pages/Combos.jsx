import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { 
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Container, IconButton, TextField, Tooltip 
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";

export default function Combos() {
  const [combos, setCombos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    carregarCombos();
  }, []);

  function carregarCombos() {
    api.get("/combos").then(res => setCombos(Array.isArray(res.data) ? res.data : []));
  }

  async function handleDelete(id) {
    if (!confirm("Deseja excluir este combo?")) return;
    try {
      await api.delete(`/combos/${id}`);
      carregarCombos();
    } catch (err) {
      alert("Erro ao excluir combo");
    }
  }

  return (
    <Container maxWidth="md">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Combos</Typography>
        <Button variant="contained" startIcon={<Add />} component={Link} to="/combos/novo">Novo Combo</Button>
      </Box>

      <TextField 
        label="Buscar Combo" 
        variant="outlined" 
        fullWidth 
        sx={{ mb: 3 }} 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Paper>
        <Table>
          <TableHead><TableRow><TableCell>Imagem</TableCell><TableCell>Nome</TableCell><TableCell align="right">Preço Venda</TableCell><TableCell align="center">Ações</TableCell></TableRow></TableHead>
          <TableBody>
            {combos.filter(combo => combo.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((combo) => (
              <TableRow key={combo.id}>
                <TableCell>
                  {combo.imagem ? (
                    <Tooltip title={<img src={combo.imagem} alt={combo.nome} style={{ width: 200, height: 200, objectFit: 'cover' }} />} arrow>
                      <img src={combo.imagem} alt={combo.nome} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, cursor: 'zoom-in' }} />
                    </Tooltip>
                  ) : '-'}
                </TableCell>
                <TableCell>{combo.nome}</TableCell>
                <TableCell align="right">R$ {Number(combo.preco_venda).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" component={Link} to={`/combos/${combo.id}`}>
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(combo.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}