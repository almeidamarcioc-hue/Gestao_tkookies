import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Container, TextField, Dialog, DialogTitle, DialogContent, DialogActions 
} from "@mui/material";
import { Add } from "@mui/icons-material";

export default function Inventory() {
  const [produtos, setProdutos] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState(null);
  const [qtdLancamento, setQtdLancamento] = useState("");

  useEffect(() => {
    carregarEstoque();
  }, []);

  function carregarEstoque() {
    api.get("/estoque").then(res => setProdutos(Array.isArray(res.data) ? res.data : []));
  }

  function handleOpenLancamento(prod) {
    setSelectedProd(prod);
    setQtdLancamento("");
    setOpen(true);
  }

  async function handleSalvarLancamento() {
    if (!qtdLancamento || isNaN(qtdLancamento)) return alert("Informe uma quantidade válida");
    
    try {
      await api.post("/estoque/lancar", {
        produto_id: selectedProd.id,
        quantidade: Number(qtdLancamento)
      });
      alert("Estoque atualizado!");
      setOpen(false);
      carregarEstoque();
    } catch (err) {
      alert("Erro ao lançar estoque");
    }
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">Controle de Estoque</Typography>
      
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produto</TableCell>
              <TableCell align="right">Preço Venda</TableCell>
              <TableCell align="center">Estoque Atual</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtos.map((prod) => (
              <TableRow key={prod.id}>
                <TableCell>{prod.nome}</TableCell>
                <TableCell align="right">R$ {Number(prod.preco_venda).toFixed(2)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: Number(prod.estoque) < 0 ? 'error.main' : 'inherit' }}>
                  {Number(prod.estoque)}
                </TableCell>
                <TableCell align="center">
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => handleOpenLancamento(prod)}>
                    Lançar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Lançar Estoque - {selectedProd?.nome}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Informe a quantidade a ser adicionada ao estoque atual ({selectedProd?.estoque}). 
            Use números negativos para ajustes de perda.
          </Typography>
          <TextField 
            autoFocus
            label="Quantidade"
            type="number"
            fullWidth
            value={qtdLancamento}
            onChange={(e) => setQtdLancamento(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSalvarLancamento}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}