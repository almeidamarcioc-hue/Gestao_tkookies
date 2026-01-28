import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

// Importação segura do Electron para evitar erros no Vite se não estiver configurado
const electron = window.require ? window.require('electron') : null;

export default function DebugLogs() {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!electron) return;

    // Solicita histórico existente ao montar
    electron.ipcRenderer.send('request-logs');

    const handleHistory = (event, history) => {
      setLogs(history);
    };

    const handleLog = (event, message) => {
      setLogs(prev => [...prev, message]);
    };

    electron.ipcRenderer.on('server-log-history', handleHistory);
    electron.ipcRenderer.on('server-log', handleLog);

    return () => {
      electron.ipcRenderer.removeListener('server-log-history', handleHistory);
      electron.ipcRenderer.removeListener('server-log', handleLog);
    };
  }, []);

  // Auto-scroll para o final
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!electron) {
    return (
      <Paper sx={{ p: 2, mt: 2, bgcolor: '#fdeded' }}>
        <Typography color="error">
          Modo Web detectado. Logs do sistema só aparecem no aplicativo Desktop (Electron).
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2, bgcolor: '#1e1e1e', color: '#00ff00', fontFamily: 'monospace', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, borderBottom: '1px solid #333', pb: 1 }}>
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold' }}>
          🖥️ Logs do Sistema (Backend & Banco)
        </Typography>
        <Button size="small" variant="outlined" color="inherit" onClick={() => setLogs([])} sx={{ color: '#fff', borderColor: '#555' }}>
          Limpar
        </Button>
      </Box>
      
      <Box sx={{ 
        maxHeight: '300px', 
        overflowY: 'auto', 
        fontSize: '0.8rem', 
        whiteSpace: 'pre-wrap',
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': { background: '#1e1e1e' },
        '&::-webkit-scrollbar-thumb': { background: '#555', borderRadius: '4px' }
      }}>
        {logs.length === 0 && <Typography sx={{ color: '#666', fontStyle: 'italic' }}>Aguardando inicialização...</Typography>}
        
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '4px', lineHeight: '1.4', wordBreak: 'break-all' }}>
            {log.includes('ERRO') || log.includes('Error') || log.includes('Falha') ? (
              <span style={{ color: '#ff5252' }}>{log}</span>
            ) : log.includes('Iniciando') || log.includes('sucesso') ? (
              <span style={{ color: '#69f0ae' }}>{log}</span>
            ) : (
              log
            )}
          </div>
        ))}
        <div ref={logsEndRef} />
      </Box>
    </Paper>
  );
}
