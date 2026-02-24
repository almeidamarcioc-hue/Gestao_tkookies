import { useState } from "react";
import api from "../services/api";
import { 
  Box, Typography, Paper, TextField, Button, Grid, Table, TableBody, TableCell, 
  TableHead, TableRow, Container, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from "@mui/material";
import { Search, VolunteerActivism, QrCode, ContentCopy, CheckCircle, Close } from "@mui/icons-material";
import { QrCodePix } from "qrcode-pix";
import { QRCodeSVG } from "qrcode.react";

export default function TitheReport() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentGenerated, setPaymentGenerated] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pixPayload, setPixPayload] = useState('');

  async function gerarRelatorio() {
    setLoading(true);
    setPaymentGenerated(false); // Reseta o status de pagamento ao gerar novo relatório
    try {
      const res = await api.get(`/relatorios/dizimo?startDate=${startDate}&endDate=${endDate}`);
      setReportData(res.data);
    } catch (error) {
      alert("Erro ao gerar relatório");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleGeneratePayment() {
    try {
      if (!reportData?.resumo?.valor_dizimo || reportData.resumo.valor_dizimo <= 0) {
        alert("Não há valor de dízimo a ser pago para este período.");
        return;
      }

      const pix = QrCodePix({
        version: '01',
        key: '8879715400005', // CNPJ conforme solicitado
        name: 'TKOOKIES', // Nome do beneficiário
        city: 'TRES DE MAIO', // Cidade do beneficiário
        value: parseFloat(reportData.resumo.valor_dizimo.toFixed(2)),
      });

      setPixPayload(pix.payload());
      setPaymentModalOpen(true);
    } catch (error) {
      console.error("Erro ao gerar PIX. Verifique se as dependências 'qrcode-pix' e 'qrcode.react' estão instaladas.", error);
      alert("Ocorreu um erro ao gerar o QR Code de pagamento. Verifique o console para mais detalhes.");
    }
  }

  const handleCopyPix = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      alert('Código PIX (copia e cola) copiado!');
    }
  };

  const handleConfirmPayment = () => {
    setPaymentModalOpen(false);
    setPaymentGenerated(true);
  };

  const formatMoney = (val) => `R$ ${Number(val).toFixed(2)}`;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" mb={3} fontWeight="bold" display="flex" alignItems="center" gap={1}>
        <VolunteerActivism fontSize="large" color="primary" /> Relatório de Dízimo
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField 
              label="Data Inicial" type="date" fullWidth 
              InputLabelProps={{ shrink: true }} 
              value={startDate} onChange={e => setStartDate(e.target.value)} 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField 
              label="Data Final" type="date" fullWidth 
              InputLabelProps={{ shrink: true }} 
              value={endDate} onChange={e => setEndDate(e.target.value)} 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              variant="contained" fullWidth size="large" 
              startIcon={<Search />} onClick={gerarRelatorio}
              disabled={loading}
            >
              {loading ? "Calculando..." : "Gerar Relatório"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {reportData && (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Vendas</Typography>
                  <Typography variant="h5" fontWeight="bold">{formatMoney(reportData.resumo.total_vendas)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#ffebee' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Custo Estimado</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error">{formatMoney(reportData.resumo.total_custo)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Lucro Operacional</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">{formatMoney(reportData.resumo.lucro_operacional)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#fff8e1', border: '2px solid #ffb300' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom fontWeight="bold">Dízimo (10%)</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary">{formatMoney(reportData.resumo.valor_dizimo)}</Typography>
                  {!paymentGenerated && (
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<QrCode />} 
                      onClick={handleGeneratePayment}
                      sx={{ mt: 1 }}
                    >
                      Gerar Pagamento
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>Detalhamento por Produto</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">Pago</TableCell>
                  <TableCell>Produto</TableCell>
                  <TableCell align="center">Qtd Vendida</TableCell>
                  <TableCell align="right">Total Venda</TableCell>
                  <TableCell align="right">Custo Total</TableCell>
                  <TableCell align="right">Lucro</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.detalhes.map((item) => (
                  <TableRow key={`${item.id}-${item.tipo_cliente}`}>
                    <TableCell align="center">
                      {paymentGenerated && <CheckCircle color="success" />}
                    </TableCell>
                    <TableCell>{item.nome_display || item.nome}</TableCell>
                    <TableCell align="center">{item.qtd_vendida}</TableCell>
                    <TableCell align="right">{formatMoney(item.total_venda)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{formatMoney(item.custo_total)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>{formatMoney(item.lucro)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {/* Modal de Pagamento PIX */}
      <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Pagamento PIX
          <IconButton onClick={() => setPaymentModalOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body2" mb={2}>
            Escaneie o QR Code com o app do seu banco para pagar <strong>{formatMoney(reportData?.resumo?.valor_dizimo)}</strong>.
          </Typography>
          {pixPayload && (
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, display: 'inline-block' }}>
              <QRCodeSVG value={pixPayload} size={256} />
            </Box>
          )}
          <Button
            variant="outlined"
            startIcon={<ContentCopy />}
            onClick={handleCopyPix}
            fullWidth
            sx={{ mt: 2 }}
          >
            Copiar Código PIX
          </Button>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button variant="contained" color="success" onClick={handleConfirmPayment}>
            Marcar como Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}