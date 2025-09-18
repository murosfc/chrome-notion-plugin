#!/usr/bin/env node

/**
 * Script de teste para validar funcionalidade Git
 */

const GitHandler = require('./git-handler');
const path = require('path');
const fs = require('fs');

class GitTester {
  constructor() {
    this.gitHandler = new GitHandler();
  }

  async runAllTests() {
    console.log('🧪 ====================================');
    console.log('   TESTE DO SISTEMA GIT');
    console.log('🧪 ====================================\n');

    const tests = [
      { name: 'Informações do Sistema', test: () => this.testSystemInfo() },
      { name: 'Instalação do Git', test: () => this.testGitInstallation() },
      { name: 'Diretório Atual', test: () => this.testCurrentDirectory() },
      { name: 'Validação de Repositório', test: () => this.testRepositoryValidation() }
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      console.log(`🔍 Testando: ${name}...`);
      try {
        await test();
        console.log(`✅ ${name}: PASSOU\n`);
        passed++;
      } catch (error) {
        console.error(`❌ ${name}: FALHOU`);
        console.error(`   Erro: ${error.message}\n`);
        failed++;
      }
    }

    console.log('📊 RESULTADO DOS TESTES:');
    console.log(`✅ Passaram: ${passed}`);
    console.log(`❌ Falharam: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);

    if (failed === 0) {
      console.log('\n🎉 Todos os testes passaram! Sistema pronto para uso.');
    } else {
      console.log('\n⚠️ Alguns testes falharam. Verifique as configurações.');
    }
  }

  async testSystemInfo() {
    const info = await this.gitHandler.getSystemInfo();
    console.log(`   Plataforma: ${info.platform} ${info.arch}`);
    console.log(`   Node.js: ${info.nodeVersion}`);
    console.log(`   Diretório: ${info.workingDir}`);
  }

  async testGitInstallation() {
    const result = await this.gitHandler.testGitInstallation();
    
    if (!result.isInstalled) {
      throw new Error(result.message);
    }
    
    console.log(`   ${result.message}`);
    console.log(`   Versão: ${result.version}`);
  }

  async testCurrentDirectory() {
    const currentDir = process.cwd();
    
    if (!fs.existsSync(currentDir)) {
      throw new Error('Diretório atual não existe');
    }
    
    const stats = fs.statSync(currentDir);
    if (!stats.isDirectory()) {
      throw new Error('Caminho atual não é um diretório');
    }
    
    console.log(`   Diretório: ${currentDir}`);
    console.log(`   Permissões: ${stats.mode & parseInt('777', 8)}`);
  }

  async testRepositoryValidation() {
    const testDir = process.cwd();
    const isGitRepo = fs.existsSync(path.join(testDir, '.git'));
    
    if (isGitRepo) {
      console.log('   🌿 Repositório Git detectado no diretório atual');
      
      try {
        const validation = await this.gitHandler.validateRepository(testDir);
        console.log(`   ✅ Validação: ${validation.message}`);
        
        const status = await this.gitHandler.getRepoStatus(testDir);
        console.log(`   📊 Branch atual: ${status.currentBranch}`);
        console.log(`   📊 Alterações: ${status.hasChanges ? 'Sim' : 'Não'}`);
        
        const branches = await this.gitHandler.listBranches(testDir);
        console.log(`   📊 Total de branches: ${branches.count}`);
      } catch (error) {
        throw new Error(`Erro na validação: ${error.message}`);
      }
    } else {
      console.log('   ℹ️ Não é um repositório Git (normal para testes)');
      
      // Testar com um caminho inválido
      try {
        await this.gitHandler.validateRepository('/caminho/inexistente');
        throw new Error('Deveria ter falhado com caminho inválido');
      } catch (error) {
        if (error.message.includes('não existe')) {
          console.log('   ✅ Validação de caminho inválido funcionando');
        } else {
          throw error;
        }
      }
    }
  }

  async testBranchCreation() {
    const testDir = process.cwd();
    
    // Só testar se for um repositório Git
    if (!fs.existsSync(path.join(testDir, '.git'))) {
      console.log('   ⏭️ Pulando teste (não é um repositório Git)');
      return;
    }

    const testBranchName = `test-branch-${Date.now()}`;
    
    try {
      console.log(`   🌿 Testando criação do branch: ${testBranchName}`);
      
      const result = await this.gitHandler.createBranch(testBranchName, testDir);
      console.log(`   ✅ Branch criado: ${result.branchName}`);
      
      // Voltar para o branch anterior
      if (result.previousBranch && result.previousBranch !== testBranchName) {
        await this.gitHandler.executeGitCommand(
          `checkout "${result.previousBranch}"`, 
          testDir
        );
        console.log(`   🔄 Voltou para: ${result.previousBranch}`);
      }
      
      // Deletar o branch de teste
      await this.gitHandler.executeGitCommand(
        `branch -D "${testBranchName}"`, 
        testDir
      );
      console.log(`   🗑️ Branch de teste removido`);
      
    } catch (error) {
      throw new Error(`Erro na criação de branch: ${error.message}`);
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new GitTester();
  tester.runAllTests().catch(error => {
    console.error('\n💥 Erro fatal nos testes:', error);
    process.exit(1);
  });
}

module.exports = GitTester;
