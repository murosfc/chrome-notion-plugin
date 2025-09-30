# 🚀 Chrome Notion Git Plugin

**English** | [Português](#português)

Intelligent Chrome plugin that automates Git branch creation based on Notion cards using Gemini AI.

---

## ✨ Features

- 🎯 **Automatic Detection**: Automatically identifies open Notion cards
- 🤖 **Gemini AI**: Generates intelligent branch names based on content
- 🌿 **Automatic Creation**: Creates Git branches locally with one click
- 🖥️ **Cross-platform**: Works on Windows, Linux, and Mac
- 🎨 **Modern Interface**: Clean and intuitive design
- ⚡ **Fast and Secure**: Local processing, no sensitive data sent
- 🌍 **English Interface**: Clean and intuitive user interface
- 🔧 **Smart Error Handling**: Automatic API key reconfiguration on errors
- 🌿 **Default Base Branch**: Configure a default branch for new branches (main, develop, etc.)
- 📜 **Cross-platform Scripts**: Native scripts for Windows (.bat), Linux (.sh), and macOS

## 📁 Project Structure

```
chrome-notion-plugin/
├── chrome-extension/          # 🌐 Chrome Extension
│   ├── manifest.json         # Extension configuration
│   ├── background.js         # Service Worker (Gemini API)
│   ├── content-script.js     # Notion capture script
│   ├── popup.html           # User interface
│   ├── popup.js             # Interface logic
│   ├── styles.css           # Modern styles
│   └── icons/              # Extension icons
├── local-server/             # 🖥️ Local Node.js server
│   ├── server.js            # Main Express server
│   ├── git-handler.js       # Git commands handler
│   ├── package.json         # Server dependencies
│   ├── test-git.js          # Test scripts
│   ├── start-server.bat     # Windows server launcher
│   ├── kill-server.bat      # Windows server killer
│   ├── start-server.sh      # Linux server launcher
│   ├── kill-server.sh       # Linux server killer
│   ├── start-server-macos.sh # macOS optimized launcher
│   ├── kill-server-macos.sh # macOS optimized killer
│   └── start-server-unix.sh # Universal Unix launcher
├── config.json.example       # 📋 Configuration template
├── CONFIGURACAO_API.md      # 🔑 API configuration guide
├── install.js               # 🔧 Automated installation script
└── package.json             # General project configuration
```

## 🚀 Quick Installation

### Option 1: Automated Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/chrome-notion-plugin.git
cd chrome-notion-plugin

# Run automated installation
npm run install-plugin

# Start the server
npm run start-server
```

### Option 2: Manual Installation

```bash
# 1. Install server dependencies
cd local-server
npm install

# 2. Build Chrome extension (required for v1.1.0+)
cd ../chrome-extension
npm install
npm run build

# 3. Go back to root and configure
cd ..
cp config.json.example config.json

# 4. Start server
cd local-server
npm start
```

## 🔧 Configuration

### 1. 🔑 Configure your Gemini API Key

**Option A: Via config.json file (Recommended):**

1. Copy `config.json.example` to `config.json`
2. Edit `config.json` and add your API key and project path
3. The plugin will automatically detect and load these settings

**Option B: Via Interface:**

1. Install the Chrome extension
2. Open the plugin
3. Enter your API key in the corresponding field
4. Click "Save Configuration"

**Get your key:** https://makersuite.google.com/app/apikey

### 2. 🌐 Install Chrome Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right corner)
3. Click "Load unpacked extension"
4. Select the `chrome-extension` folder from this project

### 3. 📁 Configure Project Path

On first run, provide the full path to your Git project.

**Examples:**

- Windows: `C:\projects\my-app`
- Linux/Mac: `/home/user/projects/my-app`

### 4. 🌿 Configure Default Base Branch (Optional)

You can set a default base branch that will be used as the starting point for all new branches:

- **main**: Most common modern default
- **develop**: For GitFlow workflow
- **master**: Legacy default branch
- **Empty**: Uses current branch as base (default behavior)

## 📝 How to Use

### Basic Flow

1. **Open a Notion card** you want to transform into a branch
2. **Click the extension icon** in the Chrome toolbar
3. **Check captured data** from the card
4. **Click "Generate Branch"**
5. **Done!** The branch has been created in your local project

### Practical Example

**Notion Card:**

```
Title: Implement Google OAuth authentication
Description: Add social login via Google for users...
```

**Generated Branch:**

```
feat/implement-google-oauth-authentication
```

**Git commands executed automatically:**

```bash
cd /your/project
git checkout -b "feat/implement-google-oauth-authentication"
```

## 🆕 New Features (v1.1.0)

### 🔧 Smart Error Handling

- **Automatic API Key Recovery**: When API errors occur, a "🔑 Atualizar API Key" button appears
- **One-click Reconfiguration**: Quickly fix API key issues without manual navigation
- **Comprehensive Error Detection**: Handles all API error types (400, 401, 403, 404, etc.)

### 🌿 Default Base Branch Configuration

- **Flexible Branch Creation**: Set a default base branch for all new branches
- **GitFlow Support**: Perfect for teams using `develop` as base branch
- **Fallback Behavior**: Uses current branch if default branch doesn't exist
- **Optional Setting**: Leave empty to maintain current behavior

### 📜 Cross-Platform Scripts

- **Windows**: `start-server.bat` and `kill-server.bat` (existing)
- **Linux**: `start-server.sh` and `kill-server.sh` (new)
- **macOS**: `start-server-macos.sh` and `kill-server-macos.sh` (optimized)
- **Universal**: `start-server-unix.sh` (auto-detects OS)

### 🚀 Official Google AI SDK Integration

- **Official Package**: Now uses `@google/generative-ai` official SDK
- **Gemini 2.0 Flash**: Updated to use the latest Gemini 2.0 Flash model
- **Automatic Fallback**: Falls back to older models if newest isn't available
- **Better Error Handling**: More precise error messages and handling
- **No Manual URL Management**: SDK handles all API endpoints automatically

## 🧪 Testing Installation

```bash
# Test Git functionality
npm run test-git

# Test server
curl http://localhost:3000/health

# Check if extension is working
# Open chrome://extensions/ and check for errors
```

## ⚙️ Useful Commands

```bash
# Installation and setup
npm run install-plugin      # Complete automated installation
npm run setup               # Install + start server

# Server
npm run start-server        # Start production server
npm run dev-server         # Server in development mode

# Platform-specific scripts (navigate to local-server folder first)
# Windows:
start-server.bat           # Start server on Windows
kill-server.bat            # Stop server on Windows

# Linux:
./start-server.sh          # Start server on Linux
./kill-server.sh           # Stop server on Linux

# macOS:
./start-server-macos.sh    # Start server on macOS (optimized)
./kill-server-macos.sh     # Stop server on macOS (optimized)

# Universal Unix (auto-detects Linux/macOS):
./start-server-unix.sh     # Universal launcher for Unix systems

# Testing and diagnostics
npm run test-git           # Test Git functionality
npm run test-gemini        # Test Gemini API
npm run test-all           # Run all tests
node local-server/test-git.js  # Detailed system test

# Management
npm run build              # Project build (placeholder)
```

## 🔍 Problem Diagnosis

### ⚡ Quick Error Solutions

👉 **[COMPLETE SOLUTIONS GUIDE](SOLUCAO_ERROS.md)** 👈

### Most common problems:

#### "Could not establish connection"

```bash
1. Reload extension (chrome://extensions/)
2. Reload Notion page (F5)
3. Check logs in Console (F12)
```

#### "API Key Errors (400, 401, 403, 404, etc.)"

```bash
1. Click "🔑 Atualizar API Key" button when error appears
2. Reconfigure your Gemini API key
3. Test connection again
4. Check Google Cloud Console if problems persist
5. Enable "Generative Language API"
6. Plugin automatically detects correct Gemini model version
```

#### "Local server not running"

```bash
cd local-server
npm start
# Test: curl http://localhost:3000/health
```

#### "API key not saving"

```bash
1. Clear extension storage
2. Generate new API key
3. Manually configure in config.json if necessary
```

**📋 For detailed solutions, see:** [SOLUCAO_ERROS.md](SOLUCAO_ERROS.md)

## 📋 System Requirements

- **Node.js:** 14.0.0 or higher
- **npm:** 6.0.0 or higher
- **Git:** Any recent version
- **Chrome:** Version 88+ (Manifest V3)
- **System:** Windows 10+, macOS 10.14+, or Linux Ubuntu 18.04+

## 🔒 Security and Privacy

- ✅ **Local data:** Everything processed locally
- ✅ **Secure API:** Keys stored only in Chrome
- ✅ **No telemetry:** No data sent to external servers
- ✅ **Open source:** You can audit all code

## 📊 Complete Configuration Example

**config.json:**

```json
{
  "geminiApiKey": "YOUR API KEY",
  "projectPath": "/home/user/projects/my-application",
  "settings": {
    "serverPort": 3000,
    "branchPrefix": "auto",
    "maxBranchNameLength": 60,
    "defaultBranchType": "feat",
    "defaultBaseBranch": "main"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add: new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for the intelligent API
- Notion for the inspiring platform
- Open-source community for the tools used

---

**⭐ If this project helped you, consider giving it a star on GitHub!**

**🐛 Found a bug? [Open an issue](https://github.com/your-username/chrome-notion-plugin/issues)**

**💡 Have a suggestion? [Start a discussion](https://github.com/your-username/chrome-notion-plugin/discussions)**

---

# Português

Plugin inteligente para Chrome que automatiza a criação de branches Git baseado em cards do Notion usando IA Gemini.

## ✨ Funcionalidades

- 🎯 **Detecção Automática**: Identifica cards abertos no Notion automaticamente
- 🤖 **IA Gemini**: Gera nomes de branch inteligentes baseados no conteúdo
- 🌿 **Criação Automática**: Cria branches Git localmente com um clique
- 🖥️ **Multiplataforma**: Funciona no Windows, Linux e Mac
- 🎨 **Interface Moderna**: Design limpo e intuitivo
- ⚡ **Rápido e Seguro**: Processamento local, sem envio de dados sensíveis
- 🔧 **Tratamento Inteligente de Erros**: Reconfiguração automática da API key em erros
- 🌿 **Branch Base Padrão**: Configure um branch padrão para novas branches (main, develop, etc.)
- 📜 **Scripts Multiplataforma**: Scripts nativos para Windows (.bat), Linux (.sh) e macOS

## 📁 Estrutura do Projeto

```
chrome-notion-plugin/
├── chrome-extension/          # 🌐 Extensão do Chrome
│   ├── manifest.json         # Configuração da extensão
│   ├── background.js         # Service Worker (API Gemini)
│   ├── content-script.js     # Script de captura do Notion
│   ├── popup.html           # Interface do usuário
│   ├── popup.js             # Lógica da interface
│   ├── styles.css           # Estilos modernos
│   └── icons/               # Ícones da extensão
├── local-server/             # 🖥️ Servidor Node.js local
│   ├── server.js            # Servidor Express principal
│   ├── git-handler.js       # Manipulação de comandos Git
│   ├── package.json         # Dependências do servidor
│   ├── test-git.js          # Scripts de teste
│   ├── start-server.bat     # Iniciador do servidor Windows
│   ├── kill-server.bat      # Finalizador do servidor Windows
│   ├── start-server.sh      # Iniciador do servidor Linux
│   ├── kill-server.sh       # Finalizador do servidor Linux
│   ├── start-server-macos.sh # Iniciador otimizado para macOS
│   ├── kill-server-macos.sh # Finalizador otimizado para macOS
│   └── start-server-unix.sh # Iniciador universal Unix
├── config.json.example       # 📋 Arquivo de configuração modelo
├── CONFIGURACAO_API.md      # 🔑 Guia de configuração da API
├── install.js               # 🔧 Script de instalação automatizada
└── package.json             # Configuração geral do projeto
```

## 🚀 Instalação Rápida

### Opção 1: Instalação Automatizada (Recomendada)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/chrome-notion-plugin.git
cd chrome-notion-plugin

# Execute a instalação automática
npm run install-plugin

# Inicie o servidor
npm run start-server
```

### Opção 2: Instalação Manual

```bash
# 1. Instale dependências do servidor
cd local-server
npm install

# 2. Compile a extensão Chrome (obrigatório para v1.1.0+)
cd ../chrome-extension
npm install
npm run build

# 3. Volte para a raiz e configure
cd ..
cp config.json.example config.json

# 4. Inicie o servidor
cd local-server
npm start
```

## 🔧 Configuração

### 1. 🔑 Configure sua Chave API Gemini

**Opção A: Via arquivo config.json (Recomendado):**

1. Copie `config.json.example` para `config.json`
2. Edite o `config.json` e adicione sua chave API e caminho do projeto
3. O plugin detectará e carregará automaticamente essas configurações

**Opção B: Via Interface:**

1. Instale a extensão no Chrome
2. Abra o plugin
3. Insira sua chave API no campo correspondente
4. Clique em "Salvar Configuração"

**Obtenha sua chave:** https://makersuite.google.com/app/apikey

### 2. 🌐 Instale a Extensão Chrome

1. Abra `chrome://extensions/`
2. Ative "Modo do desenvolvedor" (canto superior direito)
3. Clique "Carregar extensão sem compactação"
4. Selecione a pasta `chrome-extension` deste projeto

### 3. 📁 Configure o Caminho do Projeto

Na primeira execução, informe o caminho completo do seu projeto Git.

**Exemplos:**

- Windows: `C:\projetos\meu-app`
- Linux/Mac: `/home/usuario/projetos/meu-app`

## 📝 Como Usar

### Fluxo Básico

1. **Abra um card no Notion** que você quer transformar em branch
2. **Clique no ícone da extensão** na barra do Chrome
3. **Verifique os dados capturados** do card
4. **Clique em "Gerar Branch"**
5. **Pronto!** O branch foi criado no seu projeto local

### Exemplo Prático

**Card no Notion:**

```
Título: Implementar autenticação com Google OAuth
Descrição: Adicionar login social via Google para usuários...
```

**Branch gerado:**

```
feat/implement-google-oauth-authentication
```

**Comandos Git executados automaticamente:**

```bash
cd /seu/projeto
git checkout -b "feat/implement-google-oauth-authentication"
```

## 🆕 Novas Funcionalidades (v1.1.0)

### 🔧 Tratamento Inteligente de Erros

- **Recuperação Automática da API Key**: Quando erros da API ocorrem, aparece botão "🔑 Atualizar API Key"
- **Reconfiguração com Um Clique**: Corrija problemas da API key rapidamente
- **Detecção Abrangente de Erros**: Trata todos os tipos de erro da API (400, 401, 403, 404, etc.)

### 🌿 Configuração de Branch Base Padrão

- **Criação Flexível de Branches**: Defina um branch base padrão para todas as novas branches
- **Suporte ao GitFlow**: Perfeito para equipes que usam `develop` como branch base
- **Comportamento de Fallback**: Usa o branch atual se o branch padrão não existir
- **Configuração Opcional**: Deixe vazio para manter o comportamento atual

### 📜 Scripts Multiplataforma

- **Windows**: `start-server.bat` e `kill-server.bat` (existentes)
- **Linux**: `start-server.sh` e `kill-server.sh` (novos)
- **macOS**: `start-server-macos.sh` e `kill-server-macos.sh` (otimizados)
- **Universal**: `start-server-unix.sh` (detecta automaticamente o SO)

## 🧪 Testando a Instalação

```bash
# Teste a funcionalidade Git
npm run test-git

# Teste o servidor
curl http://localhost:3000/health

# Verificar se a extensão está funcionando
# Abra chrome://extensions/ e veja se não há erros
```

## ⚙️ Comandos Úteis

```bash
# Instalação e configuração
npm run install-plugin      # Instalação automatizada completa
npm run setup               # Instalar + iniciar servidor

# Servidor
npm run start-server        # Iniciar servidor de produção
npm run dev-server         # Servidor em modo desenvolvimento

# Scripts específicos por plataforma (navegue até a pasta local-server primeiro)
# Windows:
start-server.bat           # Iniciar servidor no Windows
kill-server.bat            # Parar servidor no Windows

# Linux:
./start-server.sh          # Iniciar servidor no Linux
./kill-server.sh           # Parar servidor no Linux

# macOS:
./start-server-macos.sh    # Iniciar servidor no macOS (otimizado)
./kill-server-macos.sh     # Parar servidor no macOS (otimizado)

# Universal Unix (detecta automaticamente Linux/macOS):
./start-server-unix.sh     # Iniciador universal para sistemas Unix

# Testes e diagnóstico
npm run test-git           # Testar funcionalidade Git
node local-server/test-git.js  # Teste detalhado do sistema

# Gerenciamento
npm run build              # Build do projeto (placeholder)
```

## 🔍 Diagnóstico de Problemas

### ⚡ Solução Rápida de Erros Comuns

👉 **[GUIA COMPLETO DE SOLUÇÕES](SOLUCAO_ERROS.md)** 👈

### Problemas mais comuns:

#### "Could not establish connection"

```bash
1. Recarregue a extensão (chrome://extensions/)
2. Recarregue a página do Notion (F5)
3. Verifique logs no Console (F12)
```

#### "Erros da API Key (400, 401, 403, 404, etc.)"

```bash
1. Clique no botão "🔑 Atualizar API Key" quando o erro aparecer
2. Reconfigure sua chave API Gemini
3. Teste a conexão novamente
4. Verifique o Google Cloud Console se problemas persistirem
5. Ative a "Generative Language API"
6. Plugin detecta automaticamente a versão correta do modelo Gemini
```

#### "Servidor local não está rodando"

```bash
cd local-server
npm start
# Teste: curl http://localhost:3000/health
```

#### "Chave API não salva"

```bash
1. Limpe storage da extensão
2. Gere nova chave API
3. Configure manualmente no config.json se necessário
```

**📋 Para soluções detalhadas, veja:** [SOLUCAO_ERROS.md](SOLUCAO_ERROS.md)

## 📋 Requisitos do Sistema

- **Node.js:** 14.0.0 ou superior
- **npm:** 6.0.0 ou superior
- **Git:** Qualquer versão recente
- **Chrome:** Versão 88+ (Manifest V3)
- **Sistema:** Windows 10+, macOS 10.14+, ou Linux Ubuntu 18.04+

## 🔒 Segurança e Privacidade

- ✅ **Dados locais:** Tudo processado localmente
- ✅ **API segura:** Chaves armazenadas apenas no Chrome
- ✅ **Sem telemetria:** Nenhum dado é enviado para servidores externos
- ✅ **Código aberto:** Você pode auditar todo o código

## 📊 Exemplo de Configuração Completa

**config.json:**

```json
{
  "geminiApiKey": "SUA CHAVE API",
  "projectPath": "/home/usuario/projetos/minha-aplicacao",
  "settings": {
    "serverPort": 3000,
    "branchPrefix": "auto",
    "maxBranchNameLength": 60,
    "defaultBranchType": "feat",
    "defaultBaseBranch": "main"
  }
}
```

## 🤝 Contribuindo

Contributions são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- Google Gemini AI pela API inteligente
- Notion pela plataforma inspiradora
- Comunidade open-source pelas ferramentas utilizadas

---

**⭐ Se este projeto te ajudou, considere dar uma estrela no GitHub!**

**🐛 Encontrou um bug? [Abra uma issue](https://github.com/seu-usuario/chrome-notion-plugin/issues)**

**💡 Tem uma sugestão? [Inicie uma discussão](https://github.com/seu-usuario/chrome-notion-plugin/discussions)**
