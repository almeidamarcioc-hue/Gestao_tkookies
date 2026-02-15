import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Container,
  TextField,
  Grid,
  Button,
  CircularProgress
} from "@mui/material";
import { ArrowBack, CheckCircle } from "@mui/icons-material";

export default function ProductionRecipe() {
  const { id } = useParams();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantidadeProduzir, setQuantidadeProduzir] = useState(1); // Default to 1 batch
  const [producing, setProducing] = useState(false);

  useEffect(() => {
    api.get(`/produtos/${id}`)
      .then(res => {
        setProduto(res.data);
        // Default production quantity to the recipe's yield
        setQuantidadeProduzir(res.data.rendimento || 1);
      })
      .catch(err => console.error("Erro ao carregar produto", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleProduzir = async () => {
    if (!quantidadeProduzir || Number(quantidadeProduzir) <= 0) {
      alert("Informe uma quantidade válida para produzir.");
      return;
    }

    if (!confirm(`Confirma a produção de ${quantidadeProduzir} unidades de ${produto.nome}? Isso descontará os ingredientes do estoque.`)) return;

    setProducing(true);
    try {
      const res = await api.post("/estoque/produzir", {
        produto_id: produto.id,
        quantidade: Number(quantidadeProduzir)
      });
      alert(res.data.message);
    } catch (err) {
      alert("Erro ao registrar produção: " + (err.response?.data?.error || err.message));
    } finally {
      setProducing(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <CircularProgress />
        <Typography>Carregando receita...</Typography>
      </Container>
    );
  }

  if (!produto) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h5" color="error">Produto não encontrado.</Typography>
        <Button component={Link} to="/producao" startIcon={<ArrowBack />} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Container>
    );
  }

  const rendimentoReceita = Number(produto.rendimento) || 1;

  return (
    <Container maxWidth="lg">
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button component={Link} to="/producao" variant="outlined" startIcon={<ArrowBack />}>
          Voltar
        </Button>
        <Typography variant="h4" fontWeight="bold">
          Receita: {produto.nome}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              label="Quantidade a Produzir (unidades)"
              type="number"
              fullWidth
              value={quantidadeProduzir}
              onChange={(e) => setQuantidadeProduzir(Number(e.target.value))}
              helperText={`A receita rende ${rendimentoReceita} unidades.`}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography variant="h6">
              Para produzir <strong>{quantidadeProduzir}</strong> unidades, você precisará de:
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Ingrediente</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qtd. por Receita</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#EFEBE9' }}>Total Necessário</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produto.ingredientes && produto.ingredientes.map((ing) => {
              const qtdPorReceita = Number(ing.quantidade);
              const qtdPorUnidade = qtdPorReceita / rendimentoReceita;
              const totalNecessario = qtdPorUnidade * quantidadeProduzir;

              return (
                <TableRow key={ing.ingrediente_id}>
                  <TableCell>{ing.nome}</TableCell>
                  <TableCell align="right">{`${qtdPorReceita.toFixed(2)} ${ing.unidade}`}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#EFEBE9' }}>
                    {`${totalNecessario.toFixed(2)} ${ing.unidade}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Button 
        variant="contained" 
        color="success" 
        size="large" 
        fullWidth
        onClick={handleProduzir}
        disabled={producing}
        startIcon={producing ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
        sx={{ mt: 2, py: 2, fontSize: '1.1rem', borderRadius: 2 }}
      >
        {producing ? "Registrando..." : "Confirmar Produção e Atualizar Estoque"}
      </Button>
    </Container>
  );
}