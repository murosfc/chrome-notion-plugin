#!/usr/bin/env node

/**
 * Test script to validate Gemini API
 */

const fs = require('fs');

class GeminiAPITester {
  constructor() {
    this.apiKey = null;
    this.baseURLs = [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    ];
    this.loadApiKey();
  }

  loadApiKey() {
    try {
      // Try to load from config.json
      if (fs.existsSync('config.json')) {
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        this.apiKey = config.geminiApiKey;
      }
    } catch (error) {
      console.log('ℹ️ Could not load config.json');
    }

    // Se não encontrou, pedir para o usuário
    if (!this.apiKey || this.apiKey === 'COLE_SUA_CHAVE_API_GEMINI_AQUI') {
      console.log('\n🔑 CHAVE API GEMINI NECESSÁRIA');
      console.log('Por favor, edite config.json e insira sua chave API');
      console.log('Ou defina a variável de ambiente GEMINI_API_KEY');
      console.log('\nObtenha em: https://makersuite.google.com/app/apikey');
      
      // Tentar variável de ambiente
      this.apiKey = process.env.GEMINI_API_KEY;
      
      if (!this.apiKey) {
        console.log('❌ Chave API não encontrada');
        process.exit(1);
      }
    }

    console.log(`✅ Chave API carregada: ${this.apiKey.substring(0, 10)}...`);
  }

  async testAPI(url, modelName) {
    console.log(`\n🧪 Testando ${modelName}...`);
    console.log(`📡 URL: ${url}`);

    const testPrompt = 'Gere um nome de branch Git para: Implementar autenticação de usuários';

    const requestBody = {
      contents: [{
        parts: [{
          text: testPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 100
      }
    };

    try {
      console.log('📤 Enviando requisição...');
      
      const response = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ${response.status}:`, errorText);
        return false;
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (generatedText) {
        console.log(`✅ Resposta: "${generatedText}"`);
        console.log(`💡 Modelo funcionando corretamente!`);
        return true;
      } else {
        console.log('⚠️ Resposta vazia ou inválida');
        console.log('📋 Dados recebidos:', JSON.stringify(data, null, 2));
        return false;
      }

    } catch (error) {
      console.error(`❌ Erro na requisição:`, error.message);
      return false;
    }
  }

  async testAllModels() {
    console.log('🚀 ====================================');
    console.log('   TESTE DA API GEMINI');
    console.log('🚀 ====================================');

    const models = [
      { url: this.baseURLs[0], name: 'Gemini 1.5 Flash (Recomendado)' },
      { url: this.baseURLs[1], name: 'Gemini 1.5 Pro' },
      { url: this.baseURLs[2], name: 'Gemini Pro (Legacy)' }
    ];

    let successCount = 0;

    for (const model of models) {
      const success = await this.testAPI(model.url, model.name);
      if (success) successCount++;
      
      // Aguardar entre testes para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 RESULTADO DOS TESTES:');
    console.log(`✅ Modelos funcionando: ${successCount}/${models.length}`);
    console.log(`❌ Modelos com erro: ${models.length - successCount}/${models.length}`);

    if (successCount > 0) {
      console.log('\n🎉 API Gemini está funcionando!');
      console.log('💡 Recomendamos usar o Gemini 1.5 Flash (mais rápido)');
    } else {
      console.log('\n❌ Nenhum modelo funcionou. Possíveis causas:');
      console.log('  1. Chave API inválida ou expirada');
      console.log('  2. API não habilitada no Google Cloud Console');
      console.log('  3. Quota/limite excedido');
      console.log('  4. Problemas de conectividade');
      
      console.log('\n🔧 Soluções:');
      console.log('  1. Gere uma nova chave: https://makersuite.google.com/app/apikey');
      console.log('  2. Ative APIs: https://console.cloud.google.com/apis/library');
      console.log('  3. Verifique quotas: https://console.cloud.google.com/iam-admin/quotas');
    }

    return successCount > 0;
  }

  async testProjectConfiguration() {
    console.log('\n🏗️ TESTANDO CONFIGURAÇÃO DO PROJETO...');
    
    try {
      // Testar endpoint de listagem de modelos
      const listUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
      const response = await fetch(`${listUrl}?key=${this.apiKey}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Acesso aos modelos OK');
        console.log(`📋 Modelos disponíveis: ${data.models?.length || 0}`);
        
        if (data.models) {
          data.models.slice(0, 3).forEach(model => {
            console.log(`  • ${model.name}`);
          });
        }
        
        return true;
      } else {
        console.log(`❌ Erro ao listar modelos: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Erro na configuração do projeto: ${error.message}`);
      return false;
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new GeminiAPITester();
  
  async function runTests() {
    try {
      console.log('⚙️ Verificando configuração do projeto...');
      await tester.testProjectConfiguration();
      
      console.log('\n🧪 Iniciando testes dos modelos...');
      const success = await tester.testAllModels();
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('\n💥 Erro fatal:', error.message);
      process.exit(1);
    }
  }
  
  runTests();
}

module.exports = GeminiAPITester;
