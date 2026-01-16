import { useEffect, useState } from "react";
import api from "../services/api";
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
  Grid,
  Container,
  FormControlLabel,
  Checkbox
} from "@mui/material";
import { Edit, Delete, Add, CloudUpload, Star, StarBorder } from "@mui/icons-material";

export default function Dashboard() {
  const [produtos, setProdutos] = useState([]);
  const [allIngredientes, setAllIngredientes] = useState([]); // Para o select do modal
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

  const loadData = () => {
    api.get("/produtos").then((res) => setProdutos(Array.isArray(res.data) ? res.data : []));
    api.get("/ingredientes").then((res) => setAllIngredientes(Array.isArray(res.data) ? res.data : []));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Função para calcular custo baseado nos ingredientes retornados pelo backend
  const calcularCusto = (ingredientes) => {
    if (!ingredientes || !Array.isArray(ingredientes)) return 0;
    return ingredientes.reduce((acc, ing) => {
      if (ing.apenas_revenda) return acc; // Ignora se for apenas revenda

      const custoBase = Number(ing.custo_base) || 0;
      const estoqueBase = Number(ing.estoque_base) || 1; // Evita divisão por zero
      const qtd = Number(ing.quantidade) || 0;
      
      if (estoqueBase === 0) return acc;
      const custoUnitario = custoBase / estoqueBase;
      return acc + (custoUnitario * qtd);
    }, 0);
  };

  // Calcula custo apenas dos itens marcados para revenda
  const calcularCustoRevenda = (ingredientes) => {
    if (!ingredientes || !Array.isArray(ingredientes)) return 0;
    return ingredientes.reduce((acc, ing) => {
      if (!ing.usado_para_revenda && !ing.apenas_revenda) return acc; // Soma se for revenda (flag ingrediente) OU apenas revenda (flag item)
      
      const custoBase = Number(ing.custo_base) || 0;
      const estoqueBase = Number(ing.estoque_base) || 1;
      const qtd = Number(ing.quantidade) || 0;
      return acc + ((custoBase / estoqueBase) * qtd);
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
  };

  // Recalcula o preço de venda no modal quando ingredientes ou margem mudam
  useEffect(() => {
    if (open && editProduct) {
      const qtdCookies = Number(editRendimento) || 1;
      const custoReceita = calcularCusto(editProduct.ingredientes);
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
    }
  }, [editProduct ? editProduct.ingredientes : null, editMargem, editMargemRevenda, editRendimento, open]);

  // Manipulador para alteração manual do Preço de Venda (Edição)
  const handleEditPrecoVendaChange = (e) => {
    const novoPreco = parseFloat(e.target.value) || 0;
    setEditProduct({ ...editProduct, preco_venda: novoPreco });
    
    const qtdCookies = Number(editRendimento) || 1;
    const custoReceita = calcularCusto(editProduct.ingredientes);
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
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve({
            imagem: reader.result,
            eh_capa: false
          });
          reader.onerror = error => reject(error);
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

  const handleSaveEdit = async () => {
    try {
      const payload = {
        nome: editProduct.nome,
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
        desconto_destaque: Number(editProduct.desconto_destaque)
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

  const handleDeleteProduct = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    await api.delete(`/produtos/${id}`);
    loadData();
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
              <TableCell rowSpan={2} sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Produto / Estoque</strong></TableCell>
              <TableCell rowSpan={2} align="center" sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Imagem</strong></TableCell>
              <TableCell rowSpan={2} align="center" sx={{ bgcolor: '#FFF', borderBottom: '1px solid #D7CCC8' }}><strong>Destaque</strong></TableCell>
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
                <TableRow key={prod.id}>
                  <TableCell>
                    {prod.nome} <Typography variant="caption" color="text.secondary">({rendimento} un)</Typography>
                    <Typography variant="body2" fontWeight="bold" color={Number(prod.estoque) <= 0 ? 'error' : 'text.primary'}>Estoque: {Number(prod.estoque)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {capa ? <img src={capa.imagem} alt={prod.nome} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} /> : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleToggleDestaque(prod)} color={prod.eh_destaque ? "warning" : "default"}>
                      {prod.eh_destaque ? <Star /> : <StarBorder />}
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
                <TableCell colSpan={4} align="center">Nenhum produto cadastrado.</TableCell>
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
                  label="Produto Destaque (Promoção)" 
                />
                {editProduct.eh_destaque && (
                  <TextField label="% Desconto" type="number" size="small" sx={{ width: 150 }} value={editProduct.desconto_destaque || 0} onChange={(e) => setEditProduct({...editProduct, desconto_destaque: e.target.value})} />
                )}
              </Box>

              <Grid container spacing={2} mb={3}>
                <Grid size={8}>
                  <TextField 
                    label="Nome do Produto" 
                    fullWidth 
                    value={editProduct.nome} 
                    onChange={(e) => setEditProduct({...editProduct, nome: e.target.value})} 
                  />
                </Grid>
                <Grid size={4}>
                  <TextField 
                    label="Rendimento" 
                    type="number" fullWidth 
                    value={editRendimento} 
                    onChange={(e) => setEditRendimento(e.target.value)} />
                </Grid>
                
                {/* Grupo Venda */}
                <Grid size={6}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#EFEBE9', height: '100%', borderColor: '#D7CCC8' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight="bold" mb={2}>VENDA</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <TextField label="Margem (%)" type="number" fullWidth value={editMargem} onChange={(e) => setEditMargem(e.target.value)} />
                      <TextField label="Custo Unitário" value={`R$ ${(calcularCusto(editProduct.ingredientes) / (Number(editRendimento) || 1)).toFixed(2)}`} fullWidth InputProps={{ readOnly: true }} variant="filled" />
                      <TextField 
                        label="Preço de Venda" 
                        type="number"
                        fullWidth 
                        value={editProduct.preco_venda} 
                        onChange={handleEditPrecoVendaChange}
                        sx={{ "& input": { color: 'primary.main', fontWeight: 'bold' } }} />
                    </Box>
                  </Paper>
                </Grid>

                {/* Grupo Revenda */}
                <Grid size={6}>
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
                      <TableRow key={ing._tempId}>
                        <TableCell>{ing.nome} {ing.apenas_revenda && <Typography variant="caption" color="secondary" fontWeight="bold">(Revenda)</Typography>}</TableCell>
                        <TableCell>{`${ing.quantidade} ${ing.unidade}`}</TableCell>
                        <TableCell align="right">R$ {custoItem.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => handleRemoveIngredientFromEdit(idx)}><Delete fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">Salvar Alterações</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}