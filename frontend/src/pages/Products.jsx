import { useEffect, useState } from "react";
import api from "../services/api";

import {
  Box,
  Button,
  TextField,
  Autocomplete,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  IconButton,
  Paper,
  Container,
  Grid,
  FormControlLabel,
  Checkbox
} from "@mui/material";

import { Delete, CloudUpload, Star, StarBorder } from "@mui/icons-material";

export default function Products() {
  const [ingredientes, setIngredientes] = useState([]);
  const [nome, setNome] = useState("");
  const [rendimento, setRendimento] = useState(1);
  const [percentual, setPercentual] = useState(0);
  const [margemRevenda, setMargemRevenda] = useState(0);
  const [ingredienteSelecionado, setIngredienteSelecionado] = useState("");
  const [quantidadeIngrediente, setQuantidadeIngrediente] = useState("");
  const [apenasRevenda, setApenasRevenda] = useState(false);
  const [itens, setItens] = useState([]);
  const [custoTotal, setCustoTotal] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  const [custoRevenda, setCustoRevenda] = useState(0);
  const [precoRevenda, setPrecoRevenda] = useState(0);
  const [listaProdutos, setListaProdutos] = useState([]);
  const [imagens, setImagens] = useState([]);
  const [ehDestaque, setEhDestaque] = useState(false);
  const [descontoDestaque, setDescontoDestaque] = useState(0);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await api.get("/ingredientes");
        console.log("Ingredientes carregados:", res.data);
        setIngredientes(Array.isArray(res.data) ? res.data : []);
        const resProd = await api.get("/produtos");
        setListaProdutos(Array.isArray(resProd.data) ? resProd.data : []);
      } catch (err) {
        console.error("Erro ao carregar ingredientes:", err);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    let somaCusto = 0;
    let somaRevenda = 0;
    
    if (Array.isArray(ingredientes)) {
    itens.forEach((item) => {
      const ing = ingredientes.find(i => Number(i.id) === Number(item.ingrediente_id));
      if (ing) {
        const valorEmbalagem = Number(ing.custo) || 0;
        const qtdNaEmbalagem = Number(ing.estoque) || 0;
        const qtdUsada = Number(item.quantidade) || 0;
        if (qtdNaEmbalagem > 0) {
          const custoItem = (valorEmbalagem / qtdNaEmbalagem) * qtdUsada;
          
          // Se for APENAS revenda, não soma no custo de produção
          if (!item.apenas_revenda) {
            somaCusto += custoItem;
          }
          
          // Soma na revenda se for item de revenda (flag do ingrediente) OU se for marcado como apenas revenda
          if (ing.usado_para_revenda || item.apenas_revenda) {
            somaRevenda += custoItem;
          }
        }
      }
    });
    }

    setCustoTotal(somaCusto);
    setCustoRevenda(somaRevenda);
    
    const qtdCookies = Number(rendimento) || 1;
    const custoUnitario = somaCusto / qtdCookies;
    const custoRevendaUnitario = somaRevenda / qtdCookies;
    
    // Atualiza preços baseados na margem (apenas se não estiver editando preço manualmente)
    // Para simplificar, recalculamos sempre que custo ou margem mudam.
    // A edição manual do preço atualizará a margem, que disparará este effect novamente.
    
    setPrecoVenda(custoUnitario * (1 + (Number(percentual) || 0) / 100));
    setPrecoRevenda(custoRevendaUnitario * (1 + (Number(margemRevenda) || 0) / 100));

  }, [itens, percentual, margemRevenda, ingredientes, rendimento]);

  // Manipulador para alteração manual do Preço de Venda
  const handlePrecoVendaChange = (e) => {
    const novoPreco = parseFloat(e.target.value) || 0;
    setPrecoVenda(novoPreco);
    
    const qtdCookies = Number(rendimento) || 1;
    const custoUnitario = custoTotal / qtdCookies;
    
    if (custoUnitario > 0) {
      const novaMargem = ((novoPreco / custoUnitario) - 1) * 100;
      setPercentual(novaMargem.toFixed(2));
    }
  };

  // Manipulador para alteração manual do Preço de Revenda
  const handlePrecoRevendaChange = (e) => {
    const novoPreco = parseFloat(e.target.value) || 0;
    setPrecoRevenda(novoPreco);
    
    const qtdCookies = Number(rendimento) || 1;
    const custoUnitario = custoRevenda / qtdCookies;
    
    if (custoUnitario > 0) {
      const novaMargem = ((novoPreco / custoUnitario) - 1) * 100;
      setMargemRevenda(novaMargem.toFixed(2));
    }
  };

  const handleImageChange = async (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length + imagens.length > 4) {
        alert("Máximo de 4 imagens permitido.");
        return;
      }

      const newImagesPromises = filesArray.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve({
            imagem: reader.result,
            eh_capa: false,
            _tempId: Math.random()
          });
          reader.onerror = error => reject(error);
        });
      });

      const newImages = await Promise.all(newImagesPromises);
      
      // Se for a primeira imagem, define como capa automaticamente
      if (imagens.length === 0 && newImages.length > 0) {
        newImages[0].eh_capa = true;
      }

      setImagens([...imagens, ...newImages]);
    }
  };

  const handleRemoveImage = (index) => {
    const newImagens = [...imagens];
    const wasCapa = newImagens[index].eh_capa;
    newImagens.splice(index, 1);
    // Se removeu a capa e ainda tem imagens, define a primeira como capa
    if (wasCapa && newImagens.length > 0) {
      newImagens[0].eh_capa = true;
    }
    setImagens(newImagens);
  };

  const handleSetCapa = (index) => {
    const newImagens = imagens.map((img, i) => ({
      ...img,
      eh_capa: i === index
    }));
    setImagens(newImagens);
  };

  function adicionarIngrediente() {
    if (!ingredienteSelecionado || !quantidadeIngrediente) return;
    if (!Array.isArray(ingredientes)) return;
    const ing = ingredientes.find(i => Number(i.id) === Number(ingredienteSelecionado));
    if (!ing) return;

    setItens(prev => [
      ...prev,
      {
        ingrediente_id: ing.id,
        nome: ing.nome,
        unidade: ing.unidade,
        quantidade: Number(quantidadeIngrediente),
        apenas_revenda: apenasRevenda,
        _tempId: Date.now() + Math.random() // ID único para evitar erros de renderização
      }
    ]);
    setIngredienteSelecionado("");
    setQuantidadeIngrediente("");
    setApenasRevenda(false);
  }

  async function salvarProduto() {
    if (!nome || itens.length === 0) {
      alert("Nome e ingredientes são necessários.");
      return;
    }

    const valorFinalVenda = Number(precoVenda.toFixed(2));
    const valorFinalRevenda = Number(precoRevenda.toFixed(2));

    const payload = {
      nome: nome,
      preco_venda: valorFinalVenda,
      rendimento: Number(rendimento),
      margem_revenda: Number(margemRevenda),
      preco_revenda: valorFinalRevenda,
      ingredientes: itens.map(i => ({
        ingrediente_id: i.ingrediente_id,
        quantidade: Number(i.quantidade),
        apenas_revenda: i.apenas_revenda
      })),
      imagens: imagens.map(img => ({ imagem: img.imagem, eh_capa: img.eh_capa })),
      eh_destaque: ehDestaque,
      desconto_destaque: Number(descontoDestaque)
    };

    try {
      const response = await api.post("/produtos", payload);
      console.log("Sucesso:", response.data);
      alert("Produto cadastrado com sucesso!");
      
      setNome("");
      setRendimento(1);
      setPercentual(0);
      setMargemRevenda(0);
      setItens([]);
      setCustoTotal(0);
      setPrecoVenda(0);
      setPrecoRevenda(0);
      setImagens([]);
      setEhDestaque(false);
      setDescontoDestaque(0);
      
      // Recarrega a lista
      const resProd = await api.get("/produtos");
      setListaProdutos(Array.isArray(resProd.data) ? resProd.data : []);
    } catch (err) {
      // LOG DETALHADO PARA IDENTIFICARMOS O QUE O BACKEND REJEITOU
      console.error("ERRO COMPLETO DO AXIOS:", err);
      console.error("RESPOSTA DO SERVIDOR:", err.response?.data);
      
      const erroMsg = err.response?.data?.error || "Erro ao salvar. Verifique o console.";
      alert(`Servidor diz: ${erroMsg}`);
    }
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" mb={3} fontWeight="bold">Novo Produto</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" gap={2} mb={3}>
          <TextField label="Nome do Produto" fullWidth value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField label="Rendimento (Qtd Cookies)" type="number" sx={{ width: 200 }} value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
        </Box>

        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>Imagens do Produto (Máx. 4)</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {imagens.map((img, index) => (
              <Box key={index} position="relative" width={100} height={100} sx={{ border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                <img src={img.imagem} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => handleRemoveImage(index)}
                  sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' }, p: 0.5 }}
                >
                  <Delete fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  color={img.eh_capa ? "warning" : "default"}
                  onClick={() => handleSetCapa(index)}
                  sx={{ position: 'absolute', bottom: 0, left: 0, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' }, p: 0.5 }}
                >
                  {img.eh_capa ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                </IconButton>
              </Box>
            ))}
            {imagens.length < 4 && (
              <Button
                component="label"
                variant="outlined"
                sx={{ width: 100, height: 100, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1, textTransform: 'none', borderStyle: 'dashed' }}
              >
                <CloudUpload color="action" />
                <Typography variant="caption" color="text.secondary">Adicionar</Typography>
                <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
              </Button>
            )}
          </Box>
        </Box>
        
        <Box display="flex" gap={2} mb={3} alignItems="center" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
          <FormControlLabel 
            control={<Checkbox checked={ehDestaque} onChange={(e) => setEhDestaque(e.target.checked)} />} 
            label="Produto Destaque (Promoção)" 
          />
          {ehDestaque && (
            <TextField label="% Desconto" type="number" size="small" sx={{ width: 150 }} value={descontoDestaque} onChange={(e) => setDescontoDestaque(e.target.value)} />
          )}
        </Box>

        <Grid container spacing={3} mb={4}>
          {/* Bloco de Venda Direta */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#EFEBE9', height: '100%', borderColor: '#D7CCC8' }}>
              <Typography variant="subtitle1" color="primary" fontWeight="bold" mb={2}>Venda (Produção)</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField label="Margem Venda (%)" type="number" fullWidth value={percentual} onChange={(e) => setPercentual(e.target.value)} />
                <TextField label="Custo Unitário" fullWidth value={`R$ ${(custoTotal / (Number(rendimento) || 1)).toFixed(2)}`} InputProps={{ readOnly: true }} />
                <TextField 
                  label="Preço Venda (Un)" 
                  type="number"
                  fullWidth 
                  value={precoVenda} 
                  onChange={handlePrecoVendaChange}
                  sx={{ "& input": { color: '#1976d2', fontWeight: 'bold' } }} />
              </Box>
            </Paper>
          </Grid>

          {/* Bloco de Revenda */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FFF8E1', height: '100%', borderColor: '#FFE0B2' }}>
              <Typography variant="subtitle1" color="secondary" fontWeight="bold" mb={2}>Revenda</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField label="Margem Revenda (%)" type="number" fullWidth value={margemRevenda} onChange={(e) => setMargemRevenda(e.target.value)} />
                <TextField label="Custo Revenda (Unitário)" fullWidth value={`R$ ${(custoRevenda / (Number(rendimento) || 1)).toFixed(2)}`} InputProps={{ readOnly: true }} sx={{ "& input": { color: 'gray' } }} />
                <TextField 
                  label="Preço Revenda (Un)" 
                  type="number"
                  fullWidth 
                  value={precoRevenda} 
                  onChange={handlePrecoRevendaChange}
                  sx={{ "& input": { color: 'green', fontWeight: 'bold' } }} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="h6" mb={2}>Ingredientes</Typography>
        <Box display="flex" gap={2} mb={3}>
          <Autocomplete
            fullWidth
            options={Array.isArray(ingredientes) ? ingredientes : []}
            getOptionLabel={(option) => option.nome}
            value={(Array.isArray(ingredientes) ? ingredientes.find((i) => Number(i.id) === Number(ingredienteSelecionado)) : null) || null}
            onChange={(event, newValue) => {
              setIngredienteSelecionado(newValue ? newValue.id : "");
            }}
            renderInput={(params) => <TextField {...params} label="Selecione o Ingrediente" />}
          />
          <TextField label="Qtd" type="number" value={quantidadeIngrediente} onChange={(e) => setQuantidadeIngrediente(e.target.value)} />
          <FormControlLabel 
            control={<Checkbox checked={apenasRevenda} onChange={(e) => setApenasRevenda(e.target.checked)} />} 
            label="Apenas Revenda" 
            sx={{ whiteSpace: 'nowrap' }}
          />
          <Button variant="contained" onClick={adicionarIngrediente} sx={{ bgcolor: "#b100c1" }}>INCLUIR</Button>
        </Box>
        <Table size="small" sx={{ mb: 4 }}>
          <TableBody>
            {itens.map((item, index) => (
              <TableRow key={item._tempId}>
                <TableCell>{item.nome} {item.apenas_revenda && <Typography variant="caption" color="secondary" fontWeight="bold">(Revenda)</Typography>}</TableCell>
                <TableCell>{`${item.quantidade} ${item.unidade}`}</TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={() => {
                    const novaLista = [...itens];
                    novaLista.splice(index, 1);
                    setItens(novaLista);
                  }}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="contained" fullWidth size="large" onClick={salvarProduto}>CADASTRAR PRODUTO</Button>
      </Paper>

      <Typography variant="h5" mb={2} fontWeight="bold">Produtos Já Cadastrados</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell align="right">Preço Venda</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listaProdutos.map((prod) => (
              <TableRow key={prod.id}>
                <TableCell>{prod.nome}</TableCell>
                <TableCell align="right">R$ {Number(prod.preco_venda).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}