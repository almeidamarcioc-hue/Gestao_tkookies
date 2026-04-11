import { useEffect, useState } from "react";
import api from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";

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
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Chip
} from "@mui/material";

import { Delete, CloudUpload, Star, StarBorder, Edit } from "@mui/icons-material";

export default function Products() {
  const location = useLocation();
  const navigate = useNavigate();

  const [ingredientes, setIngredientes] = useState([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
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
  const [ativo, setAtivo] = useState(true);
  const [ehAgregado, setEhAgregado] = useState(false);
  const [estoqueManual, setEstoqueManual] = useState("");
  const [custoManual, setCustoManual] = useState("");

  const [agregados, setAgregados] = useState([]); // Produtos sugeridos/agregados
  const [agregadoSelecionado, setAgregadoSelecionado] = useState(null);
  const [agregadoPreco, setAgregadoPreco] = useState("");
  const [ocasiao, setOcasiao] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const OCASIOES = [
    { value: "aniversario", label: "Aniversário" },
    { value: "casamento", label: "Casamento" },
    { value: "namoro", label: "Presente Romântico" },
    { value: "natal", label: "Natal" },
    { value: "pascoa", label: "Páscoa" },
    { value: "dia_das_maes", label: "Dia das Mães" },
  ];

  // Efeito para preencher o formulário ao duplicar um produto
  useEffect(() => {
    const productToDuplicate = location.state?.productToDuplicate;

    if (productToDuplicate) {
      console.log("✅ Duplicando produto:", productToDuplicate);

      // Preenche os campos do formulário
      setNome(productToDuplicate.nome || "");
      setDescricao(productToDuplicate.descricao || "");
      setRendimento(productToDuplicate.rendimento || 1);
      setEhDestaque(productToDuplicate.eh_destaque || false);
      setDescontoDestaque(productToDuplicate.desconto_destaque || 0);
      setAtivo(productToDuplicate.ativo !== false);
      setEhAgregado(productToDuplicate.eh_agregado || false);
      setEstoqueManual(productToDuplicate.estoque || "");
      setCustoManual(productToDuplicate.custo || "");
      
      // Define as margens que irão recalcular os preços
      setPercentual(productToDuplicate.margem_venda?.toFixed(2) || 0);
      setMargemRevenda(productToDuplicate.margem_revenda || 0);
      
      // Preenche imagens
      setImagens(productToDuplicate.imagens?.map(img => ({
        imagem: img.imagem,
        eh_capa: img.eh_capa,
        _tempId: Math.random()
      })) || []);

      // Preenche agregados
      setAgregados(productToDuplicate.agregados || []);

      // Preenche ingredientes (itens)
      const duplicatedItens = productToDuplicate.ingredientes?.map(ing => ({
        ingrediente_id: ing.ingrediente_id,
        nome: ing.nome,
        unidade: ing.unidade,
        quantidade: Number(ing.quantidade),
        apenas_revenda: ing.apenas_revenda,
        _tempId: Date.now() + Math.random()
      })) || [];
      setItens(duplicatedItens);

      // Limpa o state da navegação para não duplicar de novo ao recarregar
      navigate('.', { replace: true, state: {} });
      alert("Produto carregado para duplicação. Ajuste o que for necessário e salve como um novo produto.");
    }
  }, [location, navigate]);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await api.get("/ingredientes");
        if (Array.isArray(res.data)) {
          console.log(`✅ ${res.data.length} ingredientes carregados.`);
          setIngredientes(res.data);
        } else {
          console.error("❌ Formato inválido recebido de /ingredientes:", res.data);
          setIngredientes([]);
        }
      } catch (err) {
        console.error("Erro ao carregar ingredientes:", err);
      }

      try {
        const resProd = await api.get("/produtos");
        setListaProdutos(Array.isArray(resProd.data) ? resProd.data : []);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    // Se for agregado, o custo vem do input manual, não dos ingredientes
    if (ehAgregado) {
        const custo = Number(custoManual) || 0;
        setCustoTotal(custo);
        // Recalcula margem se tiver preço de venda
        if (precoVenda > 0 && custo > 0) {
            // Não sobrescreve percentual aqui para evitar loop, o percentual é visual
        }
        return;
    }

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
          const custoUnitarioIng = Number((valorEmbalagem / qtdNaEmbalagem).toFixed(4));
          const custoItem = custoUnitarioIng * qtdUsada;
          
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

  }, [itens, percentual, margemRevenda, ingredientes, rendimento, ehAgregado, custoManual]);

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
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1000;
              const MAX_HEIGHT = 1000;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve({
                imagem: canvas.toDataURL('image/jpeg', 0.7), // Comprime para 70% de qualidade
                eh_capa: false,
                _tempId: Math.random()
              });
            };
          };
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

  function adicionarAgregado() {
    if (!agregadoSelecionado || !agregadoPreco) return;
    
    // Evita duplicatas
    if (agregados.some(a => a.id === agregadoSelecionado.id)) {
      alert("Este produto já foi adicionado como agregado.");
      return;
    }

    setAgregados([...agregados, { ...agregadoSelecionado, original_id: agregadoSelecionado.id, preco: Number(agregadoPreco) }]);
    setAgregadoSelecionado(null);
    setAgregadoPreco("");
  }

  async function handleEdit(prod) {
    try {
      const res = await api.get(`/produtos/${prod.id}`);
      const p = res.data;
      setEditingId(p.id);
      setNome(p.nome || "");
      setDescricao(p.descricao || "");
      setRendimento(p.rendimento || 1);
      setPercentual(p.margem_venda?.toFixed(2) || 0);
      setMargemRevenda(p.margem_revenda || 0);
      setPrecoVenda(Number(p.preco_venda) || 0);
      setPrecoRevenda(Number(p.preco_revenda) || 0);
      setEhDestaque(p.eh_destaque || false);
      setDescontoDestaque(p.desconto_destaque || 0);
      setAtivo(p.ativo !== false);
      setEhAgregado(p.eh_agregado || false);
      setEstoqueManual(p.estoque || "");
      setCustoManual(p.custo || "");
      setImagens(p.imagens?.map(img => ({ imagem: img.imagem, eh_capa: img.eh_capa, _tempId: Math.random() })) || []);
      setAgregados(p.agregados || []);
      setItens(p.ingredientes?.map(ing => ({ ...ing, _tempId: Math.random() })) || []);
      setOcasiao(p.ocasiao ? p.ocasiao.split(",").filter(Boolean) : []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert("Erro ao carregar produto para edição.");
    }
  }

  function resetForm() {
    setEditingId(null);
    setNome(""); setDescricao(""); setRendimento(1); setPercentual(0); setMargemRevenda(0);
    setItens([]); setCustoTotal(0); setPrecoVenda(0); setPrecoRevenda(0);
    setImagens([]); setEhDestaque(false); setAgregados([]); setDescontoDestaque(0);
    setAtivo(true); setEhAgregado(false); setEstoqueManual(""); setCustoManual(""); setOcasiao([]);
  }

  async function salvarProduto() {
    if (!nome || (itens.length === 0 && !ehAgregado)) {
      alert("Nome e ingredientes são necessários.");
      return;
    }

    const valorFinalVenda = Number(precoVenda.toFixed(2));
    const valorFinalRevenda = Number(precoRevenda.toFixed(2));

    const payload = {
      nome: nome,
      descricao: descricao,
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
      desconto_destaque: Number(descontoDestaque),
      ativo: ativo,
      agregados: agregados.map(a => ({ id: a.id, preco: Number(a.preco) })),
      eh_agregado: ehAgregado,
      ocasiao: ocasiao.join(","),
      ...(ehAgregado && {
        estoque: Number(estoqueManual),
        custo: Number(custoManual)
      })
    };

    try {
      if (editingId) {
        await api.put(`/produtos/${editingId}`, payload);
        alert("Produto atualizado com sucesso!");
      } else {
        await api.post("/produtos", payload);
        alert("Produto cadastrado com sucesso!");
      }
      resetForm();
      
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
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          {editingId ? "Editando Produto" : "Novo Produto"}
        </Typography>
        {editingId && (
          <Button variant="outlined" color="inherit" onClick={resetForm}>
            Cancelar Edição
          </Button>
        )}
      </Box>
      <Paper sx={{ p: 3, mb: 4, border: editingId ? '2px solid #D4580A' : undefined }}>
        <Box display="flex" gap={2} mb={3}>
          <TextField label="Nome do Produto" fullWidth value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField label="Rendimento (Qtd Cookies)" type="number" sx={{ width: 200 }} value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
          <TextField 
            label="Custo Total (Receita)" 
            value={`R$ ${custoTotal.toFixed(2)}`} 
            InputProps={{ readOnly: true }} 
            sx={{ width: 200, bgcolor: '#f5f5f5' }} 
          />
        </Box>

        <Box mb={3}>
          <TextField 
            label="Descrição do Produto" 
            multiline 
            rows={3} 
            fullWidth 
            value={descricao} 
            onChange={(e) => setDescricao(e.target.value)} 
            inputProps={{ maxLength: 1000 }}
            helperText={`${descricao.length}/1000`}
          />
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
          <FormControlLabel 
            control={<Checkbox checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />} 
            label="Ativo no Cardápio" 
          />
          <FormControlLabel 
            control={<Checkbox checked={ehAgregado} onChange={(e) => setEhAgregado(e.target.checked)} />} 
            label="É Produto Agregado / Extra" 
          />
          {ehDestaque && (
            <TextField label="% Desconto" type="number" size="small" sx={{ width: 150 }} value={descontoDestaque} onChange={(e) => setDescontoDestaque(e.target.value)} />
          )}
        </Box>

        <Grid container spacing={3} mb={4}>
          {/* Bloco de Venda Direta */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#EFEBE9', height: '100%', borderColor: '#D7CCC8' }}>
              <Typography variant="subtitle1" color="primary" fontWeight="bold" mb={2}>Venda (Produção)</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField label="Margem Venda (%)" type="number" fullWidth value={percentual} onChange={(e) => setPercentual(e.target.value)} />
                {ehAgregado ? (
                    <TextField 
                        label="Custo Unitário (Compra)" 
                        type="number" 
                        fullWidth 
                        value={custoManual} 
                        onChange={(e) => setCustoManual(e.target.value)} 
                    />
                ) : (
                    <TextField label="Custo Unitário" fullWidth value={`R$ ${(custoTotal / (Number(rendimento) || 1)).toFixed(2)}`} InputProps={{ readOnly: true }} />
                )}
                <TextField 
                  label="Preço Venda (Un)" 
                  type="number"
                  fullWidth 
                  value={precoVenda} 
                  onChange={handlePrecoVendaChange}
                  sx={{ "& input": { color: '#1976d2', fontWeight: 'bold' } }} />
                {ehAgregado && (
                    <TextField label="Estoque Atual" type="number" fullWidth value={estoqueManual} onChange={(e) => setEstoqueManual(e.target.value)} />
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Bloco de Revenda */}
          <Grid item xs={12} md={6}>
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

        {!ehAgregado && (
            <>
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
                <TableRow key={item._tempId} sx={item.apenas_revenda ? { bgcolor: '#FFF8E1' } : {}}>
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
            </>
        )}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>Ocasião / Filtro de Presentear</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {OCASIOES.map(op => (
              <FormControlLabel
                key={op.value}
                control={
                  <Checkbox
                    checked={ocasiao.includes(op.value)}
                    onChange={(e) => {
                      if (e.target.checked) setOcasiao([...ocasiao, op.value]);
                      else setOcasiao(ocasiao.filter(v => v !== op.value));
                    }}
                    size="small"
                  />
                }
                label={op.label}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Marque as ocasiões para que este produto apareça nos filtros da loja (ex: "Presenteie com Amor")
          </Typography>
        </Box>
        <Button variant="contained" fullWidth size="large" onClick={salvarProduto}>
          {editingId ? "SALVAR ALTERAÇÕES" : "CADASTRAR PRODUTO"}
        </Button>
      </Paper>

      {/* Seção de Produtos Agregados */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2} color="secondary">Produtos Agregados / Extras (Opcionais para o Cliente)</Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Como funciona:</strong> Cadastre itens extras (como Embalagens, Cartões ou Adicionais) como produtos normais primeiro. 
          Depois, pesquise e selecione-os abaixo para vinculá-los a este produto. 
          O cliente poderá escolher adicioná-los ao carrinho na hora da compra.
        </Alert>
        
        <Box display="flex" gap={2} mb={3}>
          <Autocomplete
            fullWidth
            options={listaProdutos.filter(p => p.nome !== nome)} // Seleciona de Produtos, não ingredientes
            getOptionLabel={(option) => `${option.nome} (R$ ${Number(option.preco_venda).toFixed(2)})`}
            value={agregadoSelecionado}
            onChange={(event, newValue) => setAgregadoSelecionado(newValue)}
            renderInput={(params) => <TextField {...params} label="Buscar Produto Extra" />}
          />
          <TextField label="Preço Venda (R$)" type="number" sx={{ width: 150 }} value={agregadoPreco} onChange={(e) => setAgregadoPreco(e.target.value)} />
          <Button variant="outlined" onClick={adicionarAgregado}>Adicionar</Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Produto Extra</TableCell><TableCell align="right">Preço (+)</TableCell><TableCell align="center">Ação</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {agregados.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>{item.nome}</TableCell>
                <TableCell align="right">R$ {Number(item.preco).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton color="error" size="small" onClick={() => setAgregados(agregados.filter((_, i) => i !== index))}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="h5" mb={2} fontWeight="bold">Produtos Já Cadastrados</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Ocasião</TableCell>
              <TableCell align="right">Preço Venda</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listaProdutos.map((prod) => (
              <TableRow key={prod.id} sx={{ bgcolor: editingId === prod.id ? 'rgba(212,88,10,0.05)' : undefined }}>
                <TableCell>{prod.nome}</TableCell>
                <TableCell>
                  {prod.ocasiao
                    ? prod.ocasiao.split(",").filter(Boolean).map(o => (
                        <Chip key={o} label={o} size="small" sx={{ mr: 0.5, fontSize: '0.65rem' }} />
                      ))
                    : <Typography variant="caption" color="text.disabled">—</Typography>
                  }
                </TableCell>
                <TableCell align="right">R$ {Number(prod.preco_venda).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="primary" onClick={() => handleEdit(prod)} title="Editar produto">
                    <Edit fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {listaProdutos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">Nenhum produto encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}