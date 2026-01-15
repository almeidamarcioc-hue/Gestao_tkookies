import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, 
  Container, Grid, Autocomplete, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert 
} from "@mui/material";
import { Delete, Add, Print, Usb } from "@mui/icons-material";
import { printOrder } from "../utils/printOrder";

export default function OrderForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // Se tiver ID, é edição

  // Dados do Pedido
  const [cliente, setCliente] = useState(null);
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [observacao, setObservacao] = useState("");
  const [frete, setFrete] = useState(0);
  const [status, setStatus] = useState("Novo");
  
  // Itens
  const [itens, setItens] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [qtdProduto, setQtdProduto] = useState(1);

  // Listas para seleção
  const [listaClientes, setListaClientes] = useState([]);
  const [listaProdutos, setListaProdutos] = useState([]);

  // Modal Novo Cliente
  const [openClientModal, setOpenClientModal] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteTel, setNovoClienteTel] = useState("");

  const isCancelled = status === "Cancelado";

  useEffect(() => {
    carregarDados();
    if (id) carregarPedido(id);
    else if (location.state?.items) {
      // Se veio da Home com itens selecionados
      setItens(location.state.items);
    }
  }, [id, location.state]);

  async function carregarDados() {
    const [resCli, resProd] = await Promise.all([
      api.get("/clientes"),
      api.get("/produtos")
    ]);
    setListaClientes(Array.isArray(resCli.data) ? resCli.data : []);
    setListaProdutos(Array.isArray(resProd.data) ? resProd.data : []);
  }

  async function carregarPedido(pedidoId) {
    try {
      const res = await api.get(`/pedidos/${pedidoId}`);
      const p = res.data;
      setCliente(listaClientes.find(c => c.id === p.cliente_id) || { 
        id: p.cliente_id, 
        nome: p.cliente_nome,
        telefone: p.telefone,
        endereco: p.endereco,
        numero: p.numero,
        bairro: p.bairro,
        cidade: p.cidade
      });
      setDataPedido(p.data_pedido.split('T')[0]);
      setFormaPagamento(p.forma_pagamento);
      setObservacao(p.observacao);
      setFrete(p.frete);
      setStatus(p.status);
      setItens(p.itens.map(i => ({
        ...i,
        nome: i.produto_nome,
        quantidade: Number(i.quantidade),
        valor_unitario: Number(i.valor_unitario),
        _tempId: Math.random()
      })));
    } catch (err) {
      console.error("Erro ao carregar pedido", err);
    }
  }

  function adicionarItem() {
    if (!produtoSelecionado || qtdProduto <= 0) return;

    const novoItem = {
      produto_id: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      quantidade: Number(qtdProduto),
      valor_unitario: Number(produtoSelecionado.preco_venda),
      valor_total: Number(qtdProduto) * Number(produtoSelecionado.preco_venda),
      _tempId: Math.random()
    };

    setItens([...itens, novoItem]);
    setProdutoSelecionado(null);
    setQtdProduto(1);
  }

  function removerItem(index) {
    const novaLista = [...itens];
    novaLista.splice(index, 1);
    setItens(novaLista);
  }

  function atualizarQuantidadeItem(index, novaQtd) {
    const novaLista = [...itens];
    novaLista[index] = { ...novaLista[index], quantidade: Number(novaQtd) };
    setItens(novaLista);
  }

  const totalProdutos = itens.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario)), 0);
  const totalPedido = totalProdutos + Number(frete);

  async function salvarPedido() {
    if (!cliente) return alert("Selecione um cliente");
    if (itens.length === 0) return alert("Adicione produtos ao pedido");
    if (itens.some(i => i.quantidade <= 0)) return alert("Quantidade dos produtos deve ser maior que zero");

    const payload = {
      cliente_id: cliente.id,
      data_pedido: dataPedido,
      forma_pagamento: formaPagamento,
      observacao,
      frete: Number(frete),
      status,
      itens
    };

    try {
      if (id) {
        await api.put(`/pedidos/${id}`, payload);
        alert("Pedido atualizado!");
      } else {
        await api.post("/pedidos", payload);
        alert("Pedido criado!");
      }
      navigate("/pedidos");
    } catch (err) {
      alert("Erro ao salvar pedido");
    }
  }

  async function cadastrarClienteRapido() {
    if (!novoClienteNome) return;
    try {
      await api.post("/clientes", { nome: novoClienteNome, telefone: novoClienteTel });
      alert("Cliente cadastrado!");
      setNovoClienteNome("");
      setNovoClienteTel("");
      setOpenClientModal(false);
      carregarDados(); // Recarrega lista para selecionar o novo
    } catch (err) {
      alert("Erro ao cadastrar cliente");
    }
  }

  async function cancelarPedido() {
    if (!id) return;
    if (!confirm("Deseja realmente cancelar este pedido?")) return;
    try {
      await api.patch(`/pedidos/${id}/status`, { status: "Cancelado" });
      alert("Pedido cancelado!");
      navigate("/pedidos");
    } catch (err) {
      alert("Erro ao cancelar pedido");
    }
  }

  async function verificarImpressora() {
    try {
      const res = await api.get("/pedidos/usb-check");
      if (res.data.count > 0) {
        alert(`Sucesso! ${res.data.count} impressora(s) detectada(s).`);
      } else {
        alert("Nenhuma impressora USB detectada pelo sistema.");
      }
    } catch (err) {
      alert("Erro ao verificar drivers USB.");
    }
  }

  async function handlePrint() {
    if (!id) return alert("Salve o pedido antes de imprimir.");
    try {
      await api.post(`/pedidos/${id}/imprimir`);
      alert("Enviado para impressora!");
    } catch (err) {
      const pedidoParaImpressao = {
        id: id,
        data_pedido: dataPedido,
        cliente: cliente,
        itens: itens,
        frete: frete,
        valor_total: totalPedido,
        forma_pagamento: formaPagamento,
        observacao: observacao
      };
      
      const msg = err.response?.data?.error || err.message || "Erro na comunicação USB";
      console.log("Impressão direta falhou:", msg);
      
      // Se falhar, avisa e abre o navegador
      // alert(`${msg}. Abrindo janela de impressão...`);
      
      printOrder(pedidoParaImpressao);
    }
  }

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">{id ? `Editar Pedido #${id}` : "Novo Pedido"}</Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<Usb />} onClick={verificarImpressora}>
            Testar USB
          </Button>
          <Button variant="contained" color="secondary" startIcon={<Print />} onClick={handlePrint}>
            Imprimir
          </Button>
          {id && !isCancelled && (
            <Button variant="outlined" color="error" onClick={cancelarPedido}>
              Cancelar Pedido
            </Button>
          )}
        </Box>
      </Box>

      {isCancelled && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Este pedido foi cancelado e não permite alterações.
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box display="flex" gap={1}>
              <Autocomplete
                fullWidth
                disabled={isCancelled}
                options={listaClientes}
                getOptionLabel={(option) => option.nome || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={cliente}
                onChange={(e, newValue) => setCliente(newValue)}
                renderInput={(params) => <TextField {...params} label="Cliente" />}
              />
              <Button variant="outlined" onClick={() => setOpenClientModal(true)} disabled={isCancelled}><Add /></Button>
            </Box>
            {cliente && (
              <Typography variant="caption" display="block" mt={1} color="text.secondary">
                {cliente.endereco}, {cliente.numero} - {cliente.bairro} ({cliente.cidade}) | Tel: {cliente.telefone}
              </Typography>
            )}
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField type="date" label="Data" fullWidth InputLabelProps={{ shrink: true }} value={dataPedido} onChange={e => setDataPedido(e.target.value)} disabled={isCancelled} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField select label="Status" fullWidth value={status} onChange={e => setStatus(e.target.value)} disabled={isCancelled}>
              <MenuItem value="Novo">Novo</MenuItem>
              <MenuItem value="Finalizado">Finalizado</MenuItem>
              <MenuItem value="Cancelado">Cancelado</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>Itens do Pedido</Typography>
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <Autocomplete
            fullWidth
            disabled={isCancelled}
            options={listaProdutos}
            getOptionLabel={(option) => `${option.nome} | Est: ${option.estoque} | R$ ${Number(option.preco_venda).toFixed(2)}`}
            value={produtoSelecionado}
            onChange={(e, val) => setProdutoSelecionado(val)}
            renderInput={(params) => <TextField {...params} label="Buscar Produto" />}
          />
          <TextField label="Qtd" type="number" sx={{ width: 100 }} value={qtdProduto} onChange={e => setQtdProduto(e.target.value)} disabled={isCancelled} />
          <Button variant="contained" onClick={adicionarItem} disabled={isCancelled}>Adicionar</Button>
        </Box>

        <Table size="small">
          <TableHead><TableRow><TableCell>Produto</TableCell><TableCell>Qtd</TableCell><TableCell>Unitário</TableCell><TableCell>Total</TableCell><TableCell></TableCell></TableRow></TableHead>
          <TableBody>
            {itens.map((item, idx) => (
              <TableRow key={item._tempId}>
                <TableCell>{item.nome}</TableCell>
                <TableCell>
                  <TextField 
                    disabled={isCancelled}
                    type="number" 
                    size="small" 
                    value={item.quantidade} 
                    onChange={(e) => atualizarQuantidadeItem(idx, e.target.value)}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>R$ {Number(item.valor_unitario).toFixed(2)}</TableCell>
                <TableCell>R$ {(item.quantidade * item.valor_unitario).toFixed(2)}</TableCell>
                <TableCell><IconButton color="error" size="small" onClick={() => removerItem(idx)} disabled={isCancelled}><Delete /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}><TextField select label="Forma de Pagamento" fullWidth value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} disabled={isCancelled}><MenuItem value="Pix">Pix</MenuItem><MenuItem value="Dinheiro">Dinheiro</MenuItem><MenuItem value="Cartão">Cartão</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField label="Frete (R$)" type="number" fullWidth value={frete} onChange={e => setFrete(e.target.value)} disabled={isCancelled} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Typography variant="h5" align="right" color="primary" fontWeight="bold">Total: R$ {totalPedido.toFixed(2)}</Typography></Grid>
          <Grid size={12}><TextField label="Observações" multiline rows={2} fullWidth value={observacao} onChange={e => setObservacao(e.target.value)} disabled={isCancelled} /></Grid>
          <Grid size={12}><Button variant="contained" fullWidth size="large" onClick={salvarPedido} disabled={isCancelled}>SALVAR PEDIDO</Button></Grid>
        </Grid>
      </Paper>

      {/* Modal Cadastro Rápido de Cliente */}
      <Dialog open={openClientModal} onClose={() => setOpenClientModal(false)}>
        <DialogTitle>Novo Cliente Rápido</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Nome" fullWidth value={novoClienteNome} onChange={e => setNovoClienteNome(e.target.value)} />
          <TextField margin="dense" label="Telefone" fullWidth value={novoClienteTel} onChange={e => setNovoClienteTel(e.target.value)} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenClientModal(false)}>Cancelar</Button><Button onClick={cadastrarClienteRapido} variant="contained">Salvar</Button></DialogActions>
      </Dialog>
    </Container>
  );
}