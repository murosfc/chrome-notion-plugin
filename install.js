#!/usr/bin/env node

/**
 * Automated installation script for Notion Git Plugin
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PluginInstaller {
  constructor() {
    this.projectRoot = __dirname;
    this.serverPath = path.join(this.projectRoot, 'local-server');
    this.extensionPath = path.join(this.projectRoot, 'chrome-extension');
    this.configPath = path.join(this.projectRoot, 'config.json');
    this.exampleConfigPath = path.join(this.projectRoot, 'config.json.example');
  }

  async install() {
    console.log('🚀 ====================================');
    console.log('   INSTALLATION - NOTION GIT PLUGIN');
    console.log('🚀 ====================================\n');

    try {
      await this.checkPrerequisites();
      await this.setupConfiguration();
      await this.installServerDependencies();
      await this.createIcons();
      await this.testInstallation();
      await this.showNextSteps();
      
      console.log('\n✅ Instalação concluída com sucesso! 🎉');
      
    } catch (error) {
      console.error('\n❌ Erro durante a instalação:', error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Verificando pré-requisitos...');

    // Verificar Node.js
    try {
      const { stdout } = await execAsync('node --version');
      const nodeVersion = stdout.trim();
      console.log(`✅ Node.js: ${nodeVersion}`);
      
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      if (majorVersion < 14) {
        throw new Error('Node.js 14+ é necessário');
      }
    } catch (error) {
      throw new Error('Node.js não encontrado. Instale Node.js 14+');
    }

    // Verificar npm
    try {
      const { stdout } = await execAsync('npm --version');
      console.log(`✅ npm: ${stdout.trim()}`);
    } catch (error) {
      throw new Error('npm não encontrado');
    }

    // Verificar Git
    try {
      const { stdout } = await execAsync('git --version');
      console.log(`✅ Git: ${stdout.trim()}`);
    } catch (error) {
      throw new Error('Git não encontrado. Instale Git');
    }

    console.log('✅ Todos os pré-requisitos atendidos\n');
  }

  async setupConfiguration() {
    console.log('⚙️ Configurando arquivos...');

    // Copiar config.json.example para config.json se não existir
    if (!fs.existsSync(this.configPath)) {
      if (fs.existsSync(this.exampleConfigPath)) {
        fs.copyFileSync(this.exampleConfigPath, this.configPath);
        console.log('📋 Arquivo config.json criado');
      } else {
        // Criar config básico
        const basicConfig = {
          "geminiApiKey": "COLE_SUA_CHAVE_API_GEMINI_AQUI",
          "projectPath": process.cwd(),
          "settings": {
            "serverPort": 3000
          }
        };
        fs.writeFileSync(this.configPath, JSON.stringify(basicConfig, null, 2));
        console.log('📋 Arquivo config.json criado com configuração básica');
      }
    } else {
      console.log('📋 Arquivo config.json já existe');
    }

    // Verificar se as pastas existem
    if (!fs.existsSync(this.serverPath)) {
      throw new Error('Pasta local-server não encontrada');
    }
    if (!fs.existsSync(this.extensionPath)) {
      throw new Error('Pasta chrome-extension não encontrada');
    }

    console.log('✅ Configuração concluída\n');
  }

  async installServerDependencies() {
    console.log('📦 Instalando dependências do servidor...');

    try {
      process.chdir(this.serverPath);
      
      console.log('⬇️ Executando npm install...');
      const { stdout, stderr } = await execAsync('npm install', { 
        timeout: 120000 // 2 minutos
      });
      
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('warning')) {
        console.warn('⚠️ Avisos:', stderr);
      }

      console.log('✅ Dependências instaladas com sucesso\n');
      
    } catch (error) {
      throw new Error(`Erro ao instalar dependências: ${error.message}`);
    } finally {
      process.chdir(this.projectRoot);
    }
  }

  async createIcons() {
    console.log('🎨 Criando ícones da extensão...');

    const iconDir = path.join(this.extensionPath, 'icons');
    
    // Criar pasta icons se não existir
    if (!fs.existsSync(iconDir)) {
      fs.mkdirSync(iconDir, { recursive: true });
    }

    // Criar ícones SVG simples (placeholder)
    const iconSizes = [16, 32, 48, 128];
    
    for (const size of iconSizes) {
      const iconPath = path.join(iconDir, `icon${size}.png`);
      
      if (!fs.existsSync(iconPath)) {
        // Criar um ícone SVG simples e converter para base64
        const svg = this.createIconSVG(size);
        
        // Por simplicidade, criar um arquivo de texto com o SVG
        // Em produção, usaríamos uma biblioteca para converter SVG para PNG
        fs.writeFileSync(
          iconPath.replace('.png', '.svg'), 
          svg
        );
        
        console.log(`📐 Ícone ${size}x${size} criado (SVG placeholder)`);
      }
    }

    console.log('✅ Ícones criados\n');
  }

  createIconSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="url(#grad)" stroke="#ffffff" stroke-width="2"/>
  <text x="${size/2}" y="${size/2+2}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/3}" font-weight="bold">G</text>
</svg>`;
  }

  async testInstallation() {
    console.log('🧪 Testando instalação...');

    // Testar se o servidor pode ser importado
    try {
      const LocalServer = require(path.join(this.serverPath, 'server.js'));
      console.log('✅ Servidor pode ser importado');
    } catch (error) {
      throw new Error(`Erro ao importar servidor: ${error.message}`);
    }

    // Testar GitHandler
    try {
      const GitHandler = require(path.join(this.serverPath, 'git-handler.js'));
      const gitHandler = new GitHandler();
      const systemInfo = await gitHandler.getSystemInfo();
      console.log(`✅ GitHandler funcionando (${systemInfo.platform})`);
    } catch (error) {
      throw new Error(`Erro no GitHandler: ${error.message}`);
    }

    // Verificar arquivos da extensão
    const requiredFiles = [
      'manifest.json',
      'background.js',
      'content-script.js',
      'popup.html',
      'popup.js',
      'styles.css'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.extensionPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo obrigatório não encontrado: ${file}`);
      }
    }

    console.log('✅ Todos os arquivos necessários presentes');
    console.log('✅ Teste de instalação concluído\n');
  }

  async showNextSteps() {
    console.log('📋 PRÓXIMOS PASSOS:\n');
    
    console.log('1. 🔑 CONFIGURE SUA CHAVE API:');
    console.log(`   Edite: ${this.configPath}`);
    console.log('   Insira sua chave API do Gemini em "geminiApiKey"');
    console.log('   Obtenha em: https://makersuite.google.com/app/apikey\n');
    
    console.log('2. 🖥️ INICIE O SERVIDOR LOCAL:');
    console.log('   cd local-server');
    console.log('   npm start\n');
    
    console.log('3. 🌐 INSTALE A EXTENSÃO NO CHROME:');
    console.log('   1. Abra chrome://extensions/');
    console.log('   2. Ative "Modo do desenvolvedor"');
    console.log('   3. Clique "Carregar extensão sem compactação"');
    console.log(`   4. Selecione a pasta: ${this.extensionPath}\n`);
    
    console.log('4. 🚀 USE O PLUGIN:');
    console.log('   1. Abra um card no Notion');
    console.log('   2. Clique no ícone da extensão');
    console.log('   3. Configure o caminho do projeto (primeira vez)');
    console.log('   4. Clique "Gerar Branch"\n');
    
    console.log('🔧 COMANDOS ÚTEIS:');
    console.log('   npm test          - Testar funcionalidade Git');
    console.log('   npm run dev       - Servidor em modo desenvolvimento');
    console.log('   node install.js   - Reexecutar instalação\n');
  }
}

// Executar instalação se chamado diretamente
if (require.main === module) {
  const installer = new PluginInstaller();
  installer.install().catch(error => {
    console.error('\n💥 Falha na instalação:', error.message);
    process.exit(1);
  });
}

module.exports = PluginInstaller;
