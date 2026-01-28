// Usamos 'require' pois este script é executado pelo Node.js do electron-builder
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

exports.default = async function(context) {
  const { packager, appOutDir } = context;
  const platform = packager.platform.name;
  
  let resourcesPath;

  // Define o caminho para a pasta de recursos dependendo do SO
  if (platform === 'mac') {
    resourcesPath = path.join(appOutDir, `${packager.appInfo.productFilename}.app`, 'Contents', 'Resources');
  } else { // Windows e Linux
    resourcesPath = path.join(appOutDir, 'resources');
  }

  const backendDir = path.join(resourcesPath, 'backend');

  if (fs.existsSync(backendDir) && fs.existsSync(path.join(backendDir, 'package.json'))) {
    console.log('✅ Backend source found. Installing production dependencies...');
    
    // Instala apenas as dependências de produção do backend
    execSync('npm install --production', {
      cwd: backendDir,
      stdio: 'inherit'
    });
    console.log('✅ Backend dependencies installed.');
  } else {
    console.error('❌ Backend source directory or package.json not found in packaged app:', backendDir);
  }
};