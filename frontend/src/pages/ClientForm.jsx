import { useState, useEffect } from "react";
import api from "../services/api";
import { Box, Button, TextField, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, Container, Grid, IconButton } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

export default function ClientForm() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [listaClientes, setListaClientes] = useState([]);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    carregarLista();
  }, []);

  function carregarLista() {
    api.get("/clientes").then(res => setListaClientes(Array.isArray(res.data) ? res.data : []));
  }

  async function salvarCliente() {
    if (!nome) {
      alert("O nome é obrigatório.");
      return;
    }

    const payload = { nome, telefone, endereco, numero, complemento, bairro, cidade };

    try {
      if (editId) {
        await api.put(`/clientes/${editId}`, payload);
        alert("Cliente atualizado!");
      } else {
        await api.post("/clientes", payload);
        alert("Cliente cadastrado!");
      }
      limparFormulario();
      carregarLista();
    } catch (err) {
      alert("Erro ao salvar cliente.");
    }
  }

  function limparFormulario() {
    setNome(""); setTelefone(""); setEndereco(""); setNumero(""); setComplemento(""); setBairro(""); setCidade("");
    setEditId(null);
  }

  function handleEdit(cli) {
    setEditId(cli.id);
    setNome(cli.nome);
    setTelefone(cli.telefone || "");
    setEndereco(cli.endereco || "");
    setNumero(cli.numero || "");
    setComplemento(cli.complemento || "");
    setBairro(cli.bairro || "");
    setCidade(cli.cidade || "");
  }

  async function handleDelete(id) {
    if (!confirm("Deseja excluir este cliente?")) return;
    try {
      await api.delete(`/clientes/${id}`);
      carregarLista();
    } catch (err) {
      alert("Erro ao excluir.");
    }
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">{editId ? "Editar Cliente" : "Novo Cliente"}</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField label="Nome Completo" fullWidth value={nome} onChange={(e) => setNome(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Telefone" fullWidth value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </Grid>
          
          <Grid item xs={12} md={10}>
            <TextField label="Endereço" fullWidth value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="Número" fullWidth value={numero} onChange={(e) => setNumero(e.target.value)} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField label="Complemento" fullWidth value={complemento} onChange={(e) => setComplemento(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Bairro" fullWidth value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Cidade" fullWidth value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <Button variant="contained" fullWidth size="large" onClick={salvarCliente} sx={{ mt: 2 }}>
                {editId ? "Atualizar" : "Cadastrar"}
              </Button>
              {editId && (
                <Button variant="outlined" fullWidth size="large" onClick={limparFormulario} sx={{ mt: 2 }}>
                  CANCELAR
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" mb={2} fontWeight="bold">Clientes Recentes</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Cidade</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listaClientes.slice(0, 5).map((cli) => (
              <TableRow key={cli.id}>
                <TableCell>{cli.nome}</TableCell>
                <TableCell>{cli.telefone}</TableCell>
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
    </Container>
  );
}