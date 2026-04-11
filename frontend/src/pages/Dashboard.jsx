import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Container,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert
} from "@mui/material";
import { Edit, Delete, Add, CloudUpload, Star, StarBorder, Calculate, Refresh, ContentCopy, Visibility, VisibilityOff } from "@mui/icons-material";

export default function Dashboard() {
  const [produtos, setProdutos] = useState([]);
  const navigate = useNavigate();
  const [allIngredientes, setAllIngredientes] = useState([]); // Para o select do modal
  const [allProductsList, setAllProductsList] = useState([]); // Para select de agregados
  const [searchTerm, setSearchTerm] = useState("");

  // Estados do Modal de Edição
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [newIngId, setNewIngId] = useState("");
  const [editRendimento, setEditRendimento] = useState(1);
  const [newIngQtd, setNewIngQtd] = useState("");
  const [editMargem, setEditMargem] = useState(0);
  const [editMargemRevenda, setEditMargemRevenda] = useState(0);
  const [newIngApenasRevenda, setNewIngApenasRevenda] = useState(false);
  const [editEhAgregado, setEditEhAgregado] = useState(false);
  const [editCustoManual, setEditCustoManual] = useState("");
  const [editEstoqueManual, setEditEstoqueManual] = useState("");
  const [editOcasiao, setEditOcasiao] = useState([]);

  const [OCASIOES, setOCASOES] = useState([]);

  const [isRecalculating, setIsRecalculating] = useState(false);

  // Estados para Agregados no Modal
  const [newAgregado, setNewAgregado] = useState(null);
  const [newAgregadoPreco, setNewAgregadoPreco] = useState("");

  const loadData = async () => {
    await api.get("/produtos").then((res) => setProdutos(Array.isArray(res.data) ? res.data : []));
    api.get("/ingredientes").then((res) => setAllIngredientes(Array.isArray(res.data) ? res.data : []));
  };

  useEffect(() => {
    loadData();
    api.get("/configuracoes").then(res => {
      if (res.data?.ocasioes) {
        try { setOCASOES(JSON.parse(res.data.ocasioes)); } catch (e) {}
      }
    });
  }, []);

  // Atualiza lista de produtos para o select de agregados sempre que produtos muda
  useEffect(() => { setAllProductsList(produtos); }, [produtos]);

  // Função para forçar o recalculo dos custos buscando dados frescos
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    await loadData();
    setTimeout(() => {
      setIsRecalculating(false);
      alert("Custos recalculados com base nos preços atuais dos ingredientes!");
    }, 500);
  };

  // Função para calcular custo baseado nos ingredientes retornados pelo backend
  const calcularCusto = (ingredientes) => {
    if (!ingredientes || !Array.isArray(ingredientes)) return 0;
    return ingredientes.reduce((acc, ing) => {
      if (ing.apenas_revenda) return acc; // Ignora se for apenas revenda

      const custoBase = Number(ing.custo_base) || 0;
      // Garante que não haja divisão por zero, assumindo 1 se for 0 ou inválido
      const estoqueBase = Number(ing.estoque_base) > 0 ? Number(ing.estoque_base) : 1; 
      const qtd = Number(ing.quantidade) || 0;
      
      const custoUnitario = Number((custoBase / estoqueBase).toFixed(4)); // Arredonda unitário para 4 casas para precisão
      return acc + (custoUnitario * qtd);
    }, 0);
  };

  // Calcula custo apenas dos itens marcados para revenda
  const calcularCustoRevenda = (ingredientes) => {
    if (!ingredientes || !Array.isArray(ingredientes)) return 0;
    return ingredientes.reduce((acc, ing) => {
      if (!ing.usado_para_revenda && !ing.apenas_revenda) return acc; // Soma se for revenda (flag ingrediente) OU apenas revenda (flag item)
      
      const custoBase = Number(ing.custo_base) || 0;
      const estoqueBase = Number(ing.estoque_base) > 0 ? Number(ing.estoque_base) : 1;
      const qtd = Number(ing.quantidade) || 0;
      const custoUnitario = Number((custoBase / estoqueBase).toFixed(4));
      return acc + (custoUnitario * qtd);
    }, 0);
  };

  // --- Lógica de Edição ---

  const handleEditClick = (prod) => {
    // Cria uma cópia profunda para editar sem afetar a lista principal imediatamente
    const rendimento = Number(prod.rendimento) || 1;
    const custoReceita = calcularCusto(prod.ingredientes);
    const custoUnitario = custoReceita / rendimento;
    const preco = Number(prod.preco_venda) || 0;
    const lucro = preco - custoUnitario;
    const margemInicial = custoUnitario > 0 ? ((lucro / custoUnitario) * 100) : 0;

    setEditMargem(margemInicial.toFixed(2));
    setEditMargemRevenda(prod.margem_revenda || 0);
    
    // Cria cópia e adiciona ID temporário para garantir chaves únicas e estáveis no React
    const prodCopy = JSON.parse(JSON.stringify(prod));
    prodCopy.ingredientes = prodCopy.ingredientes.map((ing, i) => ({
      ...ing,
      _tempId: `existing-${ing.ingrediente_id}-${i}`
    }));
    prodCopy.imagens = prodCopy.imagens || [];
    
    setEditRendimento(rendimento);
    setEditEhAgregado(prodCopy.eh_agregado || false);
    setEditCustoManual(prodCopy.custo || "");
    setEditEstoqueManual(prodCopy.estoque || "");
    setEditOcasiao(prodCopy.ocasiao ? prodCopy.ocasiao.split(",").filter(Boolean) : []);
    // Garante que agregados seja um array (caso venha undefined do backend antigo)
    prodCopy.agregados = prodCopy.agregados || [];
    setEditProduct(prodCopy);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditProduct(null);
    setNewIngId("");
    setNewIngQtd("");
    setEditMargem(0);
    setEditMargemRevenda(0);
    setEditRendimento(1);
    setNewIngApenasRevenda(false);
    setNewAgregado(null);
    setEditOcasiao([]);
    setNewAgregadoPreco("");
    setEditEhAgregado(false);
    setEditCustoManual("");
    setEditEstoqueManual("");
  };

  // Recalcula o preço de venda no modal quando ingredientes ou margem mudam
  useEffect(() => {
    if (open && editProduct) {
      const qtdCookies = Number(editRendimento) || 1;
      const custoReceita = editEhAgregado ? (Number(editCustoManual) || 0) : calcularCusto(editProduct.ingredientes);
      const custoUnitario = custoReceita / qtdCookies;
      const margem = parseFloat(String(editMargem).replace(',', '.')) || 0;
      const novoPreco = custoUnitario * (1 + margem / 100);

      const custoReceitaRevenda = calcularCustoRevenda(editProduct.ingredientes);
      const custoUnitarioRevenda = custoReceitaRevenda / qtdCookies;
      const margemRev = parseFloat(String(editMargemRevenda).replace(',', '.')) || 0;
      const novoPrecoRevenda = custoUnitarioRevenda * (1 + margemRev / 100);
      
      setEditProduct(prev => {
        return { 
          ...prev, 
          preco_venda: novoPreco.toFixed(2),
          preco_revenda: novoPrecoRevenda.toFixed(2)
        };
      });
    } // Adicionada dependência editEhAgregado e editCustoManual
  }, [editProduct ? editProduct.ingredientes : null, editMargem, editMargemRevenda, editRendimento, open, editEhAgregado, editCustoManual]);

  // Manipulador para alteração manual do Preço de Venda (Edição)
  const handleEditPrecoVendaChange = (e) => {
    const novoPreco = parseFloat(e.target.value) || 0;
    setEditProduct({ ...editProduct, preco_venda: novoPreco });
    
    const qtdCookies = Number(editRendimento) || 1;
    const custoReceita = editEhAgregado ? (Number(editCustoManual) || 0) : calcularCusto(editProduct.ingredientes);
    const custoUnitario = custoReceita / qtdCookies;
    
    if (custoUnitario > 0) {
      const novaMargem = ((novoPreco / custoUnitario) - 1) * 100;
      setEditMargem(novaMargem.toFixed(2));
    }
  };

  // Manipulador para alteração manual do Preço de Revenda (Edição)
  const handleEditPrecoRevendaChange = (e) => {
    const novoPreco = parseFloat(e.target.value) || 0;
    setEditProduct({ ...editProduct, preco_revenda: novoPreco });
    
    const qtdCookies = Number(editRendimento) || 1;
    const custoReceita = calcularCustoRevenda(editProduct.ingredientes);
    const custoUnitario = custoReceita / qtdCookies;
    
    if (custoUnitario > 0) {
      const novaMargem = ((novoPreco / custoUnitario) - 1) * 100;
      setEditMargemRevenda(novaMargem.toFixed(2));
    }
  };

  const handleAddIngredientToEdit = () => {
    if (!newIngId || !newIngQtd) return;
    if (!Array.isArray(allIngredientes)) return;
    const ingOriginal = allIngredientes.find(i => i.id === newIngId);
    if (!ingOriginal) return;

    const novoItem = {
      ingrediente_id: ingOriginal.id,
      nome: ingOriginal.nome,
      quantidade: Number(newIngQtd),
      unidade: ingOriginal.unidade,
      custo_base: ingOriginal.custo, // Mapeando para manter compatibilidade com calcularCusto
      estoque_base: ingOriginal.estoque,
      apenas_revenda: newIngApenasRevenda,
      _tempId: `new-${Date.now()}-${Math.random()}` // ID único para o React
    };

    setEditProduct(prev => ({
      ...prev,
      ingredientes: [...prev.ingredientes, novoItem]
    }));
    setNewIngId("");
    setNewIngQtd("");
    setNewIngApenasRevenda(false);
  };

  const handleRemoveIngredientFromEdit = (index) => {
    const novosIngredientes = [...editProduct.ingredientes];
    novosIngredientes.splice(index, 1);
    setEditProduct({ ...editProduct, ingredientes: novosIngredientes });
  };

  // --- Lógica de Imagens no Modal ---
  const handleImageChangeEdit = async (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length + (editProduct.imagens?.length || 0) > 4) {
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
                imagem: canvas.toDataURL('image/jpeg', 0.7),
                eh_capa: false
              });
            };
          };
        });
      });

      const newImages = await Promise.all(newImagesPromises);
      const currentImages = editProduct.imagens || [];
      if (currentImages.length === 0 && newImages.length > 0) newImages[0].eh_capa = true;

      setEditProduct({ ...editProduct, imagens: [...currentImages, ...newImages] });
    }
  };

  const handleRemoveImageEdit = (index) => {
    const newImagens = [...editProduct.imagens];
    const wasCapa = newImagens[index].eh_capa;
    newImagens.splice(index, 1);
    if (wasCapa && newImagens.length > 0) newImagens[0].eh_capa = true;
    setEditProduct({ ...editProduct, imagens: newImagens });
  };

  const handleSetCapaEdit = (index) => {
    const newImagens = editProduct.imagens.map((img, i) => ({ ...img, eh_capa: i === index }));
    setEditProduct({ ...editProduct, imagens: newImagens });
  };

  const handleAddAgregadoEdit = () => {
    if (!newAgregado || !newAgregadoPreco) return;
    if (editProduct.agregados.some(a => a.id === newAgregado.id)) return alert("Já adicionado.");
    setEditProduct(prev => ({ ...prev, agregados: [...prev.agregados, { ...newAgregado, original_id: newAgregado.id, preco: Number(newAgregadoPreco) }] }));
    setNewAgregado(null);
    setNewAgregadoPreco("");
  };

  const handleRemoveAgregadoEdit = (index) => {
    setEditProduct(prev => ({ ...prev, agregados: prev.agregados.filter((_, i) => i !== index) }));
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        nome: editProduct.nome,
        descricao: editProduct.descricao,
        preco_venda: Number(editProduct.preco_venda),
        rendimento: Number(editRendimento),
        margem_revenda: Number(editMargemRevenda),
        preco_revenda: Number(editProduct.preco_revenda),
        ingredientes: editProduct.ingredientes.map(ing => ({
          ingrediente_id: ing.ingrediente_id,
          quantidade: Number(ing.quantidade),
          apenas_revenda: ing.apenas_revenda
        })),
        imagens: editProduct.imagens || [],
        eh_destaque: editProduct.eh_destaque,
        desconto_destaque: Number(editProduct.desconto_destaque),
        agregados: editProduct.agregados?.map(a => ({ id: a.id, preco: Number(a.preco) })) || [],
        eh_agregado: editEhAgregado,
        ocasiao: editOcasiao.join(","),
        ...(editEhAgregado && {
          custo: Number(editCustoManual),
          estoque: Number(editEstoqueManual)
        })
      };
      await api.put(`/produtos/${editProduct.id}`, payload);
      alert("Produto atualizado!");
      handleClose();
      loadData();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar produto.");
    }
  };

  const handleDuplicateProduct = () => {
    if (!editProduct) return;

    // Calcula a margem de venda atual para passar para a tela de duplicação
    const rendimento = Number(editRendimento) || 1;
    const custoReceita = calcularCusto(editProduct.ingredientes);
    const custoUnitario = custoReceita / rendimento;
    const preco = Number(editProduct.preco_venda) || 0;
    const margemVenda = custoUnitario > 0 ? (((preco / custoUnitario) - 1) * 100) : 0;

    const productToDuplicate = {
      ...editProduct,
      nome: `${editProduct.nome} (Cópia)`,
      margem_venda: margemVenda,
    };

    navigate('/produtos/novo', { state: { productToDuplicate } });
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    await api.delete(`/produtos/${id}`);
    loadData();
  };

  const handleToggleAtivo = async (prod) => {
    try {
      await api.patch(`/produtos/${prod.id}/ativo`, { ativo: !prod.ativo });
      loadData();
    } catch (err) {
      alert("Erro ao alterar status do produto.");
    }
  };

  const handleToggleDestaque = async (prod) => {
    try {
      await api.patch(`/produtos/${prod.id}/destaque`, { eh_destaque: !prod.eh_destaque });
      loadData(); // Recarrega a lista para atualizar os ícones
    } catch (err) {
      alert("Erro ao alterar destaque.");
    }
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" mb={3} fontWeight="bold">Consulta Produto</Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField 
          label="Buscar Produto" 
          variant="outlined" 
          fullWidth 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={handleRecalculate}
          startIcon={isRecalculating ? <Refresh sx={{ animation: 'spin 1s linear infinite' }} /> : <Calculate />}
          sx={{ whiteSpace: 'nowrap', minWidth: '180px' }}
        >
          {isRecalculating ? "Calculando..." : "Recalcular Custos"}
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Produto / Estoque</strong></TableCell>
              <TableCell rowSpan={2} align="center" sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Img</strong></TableCell>
              <TableCell rowSpan={2} align="center" sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Dest.</strong></TableCell>
              <TableCell rowSpan={2} align="center" sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Ativo</strong></TableCell>
              <TableCell colSpan={3} align="center" sx={{ bgcolor: '#FFF8E1', color: '#F57F17', borderBottom: '1px solid #FFE0B2' }}><strong>REVENDA</strong></TableCell>
              <TableCell colSpan={3} align="center" sx={{ bgcolor: '#EFEBE9', color: '#3E2723', borderBottom: '1px solid #D7CCC8' }}><strong>VENDA</strong></TableCell>
              <TableCell rowSpan={2} align="center" sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Ações</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="right" sx={{ bgcolor: '#FFF8E1', color: '#E65100' }}><strong>Custo</strong></TableCell>
              <TableCell align="right" sx={{ bgcolor: '#FFF8E1', color: '#E65100' }}><strong>Preço</strong></TableCell>
              <TableCell align="right" sx={{ bgcolor: '#FFF8E1', color: '#E65100' }}><strong>Margem</strong></TableCell>
              <TableCell align="right" sx={{ bgcolor: '#EFEBE9', color: '#3E2723' }}><strong>Custo</strong></TableCell>
              <TableCell align="right" sx={{ bgcolor: '#EFEBE9', color: '#3E2723' }}><strong>Preço</strong></TableCell>
              <TableCell align="right" sx={{ bgcolor: '#EFEBE9', color: '#3E2723' }}><strong>Margem</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtos
              .filter(prod => prod.nome.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((prod) => {
              const rendimento = Number(prod.rendimento) || 1;
              const custoReceita = calcularCusto(prod.ingredientes);
              const custoUnitario = custoReceita / rendimento;

              const custoReceitaRevenda = calcularCustoRevenda(prod.ingredientes);
              const custoUnitarioRevenda = custoReceitaRevenda / rendimento;
              const margemRevenda = Number(prod.margem_revenda) || 0;
              const precoRevenda = custoUnitarioRevenda * (1 + margemRevenda / 100);

              const preco = Number(prod.preco_venda) || 0;
              const lucro = preco - custoUnitario;
              const margem = custoUnitario > 0 ? ((lucro / custoUnitario) * 100) : 0;

              const capa = prod.imagens?.find(img => img.eh_capa) || prod.imagens?.[0];

              return (
                <TableRow key={prod.id} sx={{ opacity: prod.ativo ? 1 : 0.6, bgcolor: prod.ativo ? 'inherit' : '#f5f5f5' }}>
                  <TableCell>
                    {prod.nome} <Typography variant="caption" color="text.secondary">({rendimento} un)</Typography>
                    <Typography variant="body2" fontWeight="bold" color={Number(prod.estoque) <= 0 ? 'error' : 'text.primary'}>Est: {Number(prod.estoque)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {capa ? <img src={capa.imagem} alt={prod.nome} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} /> : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleToggleDestaque(prod)} color={prod.eh_destaque ? "warning" : "default"}>
                      {prod.eh_destaque ? <Star /> : <StarBorder />}
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleToggleAtivo(prod)} color={prod.ativo ? "success" : "default"} title={prod.ativo ? "Produto Ativo (Visível)" : "Produto Inativo (Oculto)"}>
                      {prod.ativo ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#FFF8E1', color: '#E65100' }}>R$ {custoUnitarioRevenda.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#FFF8E1', color: "secondary.main", fontWeight: 'bold' }}>R$ {precoRevenda.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#FFF8E1' }}>{margemRevenda.toFixed(2)}%</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#EFEBE9', color: '#3E2723' }}>R$ {custoUnitario.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#EFEBE9', color: "primary.main", fontWeight: "bold" }}>
                    R$ {preco.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#EFEBE9' }}>
                    <Chip 
                      label={`${margem.toFixed(1)}%`} 
                      color={margem > 0 ? "success" : "error"} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleEditClick(prod)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDeleteProduct(prod.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {produtos.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center">Nenhum produto cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Editar Produto</DialogTitle>
        <DialogContent>
          {editProduct && (
            <Box sx={{ mt: 1 }}>
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>Imagens</Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {editProduct.imagens?.map((img, index) => (
                    <Box key={index} position="relative" width={80} height={80} sx={{ border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                      <img src={img.imagem} alt={`Img ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveImageEdit(index)}
                        sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color={img.eh_capa ? "warning" : "default"}
                        onClick={() => handleSetCapaEdit(index)}
                        sx={{ position: 'absolute', bottom: 0, left: 0, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5 }}
                      >
                        {img.eh_capa ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                      </IconButton>
                    </Box>
                  ))}
                  {(editProduct.imagens?.length || 0) < 4 && (
                    <Button component="label" variant="outlined" sx={{ width: 80, height: 80, borderRadius: 2 }}>
                      <CloudUpload /><input type="file" hidden multiple accept="image/*" onChange={handleImageChangeEdit} />
                    </Button>
                  )}
                </Box>
              </Box>

              <Box display="flex" gap={2} mb={3} alignItems="center" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                <FormControlLabel 
                  control={<Checkbox checked={editProduct.eh_destaque || false} onChange={(e) => setEditProduct({...editProduct, eh_destaque: e.target.checked})} />} 
                  label="Destaque" 
                />
                <FormControlLabel 
                  control={<Checkbox checked={editProduct.ativo !== false} onChange={(e) => setEditProduct({...editProduct, ativo: e.target.checked})} />} 
                  label="Ativo no Cardápio" 
                />
                <FormControlLabel 
                  control={<Checkbox checked={editEhAgregado} onChange={(e) => setEditEhAgregado(e.target.checked)} />} 
                  label="É Produto Agregado / Extra" 
                />
                {editProduct.eh_destaque && (
                  <TextField label="% Desconto" type="number" size="small" sx={{ width: 150 }} value={editProduct.desconto_destaque || 0} onChange={(e) => setEditProduct({...editProduct, desconto_destaque: e.target.value})} />
                )}
              </Box>

              <Grid container spacing={2} mb={3}>
                <Grid item xs={12}>
                  <TextField 
                    label="Descrição do Produto" 
                    multiline 
                    rows={3} 
                    fullWidth 
                    value={editProduct.descricao || ""} 
                    onChange={(e) => setEditProduct({...editProduct, descricao: e.target.value})} 
                    inputProps={{ maxLength: 1000 }}
                    helperText={`${(editProduct.descricao || "").length}/1000`}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField 
                    label="Nome do Produto" 
                    fullWidth 
                    value={editProduct.nome} 
                    onChange={(e) => setEditProduct({...editProduct, nome: e.target.value})} 
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField 
                    label="Rendimento" 
                    type="number" fullWidth 
                    value={editRendimento} 
                    onChange={(e) => setEditRendimento(e.target.value)} />
                </Grid>
                <Grid item xs={3}>
                  <TextField 
                    label={editEhAgregado ? "Custo (Manual)" : "Custo Total (Receita)"}
                    value={editEhAgregado ? editCustoManual : `R$ ${calcularCusto(editProduct.ingredientes).toFixed(2)}`}
                    onChange={editEhAgregado ? (e) => setEditCustoManual(e.target.value) : undefined}
                    InputProps={{ readOnly: !editEhAgregado }}
                    fullWidth
                    type={editEhAgregado ? "number" : "text"}
                    variant="filled"
                  />
                </Grid>
                
                {/* Grupo Venda */}
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#EFEBE9', height: '100%', borderColor: '#D7CCC8' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight="bold" mb={2}>VENDA</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <TextField label="Margem (%)" type="number" fullWidth value={editMargem} onChange={(e) => setEditMargem(e.target.value)} />
                      <TextField 
                        label="Custo Unitário" 
                        value={`R$ ${(editEhAgregado ? (Number(editCustoManual) || 0) : calcularCusto(editProduct.ingredientes) / (Number(editRendimento) || 1)).toFixed(2)}`} 
                        fullWidth InputProps={{ readOnly: true }} variant="filled" 
                      />
                      <TextField 
                        label="Preço de Venda" 
                        type="number"
                        fullWidth 
                        value={editProduct.preco_venda} 
                        onChange={handleEditPrecoVendaChange}
                        sx={{ "& input": { color: 'primary.main', fontWeight: 'bold' } }} />
                      {editEhAgregado && (
                        <TextField label="Estoque Atual" type="number" fullWidth value={editEstoqueManual} onChange={(e) => setEditEstoqueManual(e.target.value)} />
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Grupo Revenda */}
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FFF8E1', height: '100%', borderColor: '#FFE0B2' }}>
                    <Typography variant="subtitle2" color="secondary" fontWeight="bold" mb={2}>REVENDA</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <TextField label="Margem Revenda (%)" type="number" fullWidth value={editMargemRevenda} onChange={(e) => setEditMargemRevenda(e.target.value)} />
                      <TextField label="Custo Revenda (Unitário)" value={`R$ ${(calcularCustoRevenda(editProduct.ingredientes) / (Number(editRendimento) || 1)).toFixed(2)}`} fullWidth InputProps={{ readOnly: true }} variant="filled" sx={{ "& input": { color: 'gray' } }} />
                      <TextField 
                        label="Preço Revenda" 
                        type="number"
                        fullWidth 
                        value={editProduct.preco_revenda || 0} 
                        onChange={handleEditPrecoRevendaChange}
                        sx={{ "& input": { color: 'green', fontWeight: 'bold' } }} />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {!editEhAgregado && (
                <>
                <Typography variant="h6" gutterBottom>Ingredientes</Typography>
                
                {/* Adicionar novo ingrediente no modal */}
                <Box display="flex" gap={1} mb={2} alignItems="center">
                    <Autocomplete
                    fullWidth
                    size="small"
                    options={Array.isArray(allIngredientes) ? allIngredientes : []}
                    getOptionLabel={(option) => `${option.nome} (${option.unidade})`}
                    value={(Array.isArray(allIngredientes) ? allIngredientes.find((i) => i.id === newIngId) : null) || null}
                    onChange={(event, newValue) => {
                        setNewIngId(newValue ? newValue.id : "");
                    }}
                    renderInput={(params) => <TextField {...params} label="Adicionar Ingrediente" />}
                    />
                    <TextField 
                    label="Qtd" 
                    type="number" 
                    size="small" 
                    sx={{ width: 100 }} 
                    value={newIngQtd} 
                    onChange={(e) => setNewIngQtd(e.target.value)} 
                    />
                    <FormControlLabel 
                    control={<Checkbox checked={newIngApenasRevenda} onChange={(e) => setNewIngApenasRevenda(e.target.checked)} />} 
                    label="Apenas Revenda" 
                    sx={{ whiteSpace: 'nowrap' }}
                    />
                    <Button variant="contained" onClick={handleAddIngredientToEdit}><Add /></Button>
                </Box>

                {/* Lista de ingredientes do produto em edição */}
                <Table size="small">
                    <TableHead>
                    <TableRow>
                        <TableCell>Ingrediente</TableCell>
                        <TableCell>Qtd</TableCell>
                        <TableCell align="right">Custo</TableCell>
                        <TableCell align="right">Ação</TableCell>
                    </TableRow>
                    </TableHead>
                    <TableBody>
                    {editProduct.ingredientes.map((ing, idx) => {
                        const custoBase = Number(ing.custo_base) || 0;
                        const estoqueBase = Number(ing.estoque_base) || 1;
                        const custoItem = (custoBase / estoqueBase) * Number(ing.quantidade);

                        return (
                        <TableRow key={ing._tempId} sx={ing.apenas_revenda ? { bgcolor: '#FFF8E1' } : {}}>
                            <TableCell>{ing.nome} {ing.apenas_revenda && <Typography variant="caption" color="secondary" fontWeight="bold">(Revenda)</Typography>}</TableCell>
                            <TableCell>{`${ing.quantidade} ${ing.unidade}`}</TableCell>
                            <TableCell align="right">R$ {custoItem.toFixed(4)}</TableCell>
                            <TableCell align="right">
                            <IconButton size="small" color="error" onClick={() => handleRemoveIngredientFromEdit(idx)}><Delete fontSize="small" /></IconButton>
                            </TableCell>
                        </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
                </>
              )}

              {/* Seção de Agregados no Modal de Edição */}
              <Typography variant="subtitle1" fontWeight="bold" mt={3} mb={1} color="secondary">
                Produtos Agregados / Extras
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Como funciona:</strong> Cadastre itens extras (Embalagens, Adicionais) como produtos normais. 
                Selecione-os abaixo para vinculá-los. 
                O cliente poderá escolher adicioná-los ao carrinho na hora da compra.
              </Alert>

              <Box display="flex" gap={1} mb={2} alignItems="center">
                <Autocomplete
                  fullWidth
                  size="small"
                  options={allProductsList.filter(p => p.id !== editProduct.id)}
                  getOptionLabel={(option) => `${option.nome} (R$ ${Number(option.preco_venda).toFixed(2)})`}
                  value={newAgregado}
                  onChange={(event, newValue) => setNewAgregado(newValue)}
                  renderInput={(params) => <TextField {...params} label="Produto Extra" />}
                />
                <TextField label="Preço (R$)" type="number" size="small" sx={{ width: 120 }} value={newAgregadoPreco} onChange={(e) => setNewAgregadoPreco(e.target.value)} />
                <Button variant="outlined" onClick={handleAddAgregadoEdit}><Add /></Button>
              </Box>
              <Table size="small">
                <TableHead><TableRow><TableCell>Produto</TableCell><TableCell align="right">Preço</TableCell><TableCell align="right">Ação</TableCell></TableRow></TableHead>
                <TableBody>
                  {editProduct.agregados?.map((ag, idx) => (
                    <TableRow key={ag.id}>
                      <TableCell>{ag.nome}</TableCell>
                      <TableCell align="right">R$ {Number(ag.preco).toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleRemoveAgregadoEdit(idx)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* OCASIÃO */}
              <Box mt={3}>
                <Typography variant="subtitle1" fontWeight="bold" mb={1} color="secondary">
                  Ocasião / Presentear
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {OCASIOES.map(op => (
                    <FormControlLabel
                      key={op.value}
                      control={
                        <Checkbox
                          checked={editOcasiao.includes(op.value)}
                          onChange={(e) => {
                            if (e.target.checked) setEditOcasiao([...editOcasiao, op.value]);
                            else setEditOcasiao(editOcasiao.filter(v => v !== op.value));
                          }}
                          size="small"
                        />
                      }
                      label={op.label}
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Marque para exibir este produto na seção "Presenteie com Amor" da loja
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDuplicateProduct} color="secondary" startIcon={<ContentCopy />}>
            Duplicar
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">Salvar</Button>
        </DialogActions>
      </Dialog>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
  );
}