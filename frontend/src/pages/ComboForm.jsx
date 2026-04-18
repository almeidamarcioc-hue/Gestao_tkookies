import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { 
  Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, 
  Container, Autocomplete, IconButton, Alert, Grid, FormControlLabel, Checkbox, CircularProgress
} from "@mui/material";
import { Delete, Add, CloudUpload } from "@mui/icons-material";

export default function ComboForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(!!id); // Se tem ID, começa carregando
  const [precoVenda, setPrecoVenda] = useState("");
  const [imagem, setImagem] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [quantidadeProducao, setQuantidadeProducao] = useState(1); // Qtd a produzir (nova) ou ajustar (edição)
  const [estoqueAtual, setEstoqueAtual] = useState(0); // Estoque atual (carregado na edição)
  const [itens, setItens] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [ingredienteSelecionado, setIngredienteSelecionado] = useState(null);
  const [comboIngredientes, setComboIngredientes] = useState([]);
  const [qtdProduto, setQtdProduto] = useState(1);
  const [qtdIngrediente, setQtdIngrediente] = useState(1);
  const [precoVendaIngrediente, setPrecoVendaIngrediente] = useState(0);
  const [listaProdutos, setListaProdutos] = useState([]);
  const [listaIngredientes, setListaIngredientes] = useState([]);
  // const [custoTotalCombo, setCustoTotalCombo] = useState(0); // Removido estado para usar cálculo derivado
  const [margemDesejada, setMargemDesejada] = useState("");

  useEffect(() => {
    carregarProdutos();
    carregarIngredientes();
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
          const custoUnitario = Number((custoBase / estoqueBase).toFixed(4));
          return acc + (custoUnitario * qtd);
        }, 0);
        
        return { 
          ...prod, 
          custo_producao: custoReceita / rendimento, // Custo real de produção
          custo_unitario: custoReceita / rendimento // Custo no combo = Custo de Produção
        };
      });
      setListaProdutos(produtosComCusto);
      
      if (id) {
        await carregarCombo(id, produtosComCusto);
      }
    } catch (err) {
      console.error("Erro ao carregar produtos", err);
    } finally {
      setLoading(false);
    }
  }

  async function carregarIngredientes() {
    try {
      const res = await api.get("/ingredientes");
      setListaIngredientes(Array.isArray(res.data) ? res.data : (res.data.data || []));
    } catch (err) {
      console.error("Erro ao carregar ingredientes", err);
    }
  }

  async function carregarCombo(comboId, produtos) {
    try {
      const res = await api.get(`/combos/${comboId}`);
      const combo = res.data;
      setNome(combo.nome);
      setPrecoVenda(combo.preco_venda);
      setImagem(combo.imagem || "");
      setAtivo(combo.ativo === 0 || combo.ativo === false ? false : true);
      setEstoqueAtual(Number(combo.estoque) || 0);
      setQuantidadeProducao(Number(combo.estoque) || 0);

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

      const ingsMapeados = (combo.ingredientes || []).map(ing => ({
        ...ing,
        _tempId: Math.random()
      }));
      setComboIngredientes(ingsMapeados);
    } catch (err) {
      alert("Erro ao carregar combo");
    }
  }

  // Cálculo derivado (sempre atualizado)
  const valorTotalTabela = 
    itens.reduce((acc, item) => acc + (item.quantidade * (Number(item.preco_original) || 0)), 0) +
    comboIngredientes.reduce((acc, ing) => acc + (Number(ing.quantidade) * (Number(ing.preco_venda) || 0)), 0);

  const custoRealTotal = 
    itens.reduce((acc, item) => acc + (item.quantidade * (Number(item.custo_producao) || 0)), 0) +
    comboIngredientes.reduce((acc, ing) => {
      const ingOriginal = listaIngredientes.find(i => i.id === ing.ingrediente_id);
      if (ingOriginal) {
        const custoBase = Number(ingOriginal.custo) || 0;
        const estoqueBase = Number(ingOriginal.estoque) || 1;
        const custoUnitario = custoBase / estoqueBase;
        return acc + (Number(ing.quantidade) * custoUnitario);
      }
      return acc;
    }, 0);

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

  function adicionarIngrediente() {
    if (!ingredienteSelecionado || qtdIngrediente <= 0) return;

    const novoIng = {
      ingrediente_id: ingredienteSelecionado.id,
      nome: ingredienteSelecionado.nome,
      quantidade: Number(qtdIngrediente),
      preco_venda: Number(precoVendaIngrediente),
      _tempId: Math.random()
    };

    setComboIngredientes([...comboIngredientes, novoIng]);
    setIngredienteSelecionado(null);
    setQtdIngrediente(1);
    setPrecoVendaIngrediente(0);
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

  function removerIngrediente(index) {
    const novaLista = [...comboIngredientes];
    novaLista.splice(index, 1);
    setComboIngredientes(novaLista);
  }

  function atualizarQuantidadeIngrediente(index, novaQtd) {
    const novaLista = [...comboIngredientes];
    novaLista[index] = { ...novaLista[index], quantidade: Number(novaQtd) };
    setComboIngredientes(novaLista);
  }

  async function salvarCombo() {
    if (!nome) return alert("Nome do combo é obrigatório");
    if (itens.length === 0) return alert("Adicione produtos ao combo");
    if (Number(precoVenda) <= 0) return alert("Preço de venda inválido");

    const payload = {
      nome,
      preco_venda: Number(precoVenda),
      itens,
      ingredientes: comboIngredientes,
      imagem,
      ativo,
      estoque: Number(quantidadeProducao)
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
      const msg = err.response?.data?.details || err.response?.data?.error || "Erro ao salvar combo";
      alert(`Erro: ${msg}`);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => setImagem(reader.result);
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

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">{id ? "Editar Combo" : "Novo Combo"}</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField label="Nome do Combo" fullWidth value={nome} onChange={e => setNome(e.target.value)} sx={{ mb: 2 }} />
        
        <FormControlLabel
          control={<Checkbox checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />}
          label="Combo Ativo (Visível no Cardápio)"
          sx={{ mb: 2, display: 'block' }}
        />
        
        <Box mb={3}>
          <Typography variant="subtitle2" mb={1}>Imagem do Combo</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            {imagem && (
              <Box 
                component="img" 
                src={imagem} 
                sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 2, border: '1px solid #ddd' }} 
              />
            )}
            <Button component="label" variant="outlined" startIcon={<CloudUpload />}>
              Carregar Imagem
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
            {imagem && (
              <IconButton color="error" onClick={() => setImagem("")}><Delete /></IconButton>
            )}
          </Box>
        </Box>
        
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

        <Typography variant="h6" mt={4} mb={2}>Ingredientes Adicionais (Opcionais)</Typography>
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <Autocomplete
            sx={{ flexGrow: 1 }}
            options={listaIngredientes}
            getOptionLabel={(option) => option.nome}
            value={ingredienteSelecionado}
            onChange={(e, val) => {
              setIngredienteSelecionado(val);
              if (val) {
                const custoUnit = Number(val.custo) / (Number(val.estoque) || 1);
                setPrecoVendaIngrediente((custoUnit * Number(qtdIngrediente)).toFixed(2));
              } else {
                setPrecoVendaIngrediente(0);
              }
            }}
            renderInput={(params) => <TextField {...params} label="Adicionar Ingrediente" />}
          />
          <TextField
            label="Qtd"
            type="number"
            sx={{ width: 80 }}
            value={qtdIngrediente}
            onChange={e => {
              const novaQtd = e.target.value;
              setQtdIngrediente(novaQtd);
              if (ingredienteSelecionado) {
                const custoUnit = Number(ingredienteSelecionado.custo) / (Number(ingredienteSelecionado.estoque) || 1);
                setPrecoVendaIngrediente((custoUnit * Number(novaQtd)).toFixed(2));
              }
            }}
          />
          <TextField label="Preço (R$)" type="number" sx={{ width: 130 }} value={precoVendaIngrediente} onChange={e => setPrecoVendaIngrediente(e.target.value)} />
          <Button variant="contained" color="secondary" onClick={adicionarIngrediente}><Add /></Button>
        </Box>

        <Table size="small" sx={{ mb: 2 }}>
          <TableHead><TableRow><TableCell>Ingrediente</TableCell><TableCell>Qtd</TableCell><TableCell>Preço Venda</TableCell><TableCell></TableCell></TableRow></TableHead>
          <TableBody>
            {comboIngredientes.map((ing, idx) => (
              <TableRow key={ing._tempId}>
                <TableCell>{ing.nome}</TableCell>
                <TableCell>
                  <TextField 
                    type="number" 
                    size="small" 
                    value={ing.quantidade} 
                    onChange={(e) => atualizarQuantidadeIngrediente(idx, e.target.value)}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>R$ {Number(ing.preco_venda).toFixed(2)}</TableCell>
                <TableCell><IconButton color="error" size="small" onClick={() => removerIngrediente(idx)}><Delete /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Produção / Estoque */}
        <Box sx={{ bgcolor: '#e8eaf6', p: 2.5, borderRadius: 2, mt: 3, mb: 1, border: '1px solid #c5cae9' }}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
            {id ? "Ajuste de Estoque do Combo" : "Quantidade a Produzir"}
          </Typography>
          {id && (
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Estoque atual do combo: <strong>{estoqueAtual}</strong> unidade(s)
            </Typography>
          )}
          <TextField
            label={id ? "Nova quantidade total de combos" : "Quantidade de combos a produzir"}
            type="number"
            value={quantidadeProducao}
            onChange={e => setQuantidadeProducao(Math.max(0, Number(e.target.value)))}
            sx={{ width: 260 }}
            inputProps={{ min: 0 }}
            helperText={
              id
                ? `Os estoques dos produtos serão recalculados (devolvendo o consumo anterior e debitando o novo)`
                : `O estoque de cada produto será debitado pela quantidade × ${quantidadeProducao} combo(s)`
            }
          />
          {itens.length > 0 && quantidadeProducao > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" fontWeight="bold" mb={0.5}>
                Consumo de produtos (para {quantidadeProducao} combo{quantidadeProducao !== 1 ? 's' : ''}):
              </Typography>
              {itens.map((item, idx) => (
                <Typography key={idx} variant="body2" sx={{ ml: 1 }}>
                  • {item.nome}: {item.quantidade} × {quantidadeProducao} = <strong>{item.quantidade * quantidadeProducao} unid.</strong>
                </Typography>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2, mt: 4 }}>
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