// Popup JavaScript - User Interface

class PopupManager {
  constructor() {
    this.currentCardData = null;
    this.currentBranchSuggestion = null;
    this.isConfigured = false;
    this.isInitializing = true;

    this.initializeElements();
    this.setupEventListeners();
    this.initializeProgressively();
  }

  initializeElements() {
    // Status elements
    this.statusCard = document.getElementById("statusCard");
    this.statusIndicator = document.getElementById("statusIndicator");
    this.statusText = document.getElementById("statusText");

    // Configuration elements
    this.configSection = document.getElementById("configSection");
    this.actionSection = document.getElementById("actionSection");
    this.apiKeyInput = document.getElementById("apiKeyInput");
    this.projectPathInput = document.getElementById("projectPathInput");
    this.saveConfigBtn = document.getElementById("saveConfigBtn");
    this.toggleApiKey = document.getElementById("toggleApiKey");
    this.selectFolder = document.getElementById("selectFolder");

    // Action elements
    this.cardInfo = document.getElementById("cardInfo");
    this.cardTitle = document.getElementById("cardTitle");
    this.cardUrl = document.getElementById("cardUrl");
    this.refreshCardBtn = document.getElementById("refreshCardBtn");
    this.generateBranchBtn = document.getElementById("generateBranchBtn");

    // Branch suggestion elements
    this.branchSuggestion = document.getElementById("branchSuggestion");
    this.branchPreview = document.getElementById("branchPreview");
    this.refreshSuggestionBtn = document.getElementById("refreshSuggestionBtn");
    this.branchSuggestionLoading = document.getElementById(
      "branchSuggestionLoading"
    );

    // Result elements
    this.resultArea = document.getElementById("resultArea");
    this.resultSuccess = document.getElementById("resultSuccess");
    this.resultError = document.getElementById("resultError");
    this.branchName = document.getElementById("branchName");
    this.resultDetails = document.getElementById("resultDetails");
    this.errorMessage = document.getElementById("errorMessage");
    this.errorActions = document.getElementById("errorActions");
    this.reconfigureApiBtn = document.getElementById("reconfigureApiBtn");

    // Connection test elements
    this.connectionTests = document.getElementById("connectionTests");
    this.geminiStatus = document.getElementById("geminiStatus");
    this.serverStatus = document.getElementById("serverStatus");
    this.testConnectionBtn = document.getElementById("testConnectionBtn");

    // Loading overlay
    this.loadingOverlay = document.getElementById("loadingOverlay");
  }

  setupEventListeners() {
    // Configuration
    this.saveConfigBtn.addEventListener("click", () =>
      this.saveConfiguration()
    );
    this.toggleApiKey.addEventListener("click", () =>
      this.toggleApiKeyVisibility()
    );
    this.selectFolder.addEventListener("click", () =>
      this.selectProjectFolder()
    );

    // Actions
    this.refreshCardBtn.addEventListener("click", () => this.refreshCardData());
    this.generateBranchBtn.addEventListener("click", () =>
      this.generateBranch()
    );
    this.refreshSuggestionBtn.addEventListener("click", () =>
      this.generateBranchSuggestion()
    );

    // Connection test
    this.testConnectionBtn.addEventListener("click", () =>
      this.testConnections()
    );

    // Error handling
    this.reconfigureApiBtn.addEventListener("click", () =>
      this.showConfigurationSection()
    );

    // Input validation
    this.apiKeyInput.addEventListener("input", () => {
      this.clearFieldStyles(this.apiKeyInput);
      this.validateInputs();
    });
    this.projectPathInput.addEventListener("input", () => {
      this.clearFieldStyles(this.projectPathInput);
      this.validateInputs();
    });
  }

  async initializeProgressively() {
    try {
      // Phase 1: Show interface immediately
      this.setStatus("success", "Interface loaded successfully!");
      this.isInitializing = false;

      // Phase 2: Load configuration in background
      setTimeout(async () => {
        try {
          await this.loadConfiguration();
          this.updateInterface();

          // Phase 3: Check Notion page and test connections
          if (this.isConfigured) {
            this.checkBackgroundTasks();
          }
        } catch (error) {
          console.error("❌ Background initialization error:", error);
          this.handleInitializationError(error);
        }
      }, 100);
    } catch (error) {
      console.error("❌ Critical initialization error:", error);
      this.setStatus("error", "Failed to load interface: " + error.message);
    }
  }

  async checkBackgroundTasks() {
    // Run background checks without blocking the UI
    try {
      // Check Notion page
      await this.checkNotionPage();

      // Test connections
      setTimeout(() => this.testConnections(), 500);

      // Auto-refresh card data if on Notion
      setTimeout(() => this.refreshCardData(), 1000);
    } catch (error) {
      console.error("❌ Background task error:", error);
      this.handleBackgroundError(error);
    }
  }

  handleInitializationError(error) {
    if (
      error.message.includes("API key") ||
      error.message.includes("configuration")
    ) {
      this.setStatus("warning", "Configuration needed - please complete setup");
      this.showConfigurationSection();
    } else {
      this.setStatus("error", "Initialization error: " + error.message);
    }
  }

  handleBackgroundError(error) {
    if (error.message.includes("Notion")) {
      this.setStatus("warning", "Open a Notion page to detect cards");
    } else {
      console.warn("Background error (non-critical):", error.message);
    }
  }

  async loadConfiguration() {
    try {
      const response = await this.sendMessage({ action: "getConfig" });

      if (response.success) {
        const config = response.data;
        this.isConfigured = config.hasApiKey && config.hasProjectPath;

        // Pre-populate fields if they exist
        if (config.projectPath) {
          this.projectPathInput.value = config.projectPath;
        }

        // Show feedback if configuration was loaded from file
        if (config.loadedFromFile) {
          if (this.isConfigured) {
            this.setStatus(
              "success",
              "Configuration loaded from config.json file!"
            );
          } else if (config.hasApiKey || config.hasProjectPath) {
            this.setStatus(
              "warning",
              "Partial configuration loaded from config.json - please complete setup"
            );

            // Pre-populate API key field with placeholder if it was loaded
            if (config.hasApiKey) {
              this.apiKeyInput.placeholder =
                "✅ API key loaded from config.json";
              this.apiKeyInput.classList.add("config-loaded");
            }

            // Highlight project path field if it was loaded
            if (config.hasProjectPath) {
              this.projectPathInput.classList.add("config-loaded");
            }

            // Highlight missing fields
            if (!config.hasApiKey) {
              this.apiKeyInput.classList.add("missing-field");
              this.apiKeyInput.focus();
            } else if (!config.hasProjectPath) {
              this.projectPathInput.classList.add("missing-field");
              this.projectPathInput.focus();
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error loading configuration:", error);
    }
  }

  async saveConfiguration() {
    const apiKey = this.apiKeyInput.value.trim();
    const projectPath = this.projectPathInput.value.trim();

    if (!apiKey || !projectPath) {
      let errorMsg = "Fill in all required fields";
      this.showError(errorMsg);
      return;
    }

    let loadingMsg = "Saving configuration...";
    this.showLoading(loadingMsg);

    try {
      const response = await this.sendMessage({
        action: "saveConfig",
        config: { geminiApiKey: apiKey, projectPath },
      });

      if (response.success) {
        this.isConfigured = true;
        let successMsg = "Configuration saved successfully!";
        this.setStatus("success", successMsg);
        this.updateInterface();

        // Test connections after saving
        setTimeout(() => this.testConnections(), 1000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("❌ Error saving configuration:", error);
      this.showError("Error saving configuration: " + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async checkNotionPage() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        throw new Error("Nenhuma aba ativa encontrada");
      }

      // Verificação melhorada para URLs do Notion (incluindo organizações)
      const url = new URL(tab.url);
      const isNotionDomain =
        url.hostname === "www.notion.so" || url.hostname === "notion.so";

      if (!isNotionDomain) {
        throw new Error(
          `Open a Notion page to use the plugin. Current URL: ${url.hostname}`
        );
      }

      const response = await this.sendMessageToTab(tab.id, {
        action: "isNotionPage",
      });

      if (!response.success) {
        throw new Error("Communication failure with page");
      }

      if (!response.isNotion) {
        throw new Error("Notion interface not detected on page");
      }

      // Detect if it's an organizational page
      if (url.pathname.includes("/")) {
        const pathParts = url.pathname.split("/").filter((p) => p);
        if (pathParts.length > 0) {
        }
      }
    } catch (error) {
      console.error("❌ Error checking Notion page:", error);

      if (
        error.message.includes("Content script did not respond") ||
        error.message.includes("establish connection") ||
        error.message.includes("Interface do Notion não foi detectada") ||
        error.message.includes("Communication failure") ||
        error.message.includes("Receiving end does not exist")
      ) {
        let refreshMsg =
          "🔄 Plugin not loaded in Notion page. Please refresh the Notion page (F5) and try again.";
        throw new Error(refreshMsg);
      }

      throw new Error(error.message);
    }
  }

  async refreshCardData() {
    this.showLoading("Capturing card data...");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        throw new Error("Tab not found");
      }

      const response = await this.sendMessageToTab(tab.id, {
        action: "getCardData",
      });

      if (response.success && response.data) {
        this.currentCardData = response.data;
        this.displayCardData(response.data);

        // Automatically generate branch suggestion
        await this.generateBranchSuggestion();
      } else {
        throw new Error(response.error || "No card detected");
      }
    } catch (error) {
      console.error("❌ Error capturing data:", error);

      // Check if it's a content script connection error
      if (this.isContentScriptError(error.message)) {
        this.showContentScriptError(error.message);
      } else {
        this.showError("Error capturing card data: " + error.message);
      }

      this.currentCardData = null;
      this.currentBranchSuggestion = null;
      this.generateBranchBtn.disabled = true;
      this.hideBranchSuggestion();
    } finally {
      this.hideLoading();
    }
  }

  async generateBranchSuggestion() {
    if (!this.currentCardData) {
      return;
    }

    try {
      this.showBranchSuggestionLoading();

      // Pass previous branch name to avoid repetition
      const response = await this.sendMessage({
        action: "generateBranchName",
        cardData: this.currentCardData,
        previousBranchName: this.currentBranchSuggestion, // Pass current suggestion to get a different one
      });

      if (response.success && response.branchName) {
        this.currentBranchSuggestion = response.branchName;
        this.showBranchSuggestion(response.branchName);
        this.generateBranchBtn.disabled = false;
      } else {
        throw new Error(
          response.error || "Failed to generate branch suggestion"
        );
      }
    } catch (error) {
      console.error("❌ Error generating branch suggestion:", error);
      this.hideBranchSuggestion();
      this.generateBranchBtn.disabled = true;
    } finally {
      this.hideBranchSuggestionLoading();
    }
  }

  showBranchSuggestion(branchName) {
    this.branchPreview.textContent = branchName;
    this.branchSuggestion.style.display = "block";
    this.refreshSuggestionBtn.disabled = false;
  }

  hideBranchSuggestion() {
    this.branchSuggestion.style.display = "none";
    this.currentBranchSuggestion = null;
  }

  showBranchSuggestionLoading() {
    this.branchSuggestionLoading.style.display = "flex";
    this.branchPreview.parentElement.style.display = "none";
    this.refreshSuggestionBtn.disabled = true;
  }

  hideBranchSuggestionLoading() {
    this.branchSuggestionLoading.style.display = "none";
    this.branchPreview.parentElement.style.display = "flex";
  }

  async generateBranch() {
    if (!this.currentCardData || !this.currentBranchSuggestion) {
      let errorMsg =
        "No branch suggestion available. Please refresh the card first.";
      this.showError(errorMsg);
      return;
    }

    let loadingMsg = "Creating branch...";
    this.showLoading(loadingMsg);
    this.hideResults();

    try {
      const response = await this.sendMessage({
        action: "createBranch",
        branchName: this.currentBranchSuggestion,
        cardData: this.currentCardData,
      });

      if (response.success) {
        this.showSuccess(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("❌ Error creating branch:", error);
      this.showError("Error generating branch: " + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async testConnections() {
    let testingMsg = "⏳ Testing...";

    this.geminiStatus.textContent = testingMsg;
    this.serverStatus.textContent = testingMsg;

    try {
      const response = await this.sendMessage({ action: "testConnection" });

      if (response.success) {
        const results = response.data;

        // Status Gemini API
        if (results.geminiAPI.status === "success") {
          let workingMsg = "✅ Working";
          this.geminiStatus.textContent = workingMsg;
          this.geminiStatus.className = "test-status success";
        } else {
          let errorMsg = "❌ " + results.geminiAPI.message;
          this.geminiStatus.textContent = errorMsg;
          this.geminiStatus.className = "test-status error";

          // Show configuration option for API errors
          if (this.isApiError(results.geminiAPI.message)) {
            this.setStatus(
              "warning",
              "API key issue detected - please reconfigure"
            );
          }
        }

        // Status Servidor Local
        if (results.localServer.status === "success") {
          let workingMsg = "✅ Working";
          this.serverStatus.textContent = workingMsg;
          this.serverStatus.className = "test-status success";
        } else {
          let errorMsg = "❌ " + results.localServer.message;
          this.serverStatus.textContent = errorMsg;
          this.serverStatus.className = "test-status error";
        }
      }
    } catch (error) {
      console.error("❌ Error testing connections:", error);
      let errorMsg = "❌ Error";
      this.geminiStatus.textContent = errorMsg;
      this.serverStatus.textContent = errorMsg;
    }
  }

  displayCardData(cardData) {
    let noTitleText = "No title";
    this.cardTitle.textContent = cardData.title || noTitleText;

    // Display URL with organization information if applicable
    const url = new URL(cardData.url);
    const pathParts = url.pathname.split("/").filter((p) => p);

    let urlDisplay = url.pathname;
    if (pathParts.length > 0) {
      const org = pathParts[0];
      let orgText = `organization: ${org}`;
      urlDisplay = `/${org}/... (${orgText})`;
    }

    this.cardUrl.textContent = urlDisplay;

    // Add visual classes
    this.cardInfo.classList.add("card-detected");
  }

  showSuccess(result) {
    this.resultArea.style.display = "block";
    this.resultSuccess.style.display = "block";
    this.resultError.style.display = "none";

    this.branchName.textContent = result.branchName;
    this.resultDetails.textContent = `Created on: ${new Date(
      result.timestamp
    ).toLocaleString("en-US")}`;

    this.setStatus(
      "success",
      `Branch "${result.branchName}" created successfully!`
    );
  }

  showError(message) {
    this.resultArea.style.display = "block";
    this.resultSuccess.style.display = "none";
    this.resultError.style.display = "block";

    this.errorMessage.textContent = message;

    // Check if it's an API-related error
    if (this.isApiError(message)) {
      this.errorActions.style.display = "block";
    } else {
      this.errorActions.style.display = "none";
    }

    this.setStatus("error", message);
  }

  isApiError(message) {
    const apiErrorKeywords = [
      "API key",
      "Error 401",
      "Error 403",
      "Error 400",
      "not authorized",
      "Gemini API",
      "Invalid API",
      "not configured",
    ];

    return apiErrorKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  isContentScriptError(message) {
    const contentScriptKeywords = [
      "Content script did not respond",
      "establish connection",
      "Communication failure",
      "Receiving end does not exist",
      "Plugin not loaded",
    ];

    return contentScriptKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  showContentScriptError(message) {
    this.resultArea.style.display = "block";
    this.resultSuccess.style.display = "none";
    this.resultError.style.display = "block";

    this.errorMessage.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong>🔄 Connection Issue</strong><br>
        The plugin cannot communicate with the Notion page.
      </div>
      <div style="margin-bottom: 12px; font-size: 12px; color: #6b7280;">
        This usually happens when the content script isn't loaded properly.
      </div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; font-size: 12px;">
        <strong>💡 How to fix:</strong><br>
        1. Refresh the Notion page (F5)<br>
        2. Make sure you're on a Notion page<br>
        3. Try reloading the extension
      </div>
    `;

    // Show refresh button
    this.errorActions.style.display = "block";
    this.errorActions.innerHTML = `
      <button id="refreshNotionBtn" class="btn btn-secondary btn-small" style="margin-right: 8px;">
        🔄 Refresh Notion Page
      </button>
      <button id="reloadExtensionBtn" class="btn btn-secondary btn-small">
        🔧 Reload Extension
      </button>
    `;

    // Add event listeners for new buttons
    setTimeout(() => {
      const refreshNotionBtn = document.getElementById("refreshNotionBtn");
      const reloadExtensionBtn = document.getElementById("reloadExtensionBtn");

      if (refreshNotionBtn) {
        refreshNotionBtn.addEventListener("click", () =>
          this.refreshNotionPage()
        );
      }

      if (reloadExtensionBtn) {
        reloadExtensionBtn.addEventListener("click", () =>
          this.reloadExtension()
        );
      }
    }, 100);

    this.setStatus(
      "warning",
      "Connection issue with Notion page - try refreshing"
    );
  }

  showConfigurationSection() {
    this.configSection.style.display = "block";
    this.actionSection.style.display = "none";
    this.isConfigured = false;
    this.setStatus("warning", "Please configure your API key");

    // Focus on API key input
    setTimeout(() => {
      this.apiKeyInput.focus();
    }, 100);
  }

  hideResults() {
    this.resultArea.style.display = "none";
  }

  toggleApiKeyVisibility() {
    const isPassword = this.apiKeyInput.type === "password";
    this.apiKeyInput.type = isPassword ? "text" : "password";
    this.toggleApiKey.textContent = isPassword ? "🙈" : "👁️";
  }

  selectProjectFolder() {
    // Note: Chrome does not allow direct folder selection in extensions
    // The user needs to manually enter the path
    const placeholder = navigator.platform.toLowerCase().includes("win")
      ? "C:\\projects\\my-project"
      : "/home/user/projects/my-project";

    this.projectPathInput.placeholder = placeholder;
    this.projectPathInput.focus();
  }

  async refreshNotionPage() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab && tab.id) {
        await chrome.tabs.reload(tab.id);
        this.setStatus(
          "success",
          "Notion page refreshed! Please wait a moment and try again."
        );
        this.hideResults();

        // Wait a bit and then try to refresh card data
        setTimeout(() => {
          this.refreshCardData();
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Error refreshing page:", error);
      this.setStatus("error", "Could not refresh page: " + error.message);
    }
  }

  async reloadExtension() {
    try {
      await chrome.runtime.reload();
    } catch (error) {
      console.error("❌ Error reloading extension:", error);
      this.setStatus(
        "error",
        "Could not reload extension. Try manually from chrome://extensions/"
      );
    }
  }

  clearFieldStyles(inputElement) {
    // Remove all config-related classes when user starts typing
    inputElement.classList.remove("config-loaded", "missing-field");

    // Reset placeholder if it was set for config loading
    if (
      inputElement === this.apiKeyInput &&
      inputElement.placeholder.includes("config.json")
    ) {
      inputElement.placeholder = "Enter your Gemini API key";
    }
  }

  validateInputs() {
    const apiKey = this.apiKeyInput.value.trim();
    const projectPath = this.projectPathInput.value.trim();

    this.saveConfigBtn.disabled = !apiKey || !projectPath;
  }

  updateInterface() {
    if (this.isConfigured) {
      this.configSection.style.display = "none";
      this.actionSection.style.display = "block";

      let readyMsg = "Plugin configured and ready!";
      this.setStatus("success", readyMsg);

      // Only auto-refresh if not initializing to avoid blocking UI
      if (!this.isInitializing) {
        setTimeout(() => this.refreshCardData(), 500);
      }
    } else {
      this.configSection.style.display = "block";
      this.actionSection.style.display = "none";

      // Don't override status if it was already set by config loading
      if (!this.statusText.textContent.includes("config.json")) {
        let configMsg = "Configuration required";
        this.setStatus("warning", configMsg);
      }
    }
  }

  setStatus(type, message) {
    let displayMessage = message;

    this.statusText.textContent = displayMessage;
    this.statusIndicator.className = `status-indicator ${type}`;

    // Remove previous classes and add the new one
    this.statusCard.className = "status-card";
    this.statusCard.classList.add(type);
  }

  showLoading(message = null) {
    this.loadingOverlay.style.display = "flex";

    let loadingText;
    if (message) {
      loadingText = message;
    } else {
      loadingText = "Processing...";
    }

    this.loadingOverlay.querySelector(".loading-text").textContent =
      loadingText;
  }

  hideLoading() {
    this.loadingOverlay.style.display = "none";
  }

  // Utilitário melhorado para enviar mensagens
  async sendMessage(message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                `❌ Chrome runtime error (attempt ${attempt}):`,
                chrome.runtime.lastError.message
              );
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!response) {
              console.error(`❌ Empty response (attempt ${attempt})`);
              reject(new Error("Empty response from background script"));
              return;
            }

            resolve(response);
          });
        });
      } catch (error) {
        console.error(`❌ Error in attempt ${attempt}:`, error.message);

        if (attempt === maxRetries) {
          throw new Error(
            `Communication failure after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Aguardar antes da próxima tentativa
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Utilitário para enviar mensagens ao content script
  async sendMessageToTab(tabId, message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                `❌ Tab message error (attempt ${attempt}):`,
                chrome.runtime.lastError.message
              );
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!response) {
              console.error(`❌ Empty tab response (attempt ${attempt})`);
              reject(new Error("Content script did not respond"));
              return;
            }

            resolve(response);
          });
        });
      } catch (error) {
        console.error(
          `❌ Error communicating with tab (attempt ${attempt}):`,
          error.message
        );

        if (attempt === maxRetries) {
          throw new Error(
            `Communication failure with page after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
