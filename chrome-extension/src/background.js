// Background Service Worker - Gemini API Integration using Official SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiAPIClient {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.apiKey = null;
    this.projectPath = null;
    this.defaultBaseBranch = null;

    // Usar Gemini 2.5 Flash-Lite (mais rápido e eficiente)
    this.modelName = "gemini-2.0-flash-exp";

    this.setupMessageListener();
    this.loadConfiguration();
  }

  async loadConfiguration() {
    try {
      const result = await chrome.storage.sync.get([
        "geminiApiKey",
        "projectPath",
        "defaultBaseBranch",
      ]);
      this.apiKey = result.geminiApiKey;
      this.projectPath = result.projectPath;
      this.defaultBaseBranch = result.defaultBaseBranch;

      // Inicializar o cliente da API se temos a chave
      if (this.apiKey) {
        this.initializeGeminiClient();
      }
    } catch (error) {
      console.error("❌ Error loading configuration:", error);
    }
  }

  initializeGeminiClient() {
    try {
      console.log("🔍 Initializing Gemini client with model:", this.modelName);
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 100,
        },
      });
      console.log("✅ Gemini client initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Gemini client:", error);
      throw error;
    }
  }

  async saveConfiguration(config) {
    try {
      await chrome.storage.sync.set(config);

      // Reinicializar cliente se a API key mudou
      if (config.geminiApiKey !== undefined) {
        this.apiKey = config.geminiApiKey;
        if (this.apiKey) {
          this.initializeGeminiClient();
        }
      }
    } catch (error) {
      console.error("❌ Error saving configuration:", error);
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

  // Calls Gemini API to generate branch name using official SDK
  async generateBranchName(cardData, previousBranchName = null) {
    console.log("🔍 generateBranchName called with:", {
      hasApiKey: !!this.apiKey,
      hasModel: !!this.model,
      modelName: this.modelName,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + "..." : "none",
    });

    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    if (!this.model) {
      console.log("🔄 Model not initialized, initializing now...");
      this.initializeGeminiClient();
    }

    const prompt = this.generateBranchPrompt(cardData, previousBranchName);

    try {
      console.log("🔍 Making API request using official SDK...");

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text().trim();

      console.log("✅ API request successful:", {
        responseLength: generatedText.length,
        responsePreview: generatedText.substring(0, 50) + "...",
      });

      if (!generatedText) {
        throw new Error("Empty response from Gemini API");
      }

      // Limpar e validar o nome do branch
      const branchName = this.sanitizeBranchName(generatedText);
      console.log("✅ Branch name generated:", branchName);

      return branchName;
    } catch (error) {
      console.error("❌ Error calling Gemini API:", error);

      // Tratar erros específicos do SDK
      if (error.message.includes("API_KEY_INVALID")) {
        throw new Error(
          "Error 401: Invalid API key - please reconfigure your Gemini API key."
        );
      } else if (error.message.includes("PERMISSION_DENIED")) {
        throw new Error(
          "Error 403: Gemini API not enabled. Enable the Generative Language API in Google Cloud Console."
        );
      } else if (error.message.includes("QUOTA_EXCEEDED")) {
        throw new Error(
          "Error 429: Quota limit exceeded. You have reached your API usage limit."
        );
      } else if (error.message.includes("MODEL_NOT_FOUND")) {
        console.log("⚠️ Model not found, trying fallback model...");
        return await this.tryFallbackModel(cardData, previousBranchName);
      }

      throw error;
    }
  }

  // Tentar modelos alternativos se o principal falhar
  async tryFallbackModel(cardData, previousBranchName = null) {
    const fallbackModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    for (const modelName of fallbackModels) {
      try {
        console.log(`🔄 Trying fallback model: ${modelName}`);

        const fallbackModel = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 100,
          },
        });

        const prompt = this.generateBranchPrompt(cardData, previousBranchName);
        const result = await fallbackModel.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text().trim();

        if (generatedText) {
          console.log(`✅ Fallback model ${modelName} worked!`);
          // Atualizar modelo principal para o que funcionou
          this.model = fallbackModel;
          this.modelName = modelName;

          const branchName = this.sanitizeBranchName(generatedText);
          return branchName;
        }
      } catch (fallbackError) {
        console.log(
          `❌ Fallback model ${modelName} failed:`,
          fallbackError.message
        );
        continue;
      }
    }

    throw new Error(
      "All Gemini models failed. Please check your API key and try again."
    );
  }

  // Sanitiza e valida o nome do branch
  sanitizeBranchName(rawName) {
    // Remove quebras de linha, espaços extras e caracteres especiais
    let cleaned = rawName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-\/]/g, "-") // Substitui caracteres especiais por hífen
      .replace(/-+/g, "-") // Remove hífens duplicados
      .replace(/^-|-$/g, ""); // Remove hífens do início/fim

    // Garantir que tenha o formato correto tipo/nome
    if (!cleaned.includes("/")) {
      cleaned = "feat/" + cleaned;
    }

    // Limitar tamanho total
    if (cleaned.length > 60) {
      const parts = cleaned.split("/");
      const type = parts[0];
      const desc = parts.slice(1).join("/");
      cleaned = type + "/" + desc.substring(0, 50 - type.length);
    }

    return cleaned;
  }

  // Creates branch via local server
  async createBranchLocally(branchName) {
    if (!this.projectPath) {
      throw new Error("Project path not configured");
    }

    try {
      const requestBody = {
        branchName,
        projectPath: this.projectPath,
      };

      // Add default base branch if configured
      if (this.defaultBaseBranch) {
        requestBody.defaultBaseBranch = this.defaultBaseBranch;
      }

      const response = await fetch("http://localhost:3000/create-branch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local server error: ${errorText}`);
      }

      const result = await response.json();

      return result;
    } catch (error) {
      console.error("❌ Error creating branch locally:", error);

      // If local server is not available, inform this
      if (error.message.includes("fetch")) {
        throw new Error(
          "Local server is not running. Execute: cd local-server && npm start"
        );
      }

      throw error;
    }
  }

  // Configura listener para mensagens do popup
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Validar mensagem
      if (!message || !message.action) {
        console.error("❌ Invalid message in background");
        sendResponse({ success: false, error: "Invalid message" });
        return true;
      }

      try {
        switch (message.action) {
          case "contentScriptLoaded":
            sendResponse({
              success: true,
              message: "Content script registered",
            });
            break;

          case "generateBranchName":
            this.handleGenerateBranchName(
              message.cardData,
              message.previousBranchName
            )
              .then((branchName) => sendResponse({ success: true, branchName }))
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
            break;

          case "createBranch":
            this.handleCreateBranch(message.branchName, message.cardData)
              .then((result) => sendResponse({ success: true, data: result }))
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
            break;

          case "generateBranch":
            this.handleGenerateBranch(message.cardData)
              .then((result) => sendResponse({ success: true, data: result }))
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
            break;

          case "saveConfig":
            this.handleSaveConfig(message.config)
              .then(() => sendResponse({ success: true }))
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
            break;

          case "getConfig":
            this.handleGetConfig()
              .then((config) => sendResponse({ success: true, data: config }))
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
            break;

          case "testConnection":
            this.handleTestConnection()
              .then((result) => sendResponse({ success: true, data: result }))
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
            break;

          default:
            console.warn("⚠️ Unknown action in background:", message.action);
            sendResponse({
              success: false,
              error: "Unknown action: " + message.action,
            });
        }
      } catch (error) {
        console.error("❌ Error in background script:", error);
        sendResponse({
          success: false,
          error: "Internal background error: " + error.message,
        });
      }

      return true; // Mantém o canal aberto para respostas assíncronas
    });
  }

  // Processes only branch name generation (new functionality)
  async handleGenerateBranchName(cardData, previousBranchName = null) {
    const branchName = await this.generateBranchName(
      cardData,
      previousBranchName
    );

    return branchName;
  }

  // Processes only branch creation (new functionality)
  async handleCreateBranch(branchName, cardData) {
    const gitResult = await this.createBranchLocally(branchName);

    return {
      branchName,
      cardData,
      gitResult,
      timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
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
    if (config.defaultBaseBranch !== undefined) {
      this.defaultBaseBranch = config.defaultBaseBranch;
    }

    // Save to storage
    await this.saveConfiguration(config);

    return { message: "Configuration saved successfully" };
  }

  // Retrieve configuration
  async handleGetConfig() {
    // First try to load from config.json via local server
    const fileConfig = await this.loadConfigFromFile();

    if (
      fileConfig.success &&
      (fileConfig.config.hasApiKey || fileConfig.config.hasProjectPath)
    ) {
      // Save to Chrome storage if loaded from file
      const configToSave = {};
      if (fileConfig.config.hasApiKey) {
        configToSave.geminiApiKey = fileConfig.config.geminiApiKey;
        this.apiKey = fileConfig.config.geminiApiKey;
      }
      if (fileConfig.config.hasProjectPath) {
        configToSave.projectPath = fileConfig.config.projectPath;
        this.projectPath = fileConfig.config.projectPath;
      }
      if (fileConfig.config.defaultBaseBranch) {
        configToSave.defaultBaseBranch = fileConfig.config.defaultBaseBranch;
        this.defaultBaseBranch = fileConfig.config.defaultBaseBranch;
      }

      try {
        await this.saveConfiguration(configToSave);
        console.log(
          "✅ Configuration loaded from config.json and saved to Chrome storage"
        );
      } catch (error) {
        console.warn(
          "⚠️ Could not save config to Chrome storage:",
          error.message
        );
      }
    } else {
      // Fallback to Chrome storage
      await this.loadConfiguration();
    }

    return {
      hasApiKey: !!this.apiKey,
      hasProjectPath: !!this.projectPath,
      projectPath: this.projectPath,
      defaultBaseBranch: this.defaultBaseBranch,
      loadedFromFile: fileConfig.success,
    };
  }

  // Load configuration from config.json file
  async loadConfigFromFile() {
    try {
      const response = await fetch("http://localhost:3000/load-config");

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.log(
        "ℹ️ Could not load config.json (server may not be running):",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Test connections (Gemini API + Local Server) using official SDK
  async handleTestConnection() {
    const results = {
      geminiAPI: { status: "unknown", message: "" },
      localServer: { status: "unknown", message: "" },
    };

    // Testar Gemini API usando SDK oficial
    try {
      console.log("🔍 Testing Gemini API connection using official SDK:", {
        hasApiKey: !!this.apiKey,
        hasModel: !!this.model,
        modelName: this.modelName,
        apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      });

      if (!this.apiKey) {
        results.geminiAPI = {
          status: "error",
          message: "API key not configured. Please set up your Gemini API key.",
        };
      } else {
        // Inicializar cliente se necessário
        if (!this.model) {
          this.initializeGeminiClient();
        }

        // Fazer teste simples
        const result = await this.model.generateContent("test");
        const response = await result.response;
        const text = response.text();

        if (text) {
          console.log("✅ Gemini API test successful");
          results.geminiAPI = {
            status: "success",
            message: `Gemini API working (${this.modelName})`,
          };
        } else {
          throw new Error("Empty response from API");
        }
      }
    } catch (error) {
      console.error("❌ Gemini API test failed:", error);

      let errorMsg = "Connection failed - check API key";

      if (error.message.includes("API_KEY_INVALID")) {
        errorMsg = "Invalid API key - please reconfigure";
      } else if (error.message.includes("PERMISSION_DENIED")) {
        errorMsg = "API not enabled or no permissions";
      } else if (error.message.includes("QUOTA_EXCEEDED")) {
        errorMsg = "Quota exceeded - try again later";
      } else if (error.message.includes("MODEL_NOT_FOUND")) {
        errorMsg = "Model not available - trying fallback";

        // Tentar modelo fallback
        try {
          await this.tryFallbackModel({ title: "test" });
          results.geminiAPI = {
            status: "success",
            message: `Gemini API working (fallback: ${this.modelName})`,
          };
        } catch (fallbackError) {
          errorMsg = "All models failed - check API key";
        }
      }

      if (results.geminiAPI.status !== "success") {
        results.geminiAPI = { status: "error", message: errorMsg };
      }
    }

    // Testar servidor local
    try {
      const serverResponse = await fetch("http://localhost:3000/health");
      if (serverResponse.ok) {
        results.localServer = {
          status: "success",
          message: "Local server working",
        };
      } else {
        results.localServer = {
          status: "error",
          message: "Server returned error",
        };
      }
    } catch (error) {
      results.localServer = {
        status: "error",
        message: "Local server is not running",
      };
    }

    return results;
  }
}

// Inicializar cliente da API
const geminiClient = new GeminiAPIClient();
