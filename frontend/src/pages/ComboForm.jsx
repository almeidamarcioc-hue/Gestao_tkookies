import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, 
  Container, Autocomplete, IconButton, Alert, Grid
} from "@mui/material";
import { Delete, Add } from "@mui/icons-material";

export default function ComboForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [nome, setNome] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [itens, setItens] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [qtdProduto, setQtdProduto] = useState(1);
  const [listaProdutos, setListaProdutos] = useState([]);
  // const [custoTotalCombo, setCustoTotalCombo] = useState(0); // Removido estado para usar cálculo derivado
  const [margemDesejada, setMargemDesejada] = useState("");

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    try {
      const res = await api.get("/produtos");
      const dadosProdutos = Array.isArray(res.data) ? res.data : [];
      // Calcula o custo unitário de cada produto para usar no cálculo do combo
      const produtosComCusto = dadosProdutos.map(prod => {
        const rendimento = Number(prod.rendimento) || 1;
        const custoReceita = prod.ingredientes.reduce((acc, ing) => {
          if (ing.apenas_revenda) return acc;

          const custoBase = Number(ing.custo_base) || 0;
          const estoqueBase = Number(ing.estoque_base) || 1;
          const qtd = Number(ing.quantidade) || 0;
          return acc + ((custoBase / estoqueBase) * qtd);
        }, 0);
        
        return { 
          ...prod, 
          custo_producao: custoReceita / rendimento, // Custo real de produção
          custo_unitario: custoReceita / rendimento // Custo no combo = Custo de Produção
        };
      });
      setListaProdutos(produtosComCusto);
      
      if (id) {
        carregarCombo(id, produtosComCusto);
      }
    } catch (err) {
      console.error("Erro ao carregar produtos", err);
    }
  }

  async function carregarCombo(comboId, produtos) {
    try {
      const res = await api.get(`/combos/${comboId}`);
      const combo = res.data;
      setNome(combo.nome);
      setPrecoVenda(combo.preco_venda);
      
      const itensMapeados = combo.itens.map(item => {
        const prodOriginal = produtos.find(p => p.id === item.produto_id);
        return {
          produto_id: item.produto_id,
          nome: item.nome,
          quantidade: Number(item.quantidade),
          custo_unitario: prodOriginal ? prodOriginal.custo_producao : 0, // Custo de Produção
          custo_producao: prodOriginal ? Number(prodOriginal.custo_producao) : 0,
          preco_original: prodOriginal ? Number(prodOriginal.preco_venda) : 0,
          _tempId: Math.random()
        };
      });
      setItens(itensMapeados);
    } catch (err) {
      alert("Erro ao carregar combo");
    }
  }

  // Cálculo derivado (sempre atualizado)
  const valorTotalTabela = itens.reduce((acc, item) => acc + (item.quantidade * (Number(item.preco_original) || 0)), 0);
  const custoRealTotal = itens.reduce((acc, item) => acc + (item.quantidade * (Number(item.custo_producao) || 0)), 0);

  useEffect(() => {
    if (custoRealTotal > 0 && precoVenda) {
        const margem = ((Number(precoVenda) - custoRealTotal) / custoRealTotal) * 100;
        setMargemDesejada(margem.toFixed(2));
    }
  }, [custoRealTotal]); // Atualiza margem visual quando o custo muda

  function adicionarItem() {
    if (!produtoSelecionado || qtdProduto <= 0) return;

    const novoItem = {
      produto_id: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      quantidade: Number(qtdProduto),
      custo_unitario: Number(produtoSelecionado.custo_producao),
      custo_producao: produtoSelecionado.custo_producao,
      preco_original: produtoSelecionado.preco_venda,
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

  async function salvarCombo() {
    if (!nome) return alert("Nome do combo é obrigatório");
    if (itens.length === 0) return alert("Adicione produtos ao combo");
    if (Number(precoVenda) <= 0) return alert("Preço de venda inválido");

    const payload = {
      nome,
      preco_venda: Number(precoVenda),
      itens
    };

    try {
      if (id) {
        await api.put(`/combos/${id}`, payload);
        alert("Combo atualizado!");
      } else {
        await api.post("/combos", payload);
        alert("Combo criado!");
      } 
      navigate("/combos");
    } catch (err) {
      alert("Erro ao salvar combo");
    }
  }

  const handlePrecoChange = (val) => {
    setPrecoVenda(val);
    if (custoRealTotal > 0) {
        const margem = ((Number(val) - custoRealTotal) / custoRealTotal) * 100;
        setMargemDesejada(margem.toFixed(2));
    }
  };

  const handleMargemChange = (val) => {
    setMargemDesejada(val);
    if (custoRealTotal > 0) {
        const preco = custoRealTotal * (1 + (Number(val) / 100));
        setPrecoVenda(preco.toFixed(2));
    }
  };

  // Recalcula margem visual sempre que houver mudança
  const margemAtual = custoRealTotal > 0 ? ((Number(precoVenda) - custoRealTotal) / custoRealTotal) * 100 : 0;
  
  // Comparativos
  const valorTotalIndividual = valorTotalTabela;
  const lucroIndividual = valorTotalIndividual - custoRealTotal;
  const margemIndividual = custoRealTotal > 0 ? (lucroIndividual / custoRealTotal) * 100 : 0;
  const economiaCliente = valorTotalIndividual - Number(precoVenda);
  const percentualEconomia = valorTotalIndividual > 0 ? (economiaCliente / valorTotalIndividual) * 100 : 0;

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">{id ? "Editar Combo" : "Novo Combo"}</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField label="Nome do Combo" fullWidth value={nome} onChange={e => setNome(e.target.value)} sx={{ mb: 2 }} />
        
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <Autocomplete
            fullWidth
            options={listaProdutos}
            getOptionLabel={(option) => option.nome}
            value={produtoSelecionado}
            onChange={(e, val) => setProdutoSelecionado(val)}
            renderInput={(params) => <TextField {...params} label="Adicionar Produto" />}
          />
          <TextField label="Qtd" type="number" sx={{ width: 100 }} value={qtdProduto} onChange={e => setQtdProduto(e.target.value)} />
          <Button variant="contained" onClick={adicionarItem}><Add /></Button>
        </Box>

        <Table size="small" sx={{ mb: 2 }}>
          <TableHead><TableRow><TableCell>Produto</TableCell><TableCell>Qtd</TableCell><TableCell>Custo Unit.</TableCell><TableCell></TableCell></TableRow></TableHead>
          <TableBody>
            {itens.map((item, idx) => (
              <TableRow key={item._tempId}>
                <TableCell>{item.nome}</TableCell>
                <TableCell>
                  <TextField 
                    type="number" 
                    size="small" 
                    value={item.quantidade} 
                    onChange={(e) => atualizarQuantidadeItem(idx, e.target.value)}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>R$ {item.custo_unitario.toFixed(2)}</TableCell>
                <TableCell><IconButton color="error" size="small" onClick={() => removerItem(idx)}><Delete /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2, mt: 2 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>SIMULAÇÃO COMBO</Typography>
                    <Typography variant="body2" gutterBottom>Custo Produção: <strong>R$ {custoRealTotal.toFixed(2)}</strong></Typography>
                    
                    <Box display="flex" alignItems="center" gap={2} mt={2} mb={1}>
                        <TextField label="Margem %" type="number" size="small" value={margemDesejada || margemAtual.toFixed(2)} onChange={e => handleMargemChange(e.target.value)} sx={{ width: 120 }} />
                        <TextField label="Preço Venda" type="number" size="small" value={precoVenda} onChange={e => handlePrecoChange(e.target.value)} sx={{ width: 140 }} />
                    </Box>
                    
                    <Typography color={Number(precoVenda) - custoRealTotal >= 0 ? "success.main" : "error"} variant="body2" fontWeight="bold">
                        Lucro Líquido: R$ {(Number(precoVenda) - custoRealTotal).toFixed(2)}
                    </Typography>
                    {Number(precoVenda) < custoRealTotal && <Alert severity="error" sx={{ mt: 1 }}>Preço abaixo do custo de produção!</Alert>}
                </Grid>

                <Grid item xs={12} md={6} sx={{ borderLeft: { md: '1px solid #e0e0e0' }, pl: { md: 3 } }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>VENDA INDIVIDUAL (Comparativo)</Typography>
                    <Typography variant="body2">Preço de Tabela: <strong>R$ {valorTotalIndividual.toFixed(2)}</strong></Typography>
                    <Typography variant="body2">Margem Original: {margemIndividual.toFixed(2)}%</Typography>
                    <Typography variant="body2" gutterBottom>Lucro Original: R$ {lucroIndividual.toFixed(2)}</Typography>
                    
                    <Paper variant="outlined" sx={{ p: 1.5, mt: 2, bgcolor: '#e8f5e9', borderColor: '#c8e6c9' }}>
                        <Typography color="success.main" fontWeight="bold" variant="body2">
                            Vantagem Cliente: R$ {economiaCliente.toFixed(2)} ({percentualEconomia.toFixed(1)}% OFF)
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
        <Button variant="contained" fullWidth size="large" onClick={salvarCombo} sx={{ mt: 3 }}>SALVAR COMBO</Button>
      </Paper>
    </Container>
  );
}