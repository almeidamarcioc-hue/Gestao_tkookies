import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, 
  Container, Autocomplete, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from "@mui/material";
import { Delete, Add, Print, Usb } from "@mui/icons-material";
import { printOrder } from "../utils/printOrder";

export default function OrderForm({ clientUser, isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // Se tiver ID, é edição

  // Dados do Pedido
  const [cliente, setCliente] = useState(null);
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [observacao, setObservacao] = useState("");
  const [frete, setFrete] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [tipoEntrega, setTipoEntrega] = useState("retira");
  const [configFrete, setConfigFrete] = useState(0);
  const [status, setStatus] = useState("Novo");
  const [tipoCliente, setTipoCliente] = useState("consumidor"); // 'consumidor' | 'revendedor'
  
  // Itens
  const [itens, setItens] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [qtdProduto, setQtdProduto] = useState(1);

  // Listas para seleção
  const [listaClientes, setListaClientes] = useState([]);
  const [listaRevendedores, setListaRevendedores] = useState([]);
  const [listaProdutos, setListaProdutos] = useState([]);

  // Modal Novo Cliente
  const [openClientModal, setOpenClientModal] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteTel, setNovoClienteTel] = useState("");

  const isCancelled = status === "Cancelado";

  useEffect(() => {
    api.get("/pedidos/config/frete").then(res => setConfigFrete(Number(res.data.valor) || 0));
    carregarDados();
    if (id) carregarPedido(id);
    else {
      if (location.state?.items) {
        // Se veio da Home com itens selecionados
        setItens(location.state.items);
      }
      // Se for cliente (não admin), pré-seleciona
      if (!isAdmin && clientUser) {
        setCliente(clientUser);
      }
    }
  }, [id, location.state, isAdmin, clientUser]);

  const { data: produtosData } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => api.get("/produtos").then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: combosData } = useQuery({
    queryKey: ['combos'],
    queryFn: () => api.get("/combos?apenas_ativos=true").then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get("/clientes?limit=1000").then(res => res.data.data || res.data),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: revendedoresData } = useQuery({
    queryKey: ['revendedores'],
    queryFn: () => api.get("/revendedores").then(res => res.data),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const produtos = Array.isArray(produtosData) ? produtosData : [];
    const combos = Array.isArray(combosData) ? combosData.map(c => ({ ...c, _isCombo: true })) : [];
    setListaProdutos([...produtos, ...combos]);
    if (clientesData) setListaClientes(clientesData);
    if (revendedoresData) setListaRevendedores(Array.isArray(revendedoresData) ? revendedoresData : []);
    if (!isAdmin && clientUser) setListaClientes([clientUser]);
  }, [produtosData, combosData, clientesData, revendedoresData, isAdmin, clientUser]);

  async function carregarDados() {
    // Removido, agora usa useQuery
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
        cidade: p.cidade,
        is_revendedor: p.is_revendedor
      });
      setDataPedido(p.data_pedido.split('T')[0]);
      setFormaPagamento(p.forma_pagamento);
      setObservacao(p.observacao);
      setFrete(p.frete);
      setDesconto(p.desconto || 0);
      setTipoEntrega(Number(p.frete) > 0 ? "entrega" : "retira");
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

    let valorUnitario = Number(produtoSelecionado.preco_venda);

    // Prioridade: Revenda > Promoção > Normal
    if (cliente && cliente.is_revendedor) {
      valorUnitario = Number(produtoSelecionado.preco_revenda);
    } else if (produtoSelecionado.eh_destaque && Number(produtoSelecionado.desconto_destaque) > 0) {
      valorUnitario = valorUnitario * (1 - Number(produtoSelecionado.desconto_destaque) / 100);
    }

    const isCombo = !!produtoSelecionado._isCombo;
    const novoItem = {
      produto_id: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      quantidade: Number(qtdProduto),
      valor_unitario: valorUnitario,
      valor_total: Number(qtdProduto) * valorUnitario,
      tipo: isCombo ? 'combo' : 'produto',
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

  const handleTipoEntregaChange = (e) => {
    const novoTipo = e.target.value;
    setTipoEntrega(novoTipo);
    if (novoTipo === "entrega") {
      setFrete(configFrete);
    } else {
      setFrete(0);
    }
  };

  const totalProdutos = itens.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario)), 0);
  const totalPedido = totalProdutos - Number(desconto) + Number(frete);

  async function salvarPedido() {
    if (!cliente) return alert("Selecione um cliente");
    if (itens.length === 0) return alert("Adicione produtos ao pedido");
    if (itens.some(i => i.quantidade <= 0)) return alert("Quantidade dos produtos deve ser maior que zero");

    const payload = {
      cliente_id: cliente.id,
      data_pedido: dataPedido,
      forma_pagamento: formaPagamento,
      observacao,
      frete: Number(frete) || 0,
      desconto: Number(desconto) || 0,
      status,
      tipo_cliente: tipoCliente, // Envia o tipo para controle (se o backend suportar)
      itens
    };

    try {
      if (id) {
        await api.put(`/pedidos/${id}`, payload);
        alert("Pedido atualizado!");
        navigate("/pedidos");
      } else {
        await api.post("/pedidos", payload);
        
        import("canvas-confetti").then((module) => {
          const confetti = module.default;
          if (confetti) confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 9999
          });
        }).catch(e => console.warn("Confetti falhou:", e));

        setTimeout(() => {
          alert("Pedido criado!");
          navigate("/pedidos");
        }, 1000);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Erro ao salvar pedido";
      alert(`Erro: ${msg}`);
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

    const isVercel = api.defaults.baseURL.includes('vercel.app');

    if (isVercel) {
      // Se está na Vercel, vai direto para a impressão do navegador
      console.log("Ambiente Vercel detectado. Usando impressão do navegador.");
      try {
          const res = await api.get(`/pedidos/${id}`);
          printOrder(res.data);
      } catch (fetchErr) {
          alert("Erro ao carregar dados do pedido para impressão.");
      }
    } else {
      // Se não está na Vercel (local), tenta a impressão direta
      try {
        await api.post(`/pedidos/${id}/imprimir`);
        alert("Pedido enviado para a impressora USB.");
      } catch (err) {
        const msg = err.response?.data?.error || err.message || "Erro na comunicação USB";
        alert(`Falha na impressão direta: ${msg}\n\nVerifique se a impressora está conectada e se os drivers estão instalados corretamente (Zadig para Windows).`);
        console.error("Erro na impressão direta:", err);
      }
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
          <Grid item xs={12} md={6}>
            {isAdmin && (
              <FormControl component="fieldset" sx={{ mb: 1 }}>
                <RadioGroup row value={tipoCliente} onChange={(e) => {
                  setTipoCliente(e.target.value);
                  setCliente(null); // Limpa seleção ao trocar tipo
                }}>
                  <FormControlLabel value="consumidor" control={<Radio size="small" />} label="Consumidor Final" disabled={isCancelled} />
                  <FormControlLabel value="revendedor" control={<Radio size="small" />} label="Revendedor Parceiro" disabled={isCancelled} />
                </RadioGroup>
              </FormControl>
            )}
            
            <Box display="flex" gap={1}>
              <Autocomplete
                fullWidth
                disabled={isCancelled || (!isAdmin && !!clientUser)}
                options={tipoCliente === 'revendedor' ? listaRevendedores : listaClientes}
                getOptionLabel={(option) => {
                  if (tipoCliente === 'revendedor') return option.razao_social || option.nome || "";
                  return option.nome || "";
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={cliente}
                onChange={(e, newValue) => {
                  if (newValue && tipoCliente === 'revendedor') {
                    // Adapta objeto revendedor para formato cliente e marca flag para preço
                    setCliente({
                      ...newValue,
                      nome: newValue.razao_social,
                      is_revendedor: true, // Força flag para cálculo de preço
                      endereco: newValue.cidade, // Usa cidade como endereço base visual
                      bairro: newValue.estado
                    });
                  } else {
                    setCliente(newValue);
                  }
                }}
                renderInput={(params) => <TextField {...params} label={tipoCliente === 'revendedor' ? "Selecione o Revendedor" : "Selecione o Cliente"} />}
              />
              {isAdmin && tipoCliente === 'consumidor' && (
                <Button variant="outlined" onClick={() => setOpenClientModal(true)} disabled={isCancelled} title="Novo Cliente"><Add /></Button>
              )}
            </Box>
            {cliente && (
              <Typography variant="caption" display="block" mt={1} color="text.secondary">
                {cliente.endereco}, {cliente.numero} - {cliente.bairro} ({cliente.cidade}) | Tel: {cliente.telefone}
              </Typography>
            )}
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField type="date" label="Data" fullWidth InputLabelProps={{ shrink: true }} value={dataPedido} onChange={e => setDataPedido(e.target.value)} disabled={isCancelled} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select label="Status" fullWidth value={status} onChange={e => setStatus(e.target.value)} disabled={isCancelled}>
              <MenuItem value="Novo">Novo</MenuItem>
              <MenuItem value="Em Produção">Em Produção</MenuItem>
              <MenuItem value="Pronto">Pronto</MenuItem>
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
            getOptionLabel={(option) => {
              let preco = Number(option.preco_venda);
              let textoPreco = `R$ ${preco.toFixed(2)}`;
              if (!option._isCombo) {
                if (cliente && cliente.is_revendedor) {
                  textoPreco = `R$ ${Number(option.preco_revenda).toFixed(2)} (Revenda)`;
                } else if (option.eh_destaque && Number(option.desconto_destaque) > 0) {
                  const precoDesc = preco * (1 - Number(option.desconto_destaque) / 100);
                  textoPreco = `R$ ${precoDesc.toFixed(2)} (Promo)`;
                }
              }
              return `${option.nome} | Est: ${option.estoque} | ${textoPreco}`;
            }}
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
          <Grid item xs={12} md={3}><TextField select label="Forma de Pagamento" fullWidth value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} disabled={isCancelled}><MenuItem value="Pix">Pix</MenuItem><MenuItem value="Dinheiro">Dinheiro</MenuItem><MenuItem value="Cartão">Cartão</MenuItem></TextField></Grid>
          <Grid item xs={12} md={3}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: '0.8rem' }}>Tipo de Entrega</FormLabel>
              <RadioGroup row value={tipoEntrega} onChange={handleTipoEntregaChange}>
                <FormControlLabel value="retira" control={<Radio size="small" />} label="Retirada" disabled={isCancelled} />
                <FormControlLabel value="entrega" control={<Radio size="small" />} label="Entrega" disabled={isCancelled} />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}><TextField label="Frete (R$)" type="number" fullWidth value={frete} onChange={e => setFrete(e.target.value)} disabled={isCancelled} /></Grid>
          <Grid item xs={6} md={2}><TextField label="Desconto (R$)" type="number" fullWidth value={desconto} onChange={e => setDesconto(e.target.value)} disabled={isCancelled} /></Grid>
          <Grid item xs={12} md={2}><Typography variant="h5" align="right" color="primary" fontWeight="bold">Total: R$ {totalPedido.toFixed(2)}</Typography></Grid>
          <Grid item xs={12}><TextField label="Observações" multiline rows={2} fullWidth value={observacao} onChange={e => setObservacao(e.target.value)} disabled={isCancelled} /></Grid>
          <Grid item xs={12}><Button variant="contained" fullWidth size="large" onClick={salvarPedido} disabled={isCancelled}>SALVAR PEDIDO</Button></Grid>
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