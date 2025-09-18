// Background Service Worker - Gemini API Integration

class GeminiAPIClient {
  constructor() {
    // URL atualizada da API Gemini (2024)
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    this.setupMessageListener();
    this.loadConfiguration();
  }

  async loadConfiguration() {
    try {
      const result = await chrome.storage.sync.get(['geminiApiKey', 'projectPath']);
      this.apiKey = result.geminiApiKey;
      this.projectPath = result.projectPath;
      
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
    }
  }

  async saveConfiguration(config) {
    try {
      await chrome.storage.sync.set(config);
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      throw error;
    }
  }

  // Generates intelligent prompt for Gemini based on card data
  generateBranchPrompt(cardData, previousBranchName = null) {
    const { title, content, properties } = cardData;
    
    let prompt = `You are a Git and software development expert. 

Analyze the card/task information below and generate a Git branch name following these rules:

📋 CARD DATA:
Title: "${title}"`;

    if (content && content.trim()) {
      prompt += `\nDescription: "${content.substring(0, 200)}..."`;
    }

    if (properties && Object.keys(properties).length > 0) {
      prompt += `\nProperties: ${JSON.stringify(properties, null, 2)}`;
    }

    if (previousBranchName) {
      prompt += `\n\n🔄 IMPORTANT: This is a refresh request. The previous suggestion was "${previousBranchName}". Please generate a DIFFERENT branch name with an alternative approach or focus.`;
    }

    prompt += `

🎯 BRANCH NAME RULES:
1. Use format: type/brief-description
2. Valid types: feat, fix, docs, style, refactor, test, chore
3. Description should be max 50 characters
4. Use only lowercase letters, numbers and hyphens
5. Be specific but concise
6. Use technical English when appropriate

📝 EXAMPLES:
- "Implement user authentication" → feat/user-authentication  
- "Fix shopping cart bug" → fix/shopping-cart-bug
- "Add unit tests" → test/unit-tests
- "Update API documentation" → docs/api-documentation

🎪 RESPONSE:
Return ONLY the branch name, without additional explanations.`;

    return prompt;
  }

  // Calls Gemini API to generate branch name
  async generateBranchName(cardData, previousBranchName = null) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = this.generateBranchPrompt(cardData, previousBranchName);

    try {
      const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,  // Less creative, more consistent
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 100
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });

        let errorMessage;
        switch (response.status) {
          case 400:
            errorMessage = 'Error 400: Invalid API key or incorrect parameters';
            break;
          case 401:
            errorMessage = 'Error 401: API key not authorized. Check if the key is correct';
            break;
          case 403:
            errorMessage = 'Error 403: Gemini API not enabled. Enable the API in Google Cloud Console';
            break;
          case 404:
            errorMessage = 'Error 404: Gemini model not found. Check if you are using the correct model';
            break;
          case 429:
            errorMessage = 'Error 429: Quota limit exceeded. Try again later';
            break;
          case 500:
            errorMessage = 'Error 500: Internal Gemini API error. Try again';
            break;
          default:
            errorMessage = `Error ${response.status}: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (!generatedText) {
        throw new Error('Invalid response from Gemini API');
      }

      // Limpar e validar o nome do branch
      const branchName = this.sanitizeBranchName(generatedText);

      return branchName;

    } catch (error) {
      console.error('❌ Error calling Gemini API:', error);
      throw error;
    }
  }

  // Sanitiza e valida o nome do branch
  sanitizeBranchName(rawName) {
    // Remove quebras de linha, espaços extras e caracteres especiais
    let cleaned = rawName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-\/]/g, '-')  // Substitui caracteres especiais por hífen
      .replace(/-+/g, '-')             // Remove hífens duplicados
      .replace(/^-|-$/g, '');          // Remove hífens do início/fim

    // Garantir que tenha o formato correto tipo/nome
    if (!cleaned.includes('/')) {
      cleaned = 'feat/' + cleaned;
    }

    // Limitar tamanho total
    if (cleaned.length > 60) {
      const parts = cleaned.split('/');
      const type = parts[0];
      const desc = parts.slice(1).join('/');
      cleaned = type + '/' + desc.substring(0, 50 - type.length);
    }

    return cleaned;
  }

  // Creates branch via local server
  async createBranchLocally(branchName) {
    if (!this.projectPath) {
      throw new Error('Project path not configured');
    }

    try {
      const response = await fetch('http://localhost:3000/create-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branchName,
          projectPath: this.projectPath
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local server error: ${errorText}`);
      }

      const result = await response.json();
      
      return result;

    } catch (error) {
      console.error('❌ Error creating branch locally:', error);
      
      // If local server is not available, inform this
      if (error.message.includes('fetch')) {
        throw new Error('Local server is not running. Execute: cd local-server && npm start');
      }
      
      throw error;
    }
  }

  // Configura listener para mensagens do popup
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

      // Validar mensagem
      if (!message || !message.action) {
        console.error('❌ Invalid message in background');
        sendResponse({ success: false, error: 'Invalid message' });
        return true;
      }

      try {
        switch (message.action) {
          case 'contentScriptLoaded':
            sendResponse({ success: true, message: 'Content script registered' });
            break;

          case 'generateBranchName':
            this.handleGenerateBranchName(message.cardData, message.previousBranchName)
              .then(branchName => sendResponse({ success: true, branchName }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            break;

          case 'createBranch':
            this.handleCreateBranch(message.branchName, message.cardData)
              .then(result => sendResponse({ success: true, data: result }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            break;

          case 'generateBranch':
            this.handleGenerateBranch(message.cardData)
              .then(result => sendResponse({ success: true, data: result }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            break;

          case 'saveConfig':
            this.handleSaveConfig(message.config)
              .then(() => sendResponse({ success: true }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            break;

          case 'getConfig':
            this.handleGetConfig()
              .then(config => sendResponse({ success: true, data: config }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            break;

          case 'testConnection':
            this.handleTestConnection()
              .then(result => sendResponse({ success: true, data: result }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            break;

          default:
            console.warn('⚠️ Unknown action in background:', message.action);
            sendResponse({ success: false, error: 'Unknown action: ' + message.action });
        }
      } catch (error) {
        console.error('❌ Error in background script:', error);
        sendResponse({ 
          success: false, 
          error: 'Internal background error: ' + error.message 
        });
      }

      return true; // Mantém o canal aberto para respostas assíncronas
    });

  }

  // Processes only branch name generation (new functionality)
  async handleGenerateBranchName(cardData, previousBranchName = null) {
    
    const branchName = await this.generateBranchName(cardData, previousBranchName);
    
    return branchName;
  }

  // Processes only branch creation (new functionality)
  async handleCreateBranch(branchName, cardData) {
    
    const gitResult = await this.createBranchLocally(branchName);
    
    return {
      branchName,
      cardData,
      gitResult,
      timestamp: new Date().toISOString()
    };
  }

  // Processes complete branch generation (legacy functionality - kept for compatibility)
  async handleGenerateBranch(cardData) {
    
    // 1. Generate branch name with Gemini
    const branchName = await this.generateBranchName(cardData);
    
    // 2. Create branch locally
    const gitResult = await this.createBranchLocally(branchName);
    
    return {
      branchName,
      cardData,
      gitResult,
      timestamp: new Date().toISOString()
    };
  }

  // Saves configuration
  async handleSaveConfig(config) {
    // Update local properties
    if (config.geminiApiKey !== undefined) {
      this.apiKey = config.geminiApiKey;
    }
    if (config.projectPath !== undefined) {
      this.projectPath = config.projectPath;
    }
    
    // Save to storage
    await this.saveConfiguration(config);
    
    return { message: 'Configuration saved successfully' };
  }

  // Retrieve configuration
  async handleGetConfig() {
    await this.loadConfiguration();
    
    return {
      hasApiKey: !!this.apiKey,
      hasProjectPath: !!this.projectPath,
      projectPath: this.projectPath
    };
  }

  // Test connections (Gemini API + Local Server)
  async handleTestConnection() {
    const results = {
      geminiAPI: { status: 'unknown', message: '' },
      localServer: { status: 'unknown', message: '' }
    };

    // Testar Gemini API
    try {
      if (!this.apiKey) {
        results.geminiAPI = { status: 'error', message: 'API key not configured' };
      } else {
        const testResponse = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'teste' }] }]
          })
        });
        
        if (testResponse.ok) {
          results.geminiAPI = { status: 'success', message: 'Gemini API working' };
        } else {
          results.geminiAPI = { status: 'error', message: `Erro ${testResponse.status}` };
        }
      }
    } catch (error) {
      results.geminiAPI = { status: 'error', message: error.message };
    }

    // Testar servidor local
    try {
      const serverResponse = await fetch('http://localhost:3000/health');
      if (serverResponse.ok) {
        results.localServer = { status: 'success', message: 'Local server working' };
      } else {
        results.localServer = { status: 'error', message: 'Server returned error' };
      }
    } catch (error) {
      results.localServer = { status: 'error', message: 'Local server is not running' };
    }

    return results;
  }
}

// Inicializar cliente da API
const geminiClient = new GeminiAPIClient();
