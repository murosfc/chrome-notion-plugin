const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class GitHandler {
  constructor() {
    this.isWindows = os.platform() === 'win32';
    this.isLinux = os.platform() === 'linux';
    this.isMac = os.platform() === 'darwin';
    
  }

  /**
   * Executes Git command safely and cross-platform
   */
  async executeGitCommand(command, workingDir) {
    return new Promise((resolve, reject) => {
      const options = {
        cwd: workingDir,
        encoding: 'utf8',
        timeout: 30000, // 30 seconds timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      };

      // Adjust command for Windows if necessary
      const finalCommand = this.isWindows ? `git ${command}` : `git ${command}`;
      

      exec(finalCommand, options, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Git command error: ${error.message}`);
          console.error(`📝 stderr: ${stderr}`);
          
          reject({
            message: this.parseGitError(error.message, stderr),
            code: error.code || 'GIT_ERROR',
            details: {
              command: finalCommand,
              workingDir,
              stderr: stderr.trim(),
              stdout: stdout.trim()
            }
          });
          return;
        }


        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command: finalCommand
        });
      });
    });
  }

  /**
   * Analyzes and improves Git error messages
   */
  parseGitError(errorMessage, stderr) {
    const errorText = (stderr || errorMessage || '').toLowerCase();

    if (errorText.includes('not a git repository')) {
      return 'O diretório não é um repositório Git. Execute "git init" primeiro.';
    }
    
    if (errorText.includes('already exists')) {
      return 'Branch já existe. Escolha um nome diferente ou faça checkout do branch existente.';
    }
    
    if (errorText.includes('fatal: not a valid object name')) {
      return 'Branch base não existe. Certifique-se de estar em um branch válido.';
    }
    
    if (errorText.includes('working tree clean')) {
      return 'Há alterações não commitadas. Faça commit ou stash das alterações primeiro.';
    }
    
    if (errorText.includes('permission denied') || errorText.includes('access denied')) {
      return 'Permissão negada. Verifique as permissões do diretório.';
    }
    
    if (errorText.includes('command not found') || errorText.includes('is not recognized')) {
      return 'Git não encontrado. Instale o Git e certifique-se de que está no PATH.';
    }
    
    // Return original error if cannot interpret
    return errorMessage || stderr || 'Unknown Git error';
  }

  /**
   * Creates a new branch based on current branch
   * @param {string} branchName - Name of branch to be created
   * @param {string} projectPath - Git project path
   * @param {boolean} autoCheckout - Whether to do automatic checkout (default: true)
   */
  async createBranch(branchName, projectPath, autoCheckout = true) {
    try {

      // 1. Verificar se o repositório é válido
      await this.validateRepository(projectPath);

      // 2. Verificar status atual
      const status = await this.getRepoStatus(projectPath);

      // 3. Verificar se o branch já existe
      const branches = await this.listBranches(projectPath);
      if (branches.all.includes(branchName)) {
        throw new Error(`Branch "${branchName}" already exists`);
      }

      // 4. Criar branch (com ou sem checkout)
      if (autoCheckout) {
        // Criar e fazer checkout do novo branch
        await this.executeGitCommand(`checkout -b "${branchName}"`, projectPath);
      } else {
        // Apenas criar o branch (sem fazer checkout)
        await this.executeGitCommand(`branch "${branchName}"`, projectPath);
      }

      // 5. Verificar status final
      const newStatus = await this.getRepoStatus(projectPath);

      return {
        branchName,
        previousBranch: status.currentBranch,
        currentBranch: newStatus.currentBranch,
        created: true,
        checkedOut: autoCheckout,
        message: autoCheckout 
          ? `Branch "${branchName}" criado e ativo a partir de "${status.currentBranch}"`
          : `Branch "${branchName}" criado a partir de "${status.currentBranch}" (sem checkout)`
      };

    } catch (error) {
      console.error(`❌ Failed to create branch:`, error);
      throw error;
    }
  }

  /**
   * Obtém status detalhado do repositório
   */
  async getRepoStatus(projectPath) {
    try {
      // Branch atual
      const branchResult = await this.executeGitCommand('branch --show-current', projectPath);
      const currentBranch = branchResult.stdout || 'detached HEAD';

      // Status geral
      const statusResult = await this.executeGitCommand('status --porcelain', projectPath);
      const hasChanges = statusResult.stdout.length > 0;

      // Último commit
      let lastCommit = null;
      try {
        const commitResult = await this.executeGitCommand('log --oneline -1', projectPath);
        lastCommit = commitResult.stdout;
      } catch (commitError) {
      }

      // Remote status (se existir)
      let remoteStatus = null;
      try {
        const remoteResult = await this.executeGitCommand('remote -v', projectPath);
        remoteStatus = remoteResult.stdout;
      } catch (remoteError) {
      }

      return {
        currentBranch,
        hasChanges,
        lastCommit,
        remoteStatus,
        isClean: !hasChanges,
        statusDetails: statusResult.stdout
      };

    } catch (error) {
      console.error('❌ Error getting status:', error);
      throw error;
    }
  }

  /**
   * Lista todos os branches do repositório
   */
  async listBranches(projectPath) {
    try {
      // Branches locais
      const localResult = await this.executeGitCommand('branch', projectPath);
      const localBranches = localResult.stdout
        .split('\n')
        .map(branch => branch.replace(/^\*?\s*/, '').trim())
        .filter(branch => branch.length > 0);

      // Branch atual
      const currentResult = await this.executeGitCommand('branch --show-current', projectPath);
      const currentBranch = currentResult.stdout.trim();

      // Tentar listar branches remotos
      let remoteBranches = [];
      try {
        const remoteResult = await this.executeGitCommand('branch -r', projectPath);
        remoteBranches = remoteResult.stdout
          .split('\n')
          .map(branch => branch.trim().replace(/^origin\//, ''))
          .filter(branch => branch.length > 0 && !branch.includes('HEAD'));
      } catch (remoteError) {
      }

      const allBranches = [...new Set([...localBranches, ...remoteBranches])];

      return {
        current: currentBranch,
        local: localBranches,
        remote: remoteBranches,
        all: allBranches,
        count: allBranches.length
      };

    } catch (error) {
      console.error('❌ Error listing branches:', error);
      throw error;
    }
  }

  /**
   * Validates if directory is a valid Git repository
   */
  async validateRepository(projectPath) {
    try {
      // Verificar se o caminho existe
      if (!fs.existsSync(projectPath)) {
        throw new Error(`Path does not exist: ${projectPath}`);
      }

      // Verificar se é um diretório
      const stats = fs.statSync(projectPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${projectPath}`);
      }

      // Verificar se pasta .git existe
      const gitPath = path.join(projectPath, '.git');
      if (!fs.existsSync(gitPath)) {
        throw new Error('Not a valid Git repository (.git not found)');
      }

      // Tentar executar comando Git simples
      await this.executeGitCommand('status', projectPath);

      // Verificar se Git está instalado
      try {
        await this.executeGitCommand('--version', projectPath);
      } catch (gitError) {
        throw new Error('Git is not installed or not in PATH');
      }


      return {
        isValid: true,
        path: projectPath,
        gitVersion: await this.getGitVersion(projectPath),
        message: 'Valid Git repository'
      };

    } catch (error) {
      console.error(`❌ Validation failed:`, error);
      throw error;
    }
  }

  /**
   * Obtém versão do Git instalado
   */
  async getGitVersion(projectPath) {
    try {
      const result = await this.executeGitCommand('--version', projectPath);
      return result.stdout;
    } catch (error) {
      return 'Versão desconhecida';
    }
  }

  /**
   * Utilitários para debug e testes
   */
  async getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      version: os.version ? os.version() : 'N/A',
      nodeVersion: process.version,
      isWindows: this.isWindows,
      isLinux: this.isLinux,
      isMac: this.isMac,
      homeDir: os.homedir(),
      workingDir: process.cwd()
    };
  }

  /**
   * Teste rápido de funcionalidade
   */
  async testGitInstallation() {
    try {
      const testDir = process.cwd();
      const result = await this.executeGitCommand('--version', testDir);
      
      return {
        isInstalled: true,
        version: result.stdout,
        message: 'Git instalado e funcionando'
      };
    } catch (error) {
      return {
        isInstalled: false,
        error: error.message,
        message: 'Git não encontrado ou não funcional'
      };
    }
  }
}

module.exports = GitHandler;
