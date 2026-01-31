import { useState, useEffect } from "react";
import api from "../services/api";
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, Container, TextField 
} from "@mui/material";

export default function Resellers() {
  const [revendedores, setRevendedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api.get("/revendedores")
      .then(res => setRevendedores(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Erro ao carregar revendedores", err));
  }, []);

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
              </TableRow>
            ))}
            {revendedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">Nenhum revendedor cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}