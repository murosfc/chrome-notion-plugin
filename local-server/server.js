const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const GitHandler = require("./git-handler");

class LocalServer {
  constructor() {
    this.app = express();
    this.port = 3000;
    this.gitHandler = new GitHandler();

    this.setupMiddleware();
    this.setupRoutes();
    this.start();
  }

  setupMiddleware() {
    // CORS to allow requests from Chrome extension
    this.app.use(
      cors({
        origin: ["chrome-extension://*", "moz-extension://*"],
        credentials: true,
      })
    );

    // Parse JSON bodies
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        message: "Local Git server working",
        timestamp: new Date().toISOString(),
        version: "1.1.0",
      });
    });

    // Load configuration from config.json
    this.app.get("/load-config", (req, res) => {
      try {
        const configPath = path.join(__dirname, "..", "config.json");

        if (!fs.existsSync(configPath)) {
          return res.json({
            success: false,
            error: "config.json not found",
            path: configPath,
          });
        }

        const configData = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(configData);

        // Validate required fields
        const hasApiKey =
          config.geminiApiKey &&
          config.geminiApiKey !== "PASTE_YOUR_GEMINI_API_KEY_HERE";
        const hasProjectPath =
          config.projectPath && config.projectPath !== "/path/to/your/project";

        res.json({
          success: true,
          config: {
            geminiApiKey: hasApiKey ? config.geminiApiKey : null,
            projectPath: hasProjectPath ? config.projectPath : null,
            defaultBaseBranch: config.settings?.defaultBaseBranch || "",
            hasApiKey,
            hasProjectPath,
            settings: config.settings || {},
            advanced: config.advanced || {},
          },
        });
      } catch (error) {
        console.error("❌ Error loading config.json:", error);

        if (error instanceof SyntaxError) {
          res.json({
            success: false,
            error: "Invalid JSON format in config.json",
            details: error.message,
          });
        } else {
          res.json({
            success: false,
            error: "Failed to read config.json",
            details: error.message,
          });
        }
      }
    });

    // Create branch
    this.app.post("/create-branch", async (req, res) => {
      try {
        const { branchName, projectPath, defaultBaseBranch } = req.body;

        // Validation
        if (!branchName || !projectPath) {
          return res.status(400).json({
            error: "branchName and projectPath are required",
            received: { branchName: !!branchName, projectPath: !!projectPath },
          });
        }

        // Verificar se o caminho existe
        if (!fs.existsSync(projectPath)) {
          return res.status(400).json({
            error: "Project path does not exist",
            path: projectPath,
          });
        }

        // Verificar se é um repositório Git
        const gitPath = path.join(projectPath, ".git");
        if (!fs.existsSync(gitPath)) {
          return res.status(400).json({
            error: "Not a valid Git repository",
            path: projectPath,
            suggestion: 'Execute "git init" in project or check the path',
          });
        }

        // Create branch using GitHandler (automatic checkout enabled by default)
        const result = await this.gitHandler.createBranch(
          branchName,
          projectPath,
          true,
          defaultBaseBranch
        );

        res.json({
          success: true,
          ...result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error creating branch:", error);

        res.status(500).json({
          error: error.message,
          code: error.code || "UNKNOWN_ERROR",
          details: error.details || null,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Repository status
    this.app.post("/git-status", async (req, res) => {
      try {
        const { projectPath } = req.body;

        if (!projectPath) {
          return res.status(400).json({
            error: "projectPath is required",
          });
        }

        const status = await this.gitHandler.getRepoStatus(projectPath);

        res.json({
          success: true,
          ...status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error checking status:", error);

        res.status(500).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // List branches
    this.app.post("/list-branches", async (req, res) => {
      try {
        const { projectPath } = req.body;

        if (!projectPath) {
          return res.status(400).json({
            error: "projectPath is required",
          });
        }

        const branches = await this.gitHandler.listBranches(projectPath);

        res.json({
          success: true,
          branches,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error listing branches:", error);

        res.status(500).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Validate Git repository
    this.app.post("/validate-repo", async (req, res) => {
      try {
        const { projectPath } = req.body;

        if (!projectPath) {
          return res.status(400).json({
            error: "projectPath is required",
          });
        }

        const validation = await this.gitHandler.validateRepository(
          projectPath
        );

        res.json({
          success: true,
          ...validation,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error in validation:", error);

        res.status(500).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Catch-all route for endpoints not found
    this.app.all("*", (req, res) => {
      res.status(404).json({
        error: "Endpoint not found",
        availableEndpoints: [
          "GET  /health",
          "POST /create-branch",
          "POST /git-status",
          "POST /list-branches",
          "POST /validate-repo",
        ],
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error("💥 Internal server error:", error);

      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    });
  }

  start() {
    const server = this.app.listen(this.port, "localhost", () => {
      console.log("🚀 Chrome Notion Plugin Server is running!");
      console.log(`📡 Server: http://localhost:${this.port}`);
      console.log("🔗 Ready to receive requests from Chrome Extension");
      console.log("📝 Press Ctrl+C to stop the server");
      console.log(""); // Empty line for better readability
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      server.close(() => {
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      server.close(() => {
        process.exit(0);
      });
    });

    // Handling uncaught errors
    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error(
        "💥 Unhandled promise rejection at:",
        promise,
        "reason:",
        reason
      );
      process.exit(1);
    });
  }
}

// Initialize server if this file is executed directly
if (require.main === module) {
  new LocalServer();
}

module.exports = LocalServer;
