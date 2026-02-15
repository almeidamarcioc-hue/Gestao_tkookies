import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Button,
  TextField
} from "@mui/material";
import { Kitchen } from "@mui/icons-material";

export default function Production() {
  const [produtos, setProdutos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api.get("/produtos").then((res) => {
      setProdutos(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">Produção</Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Selecione um produto para ver a receita e calcular os ingredientes necessários para a produção.
      </Typography>

      <TextField
        label="Buscar Produto"
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
              <TableCell>Produto</TableCell>
              <TableCell align="center">Estoque Atual</TableCell>
              <TableCell align="center">Ação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtos
              .filter(prod => prod.nome.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell>{prod.nome}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Number(prod.estoque)}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      component={Link}
                      to={`/producao/${prod.id}`}
                      startIcon={<Kitchen />}
                    >
                      Ver Receita
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}