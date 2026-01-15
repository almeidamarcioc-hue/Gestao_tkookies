import { useState, useEffect } from "react";
import api from "../services/api";
import { Box, Button, TextField, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, FormControlLabel, Checkbox, Container } from "@mui/material";

export default function IngredientForm() {
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("");
  const [custo, setCusto] = useState("");
  const [estoque, setEstoque] = useState("");
  const [listaIngredientes, setListaIngredientes] = useState([]);
  const [usadoParaRevenda, setUsadoParaRevenda] = useState(true);

  useEffect(() => {
    carregarLista();
  }, []);

  function carregarLista() {
    api.get("/ingredientes").then(res => setListaIngredientes(Array.isArray(res.data) ? res.data : []));
  }

  async function salvarIngrediente() {
    if (!nome || !custo || !estoque) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    const payload = {
      nome,
      unidade: unidade || "g",
      custo: Number(custo),
      estoque: Number(estoque),
      usado_para_revenda: usadoParaRevenda
    };

    try {
      await api.post("/ingredientes", payload);
      alert("Ingrediente cadastrado!");
      setNome(""); setUnidade(""); setCusto(""); setEstoque(""); setUsadoParaRevenda(true);
      carregarLista();
    } catch (err) {
      alert("Erro ao salvar ingrediente.");
    }
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">Novo Ingrediente</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <TextField label="Nome do Ingrediente" fullWidth value={nome} onChange={(e) => setNome(e.target.value)} sx={{ mb: 2 }} />
        <Box display="flex" gap={2} mb={2}>
          <TextField label="Unidade (ex: g, kg, un)" fullWidth value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          <TextField label="Custo da Embalagem" type="number" fullWidth value={custo} onChange={(e) => setCusto(e.target.value)} />
        </Box>
        <TextField label="Peso/Qtd na Embalagem" type="number" fullWidth value={estoque} onChange={(e) => setEstoque(e.target.value)} sx={{ mb: 3 }} />
        
        <FormControlLabel 
          control={<Checkbox checked={usadoParaRevenda} onChange={(e) => setUsadoParaRevenda(e.target.checked)} />} 
          label="Usado para revenda?" 
        />

        <Button variant="contained" fullWidth onClick={salvarIngrediente}>CADASTRAR</Button>
      </Paper>

      <Typography variant="h5" mb={2} mt={4} fontWeight="bold">Ingredientes Já Cadastrados</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Unidade</TableCell>
              <TableCell>Qtd Emb.</TableCell>
              <TableCell>Custo</TableCell>
              <TableCell>Revenda?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listaIngredientes.map((ing) => (
              <TableRow key={ing.id}>
                <TableCell>{ing.nome}</TableCell>
                <TableCell>{ing.unidade}</TableCell>
                <TableCell>{ing.estoque}</TableCell>
                <TableCell>R$ {Number(ing.custo).toFixed(2)}</TableCell>
                <TableCell>{ing.usado_para_revenda ? "Sim" : "Não"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}