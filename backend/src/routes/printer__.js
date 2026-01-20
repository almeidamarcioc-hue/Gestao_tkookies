import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { EventEmitter } from "events";

let escpos, USB;
const isVercel = process.env.VERCEL === '1';

// Adapter para Impressora do Sistema (Mac/Linux via lp)
class SystemAdapter extends EventEmitter {
  constructor() {
    super();
    this.buffer = [];
  }
  open(callback) {
    console.log("SystemAdapter: Abrindo conexão...");
    if (callback) callback();
  }
  write(data, callback) {
    this.buffer.push(data);
    if (callback) callback();
  }
  close(callback) {
    const buffer = Buffer.concat(this.buffer);
    const tempPath = path.join(os.tmpdir(), `print-${Date.now()}.bin`);
    
    try {
      fs.writeFileSync(tempPath, buffer);
      console.log(`Enviando arquivo ${tempPath} para impressora do sistema (lp)...`);
      exec(`lp -o raw "${tempPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error("Erro lp:", error);
          console.error("Stderr:", stderr);
        } else {
          console.log("Impressão enviada com sucesso:", stdout);
        }
        try { fs.unlinkSync(tempPath); } catch(e){}
        if (callback) callback();
      });
    } catch (e) {
      console.error("Erro ao gravar arquivo de impressão:", e);
      if (callback) callback();
    }
  }
}

if (!isVercel) {
  try {
    // Carrega os módulos de impressão dinamicamente apenas se não estiver no Vercel
    escpos = (await import('escpos')).default;
    USB = (await import('escpos-usb')).default;
    console.log("✅ Módulos de impressão USB carregados (ambiente local).");
  } catch (e) {
    console.warn("⚠️ Módulos de impressão USB não puderam ser carregados:", e.message);
    escpos = null;
    USB = null;
  }
} else {
  console.log("🚫 Módulos de impressão USB desabilitados em ambiente Vercel.");
}

/**
 * Tenta encontrar uma impressora USB conectada.
 */
export async function checkUsb() {
  if (isVercel) {
    throw new Error("A verificação USB não é suportada neste ambiente.");
  }
  if (!USB) {
    throw new Error("Módulo USB não carregado. Verifique a instalação ou ambiente.");
  }
  const devices = USB.findPrinter();
  return devices.length;
}

/**
 * Envia um comando de impressão para a impressora USB ou sistema.
 */
export async function printUsb(printCommands) {
  if (isVercel) {
    throw new Error("A impressão USB não é suportada neste ambiente.");
  }
  if (!USB || !escpos) {
    throw new Error("Módulos de impressão não carregados. Verifique a instalação ou ambiente.");
  }

  let device;
  // No MacOS, o acesso direto USB é bloqueado pelo driver do sistema.
  if (os.platform() === 'darwin') {
      console.log("MacOS detectado. Usando adaptador de sistema (lp).");
      device = new SystemAdapter();
  } else {
      device = new USB(); 
  }

  return new Promise((resolve, reject) => {
    device.open((error) => {
      if (error) {
        console.error("Erro ao abrir impressora:", error);
        return reject(new Error("Erro na impressora: " + error.message));
      }
      const printer = new escpos.Printer(device);
      try {
        printCommands(printer);
        printer.cut().close(resolve);
      } catch (e) {
        reject(e);
      }
    });
  });
}