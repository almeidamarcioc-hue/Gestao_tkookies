let escpos, USB;
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  try {
    // Carrega os módulos de impressão dinamicamente apenas se não estiver no Vercel
    const escposModule = await import('escpos');
    const usbModule = await import('escpos-usb');
    escpos = escposModule.default;
    USB = usbModule.default;
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
export function checkUsb() {
  if (!USB) {
    throw new Error("A verificação USB não é suportada neste ambiente.");
  }
  const devices = USB.findPrinter();
  return devices.length;
}

/**
 * Envia um comando de impressão para a impressora USB.
 */
export function printUsb(printCommands) {
  if (!USB || !escpos) {
    throw new Error("A impressão USB não é suportada neste ambiente.");
  }

  const device = new USB(); // Encontra a primeira impressora automaticamente

  return new Promise((resolve, reject) => {
    device.open((error) => {
      if (error) {
        return reject(error);
      }
      const printer = new escpos.Printer(device);
      try {
        printCommands(printer); // Executa os comandos de impressão
        printer.cut().close(resolve);
      } catch (e) {
        reject(e);
      }
    });
  });
}