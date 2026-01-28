import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fila de logs para armazenar histórico
const logQueue = [];

function broadcastLog(msg) {
  const message = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logQueue.push(message);
  if (logQueue.length > 500) logQueue.shift(); // Mantém os últimos 500 logs

  BrowserWindow.getAllWindows().forEach(w => {
    if (!w.isDestroyed()) {
      w.webContents.send('server-log', message);
    }
  });
}

let backendProcess = null;

function startBackend() {
  const isDev = !app.isPackaged;
  let scriptPath;
  let cwd;

  if (isDev) {
    scriptPath = path.join(__dirname, '../backend/src/server.js');
    cwd = path.join(__dirname, '../backend');
  } else {
    // Em produção, assume-se que a pasta backend foi copiada para resources via extraResources
    scriptPath = path.join(process.resourcesPath, 'backend/src/server.js');
    cwd = path.join(process.resourcesPath, 'backend');
  }

  const startMsg = `Iniciando Backend em: ${scriptPath}`;
  console.log(startMsg);
  broadcastLog(startMsg);

  if (!fs.existsSync(scriptPath)) {
    const errMsg = `❌ ERRO CRÍTICO: Arquivo do servidor não encontrado em: ${scriptPath}\nVerifique se a pasta 'backend' foi copiada corretamente no build (extraResources).`;
    console.error(errMsg);
    broadcastLog(errMsg);
    return;
  }

  try {
    backendProcess = spawn(process.execPath, [scriptPath], {
      cwd: cwd,
      env: { ...process.env, PORT: '3333', ELECTRON_RUN_AS_NODE: '1' }
    });
    
    // Captura logs normais (console.log)
    backendProcess.stdout.on('data', (data) => {
      const str = data.toString().trim();
      if (str) broadcastLog(`[API] ${str}`);
    });

    // Captura erros (console.error)
    backendProcess.stderr.on('data', (data) => {
      const str = data.toString().trim();
      if (str) broadcastLog(`[API ERRO] ${str}`);
    });
    
    backendProcess.on('error', (err) => broadcastLog(`❌ Falha ao iniciar processo: ${err.message}`));
    backendProcess.on('exit', (code, signal) => {
      broadcastLog(`Backend encerrado. Código: ${code}, Sinal: ${signal}`);
    });
  } catch (e) {
    console.error('Falha ao spawnar backend:', e);
    broadcastLog(`❌ Exceção ao iniciar backend: ${e.message}`);
  }
}

function createWindow() {
  // Cria a janela do navegador.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Permite comunicação simples para este exemplo
    },
    icon: path.join(__dirname, 'public/icon.png') // Se tiver um ícone
  });

  // Em desenvolvimento, carrega o servidor do Vite.
  // Em produção (build), carrega o arquivo index.html gerado.
  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Remove o menu padrão (opcional)
  // win.setMenu(null);
}

// Permite que o frontend peça o histórico de logs ao abrir a tela
ipcMain.on('request-logs', (event) => {
  event.sender.send('server-log-history', logQueue);
});

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});