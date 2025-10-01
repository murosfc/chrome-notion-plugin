// Background Service Worker - Gemini API Integration

class GeminiAPIClient {
  constructor() {
    // URLs possíveis da API Gemini (testamos em ordem de preferência)
    this.possibleURLs = [
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
      "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
    ];
    this.baseURL = this.possibleURLs[0]; // Começar com a primeira
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
    } catch (error) {
      console.error("❌ Error loading configuration:", error);
    }
  }

  async saveConfiguration(config) {
    try {
      await chrome.storage.sync.set(config);
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

🎯 BRANCH NAMING RULES:
1. Format: type/short-description
2. Allowed types: feat, fix, docs, style, refactor, test, chore
3. Description: Max 50 characters
4. Use lowercase, numbers, and hyphens only
5. Be specific but concise
6. Prefer technical English
7. Do not use spaces, underscores, or special characters

📝 EXAMPLES:
- "Implement user authentication" → feat/user-authentication
- "Fix shopping cart bug" → fix/shopping-cart-bug
- "Add unit tests" → test/unit-tests
- "Update API documentation" → docs/api-documentation

🎪 OUTPUT REQUIREMENT:
Return only the branch name, no explanations or extra text.`;

    return prompt;
  }

  // Test different API URLs to find the working one
  async findWorkingAPIURL() {
    if (!this.apiKey) {
      throw new Error("API key not configured");
    }

    console.log("🔍 Testing different API URLs to find working endpoint...");

    for (let i = 0; i < this.possibleURLs.length; i++) {
      const testURL = this.possibleURLs[i];
      console.log(
        `🔍 Testing URL ${i + 1}/${this.possibleURLs.length}:`,
        testURL
      );

      try {
        const response = await fetch(`${testURL}?key=${this.apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "test" }] }],
          }),
        });

        console.log(`🔍 URL ${i + 1} response:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (response.ok) {
          console.log(`✅ Found working URL: ${testURL}`);
          this.baseURL = testURL;
          return testURL;
        } else if (response.status !== 404) {
          // Se não é 404, pode ser problema de API key, não de URL
          console.log(
            `⚠️ URL ${i + 1} exists but returned ${
              response.status
            }, might be API key issue`
          );
          this.baseURL = testURL;
          return testURL;
        }
      } catch (error) {
        console.log(`❌ URL ${i + 1} failed:`, error.message);
      }
    }

    throw new Error(
      "No working API URL found. Please check if the Gemini API is available."
    );
  }

  // Calls Gemini API to generate branch name
  async generateBranchName(cardData, previousBranchName = null) {
    console.log("🔍 generateBranchName called with:", {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + "..." : "none",
      baseURL: this.baseURL,
    });

    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const prompt = this.generateBranchPrompt(cardData, previousBranchName);

    try {
      const requestURL = `${this.baseURL}?key=${this.apiKey}`;
      console.log(
        "🔍 Making API request to:",
        requestURL.replace(this.apiKey, "***API_KEY***")
      );

      const response = await fetch(requestURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Less creative, more consistent
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 100,
          },
        }),
      });

      console.log("🔍 API Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Gemini API error details:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          url: response.url.replace(this.apiKey, "***API_KEY***"),
          requestHeaders: {
            "Content-Type": "application/json",
          },
        });

        // Se for 404, tentar encontrar URL correta
        if (response.status === 404) {
          console.log("🔍 Got 404, trying to find correct API URL...");
          try {
            await this.findWorkingAPIURL();
            console.log("🔄 Retrying with new URL:", this.baseURL);

            // Tentar novamente com a nova URL
            const retryURL = `${this.baseURL}?key=${this.apiKey}`;
            const retryResponse = await fetch(retryURL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: prompt,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.3,
                  topK: 20,
                  topP: 0.8,
                  maxOutputTokens: 100,
                },
              }),
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const generatedText =
                retryData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

              if (generatedText) {
                const branchName = this.sanitizeBranchName(generatedText);
                console.log("✅ Retry successful with new URL");
                return branchName;
              }
            }
          } catch (urlError) {
            console.error("❌ Failed to find working URL:", urlError);
          }
        }

        let errorMessage;
        switch (response.status) {
          case 400:
            errorMessage =
              "Error 400: Invalid API key or incorrect parameters. Please check your Gemini API key configuration.";
            break;
          case 401:
            errorMessage =
              "Error 401: API key not authorized. Your API key may be invalid or expired. Please reconfigure your API key.";
            break;
          case 403:
            errorMessage =
              "Error 403: Gemini API not enabled. Enable the Generative Language API in Google Cloud Console or check your API key permissions.";
            break;
          case 404:
            errorMessage =
              "Error 404: Gemini model not found. The API endpoint may have changed. Please check if you are using the correct model.";
            break;
          case 429:
            errorMessage =
              "Error 429: Quota limit exceeded. You have reached your API usage limit. Try again later or check your quota in Google Cloud Console.";
            break;
          case 500:
            errorMessage =
              "Error 500: Internal Gemini API error. This is a temporary server issue. Please try again in a few moments.";
            break;
          default:
            errorMessage = `Error ${response.status}: ${errorText}. Please check your API key configuration.`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      const generatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!generatedText) {
        throw new Error("Invalid response from Gemini API");
      }

      // Limpar e validar o nome do branch
      const branchName = this.sanitizeBranchName(generatedText);

      return branchName;
    } catch (error) {
      console.error("❌ Error calling Gemini API:", error);
      throw error;
    }
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

  // Test connections (Gemini API + Local Server)
  async handleTestConnection() {
    const results = {
      geminiAPI: { status: "unknown", message: "" },
      localServer: { status: "unknown", message: "" },
    };

    // Testar Gemini API
    try {
      console.log("🔍 Testing Gemini API connection:", {
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey ? this.apiKey.length : 0,
        baseURL: this.baseURL,
      });

      if (!this.apiKey) {
        results.geminiAPI = {
          status: "error",
          message: "API key not configured. Please set up your Gemini API key.",
        };
      } else {
        const testURL = `${this.baseURL}?key=${this.apiKey}`;
        console.log(
          "🔍 Test request URL:",
          testURL.replace(this.apiKey, "***API_KEY***")
        );

        const testResponse = await fetch(testURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "test" }] }],
          }),
        });

        console.log("🔍 Test response:", {
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok,
        });

        if (testResponse.ok) {
          const responseData = await testResponse.json();
          console.log("✅ Test successful, response data:", responseData);
          results.geminiAPI = {
            status: "success",
            message: "Gemini API working",
          };
        } else {
          const errorText = await testResponse.text();
          console.error("❌ Test failed, error details:", {
            status: testResponse.status,
            statusText: testResponse.statusText,
            errorText: errorText,
          });

          // Se for 404, tentar encontrar URL correta
          if (testResponse.status === 404) {
            console.log("🔍 Test got 404, trying to find correct API URL...");
            try {
              await this.findWorkingAPIURL();
              console.log("🔄 Retesting with new URL:", this.baseURL);

              // Testar novamente com a nova URL
              const retestURL = `${this.baseURL}?key=${this.apiKey}`;
              const retestResponse = await fetch(retestURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: "test" }] }],
                }),
              });

              if (retestResponse.ok) {
                console.log("✅ Retest successful with new URL");
                results.geminiAPI = {
                  status: "success",
                  message: "Gemini API working (found correct URL)",
                };
                return results;
              }
            } catch (urlError) {
              console.error(
                "❌ Failed to find working URL during test:",
                urlError
              );
            }
          }

          let errorMsg = "";
          switch (testResponse.status) {
            case 401:
              errorMsg = "Invalid API key - please reconfigure";
              break;
            case 403:
              errorMsg = "API not enabled or no permissions";
              break;
            case 404:
              errorMsg = "API endpoint not found - may need to update plugin";
              break;
            case 429:
              errorMsg = "Quota exceeded - try again later";
              break;
            default:
              errorMsg = `Error ${testResponse.status} - check API key`;
          }
          results.geminiAPI = { status: "error", message: errorMsg };
        }
      }
    } catch (error) {
      console.error("❌ Exception during API test:", error);
      results.geminiAPI = {
        status: "error",
        message: "Connection failed - check API key: " + error.message,
      };
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
