import { useState, useEffect } from "react";
import api from "../services/api";
import { Box, Typography, Paper, Container, CircularProgress, Alert } from "@mui/material";
import { CheckCircle, Error } from "@mui/icons-material";

export default function SystemStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await api.get("/api/health");
      setStatus(res.data);
    } catch (err) {
      setStatus({ status: "error", database: "disconnected" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" mb={3} fontWeight="bold">Status do Sistema</Typography>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            {status?.status === "ok" ? (
              <CheckCircle sx={{ fontSize: 80, color: "success.main" }} />
            ) : (
              <Error sx={{ fontSize: 80, color: "error.main" }} />
            )}
            <Typography variant="h5">{status?.status === "ok" ? "Sistema Operacional" : "Falha no Sistema"}</Typography>
            
            <Box mt={2} width="100%">
              <Alert severity={status?.database === "connected" ? "success" : "error"} variant="outlined">
                Banco de Dados: {status?.database === "connected" ? "Conectado" : "Desconectado"}
              </Alert>
              <Alert severity="success" variant="outlined" sx={{ mt: 1 }}>
                API Backend: Online
              </Alert>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
}