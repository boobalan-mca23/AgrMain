// Ensure stdout and stderr file descriptors are valid in GUI mode / packaged executables.
// In GUI/packaged/Wine execution, standard file descriptors (fd 1 or 2) may be closed, causing Node to throw "Error: open EBADF" when process.stdout or process.stderr is accessed.
(function fixStdio() {
  const { Writable } = require("stream");
  ["stdout", "stderr"].forEach((streamName) => {
    try {
      const stream = process[streamName];
      if (stream && typeof stream.write === "function") {
        return;
      }
    } catch (e) {
      // Accessing stdio getter threw EBADF or fd error
    }
    const dummy = new Writable({
      write(chunk, encoding, callback) {
        if (typeof callback === "function") callback();
      }
    });
    dummy.isTTY = false;
    try {
      Object.defineProperty(process, streamName, {
        value: dummy,
        configurable: true,
        writable: true,
        enumerable: true
      });
    } catch (e) {
      process[streamName] = dummy;
    }
  });
})();

// Global safety error handlers for Electron main process
process.on("uncaughtException", (err) => {
  console.error("[Electron Main] Uncaught Exception caught safely:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Electron Main] Unhandled Rejection caught safely:", reason);
});

const { app, BrowserWindow, ipcMain, shell, dialog, Notification } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { autoUpdater } = require("electron-updater");
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

// Detect Wine environment robustly across standard Wine, PortProton, Lutris, Bottles, Flatpak
const isWine = 
  Object.keys(process.env).some(key => key.toUpperCase().startsWith("WINE")) || 
  (process.env.PATH && process.env.PATH.includes("/.wine")) ||
  !!process.env.PORTPROTON ||
  !!process.env.WINEPREFIX ||
  !!process.env.WINELOADER ||
  !!process.env.WINESERVER ||
  (process.platform === "win32" && (
    fs.existsSync("C:\\windows\\system32\\wineboot.exe") ||
    fs.existsSync("Z:\\proc\\version") ||
    fs.existsSync("Z:\\home")
  ));

if (isWine) {
  console.log("[Electron Main] Wine environment detected. Disabling hardware acceleration for stability.");
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-gpu-rasterization");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
} else {
  // In native desktop environments, enable hardware rasterization and zero-copy for fluid rendering
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");
}

// Single-instance lock to prevent port collisions and database corruption
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.warn("[Electron Main] Another instance is already running. Quitting duplicate instance cleanly.");
  app.quit();
  process.exit(0);
} else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let splashWindow = null;
let serverProcess = null;
let outLogStream = null;
let errLogStream = null;
let updateReadyToInstall = false; // tracks if update downloaded and ready
let isInstallingUpdate = false;   // tracks if updater restart is already triggered
let migrationPromise = null;
let serverPromise = null;
let serverStatus = "loading"; // 'loading', 'ready', 'failed'
let migrationStatus = "loading"; // 'loading', 'ready', 'failed'

function startInitialization() {
  if (!migrationPromise) {
    migrationStatus = "loading";
    migrationPromise = runPrismaMigrations()
      .then((success) => {
        migrationStatus = success ? "ready" : "failed";
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("migration-status", migrationStatus);
        }
        return success;
      })
      .catch((err) => {
        console.error("[Electron Main] Error running Prisma migrations:", err);
        migrationStatus = "failed";
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("migration-status", "failed");
        }
        return false;
      });
  }

  if (!serverPromise) {
    serverStatus = "loading";
    serverPromise = startExpressServer()
      .then(() => waitForServer())
      .then((ready) => {
        serverStatus = ready ? "ready" : "failed";
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("server-status", serverStatus);
        }
        return ready;
      });
  }
}


let SERVER_PORT = 5002;
const CLIENT_DEV_URL = "http://localhost:3000";

// Helper to parse and load key-value pairs from a .env file into process.env
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`[Electron Main] Loading environment from: ${filePath}`);
      const content = fs.readFileSync(filePath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const index = trimmed.indexOf("=");
          if (index !== -1) {
            const key = trimmed.substring(0, index).trim();
            let value = trimmed.substring(index + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.substring(1, value.length - 1);
            }
            process.env[key] = value;
          }
        }
      });
    }
  } catch (err) {
    console.error(`[Electron Main] Error loading environment file ${filePath}:`, err);
  }
}

// Ensures database.env exists in userData and loads it
function initializeEnvironment() {
  let serverDir;
  if (app.isPackaged) {
    serverDir = path.join(process.resourcesPath, "../server");
  } else {
    serverDir = path.join(__dirname, "../server");
  }

  const logDir = app.getPath("userData");
  const dbEnvPath = path.join(logDir, "database.env");
  const defaultEnvPath = path.join(serverDir, ".env");

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  if (fs.existsSync(defaultEnvPath)) {
    try {
      const defaultEnvContent = fs.readFileSync(defaultEnvPath, "utf8");
      const defaultDbMatch = defaultEnvContent.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
      const defaultUrl = defaultDbMatch ? defaultDbMatch[1] : null;

      let userUrl = null;
      if (fs.existsSync(dbEnvPath)) {
        const userEnvContent = fs.readFileSync(dbEnvPath, "utf8");
        const userDbMatch = userEnvContent.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
        if (userDbMatch) userUrl = userDbMatch[1];
      }

      // If database.env doesn't exist OR has a different database URL from server/.env, sync it
      if (!fs.existsSync(dbEnvPath) || (userUrl && defaultUrl && userUrl !== defaultUrl)) {
        fs.copyFileSync(defaultEnvPath, dbEnvPath);
        console.log(`[Electron Main] Synced current default .env (${defaultUrl}) to: ${dbEnvPath}`);
      }
    } catch (e) {
      console.error("[Electron Main] Env template sync check failed:", e);
    }
  }

  // Load environment variables from the user's custom database.env
  if (fs.existsSync(dbEnvPath)) {
    loadEnvFile(dbEnvPath);
  }

  // Fall back to server/.env if database.env was not loaded/empty (or if not in userData)
  if (!process.env.DATABASE_URL && fs.existsSync(defaultEnvPath)) {
    console.log("[Electron Main] DATABASE_URL not set, falling back to server/.env");
    loadEnvFile(defaultEnvPath);
  }

  if (process.env.PORT) {
    SERVER_PORT = parseInt(process.env.PORT, 10);
  }

  if (process.env.DATABASE_URL) {
    try {
      const urlObj = new URL(process.env.DATABASE_URL.replace(/^mysql:/, "http:"));
      console.log(`[Electron Main] Connected Database: "${urlObj.pathname.replace(/^\//, "")}" on host ${urlObj.host}`);
    } catch (e) {
      console.log(`[Electron Main] Connected DATABASE_URL: ${process.env.DATABASE_URL}`);
    }
  }
}

// Helper to compute a hash of Prisma schema and migrations to avoid redundant CLI spawns
function getMigrationsHash() {
  try {
    let serverDir;
    if (app.isPackaged) {
      serverDir = path.join(process.resourcesPath, "../server");
    } else {
      serverDir = path.join(__dirname, "../server");
    }
    const schemaPath = path.join(serverDir, "prisma/schema.prisma");
    const migrationsDir = path.join(serverDir, "prisma/migrations");
    const hash = crypto.createHash("sha256");
    if (fs.existsSync(schemaPath)) {
      hash.update(fs.readFileSync(schemaPath));
    }
    if (fs.existsSync(migrationsDir)) {
      const entries = fs.readdirSync(migrationsDir).sort();
      hash.update(entries.join(";"));
    }
    return hash.digest("hex");
  } catch (e) {
    return null;
  }
}

// Helper to check if migrations can be skipped
function shouldSkipMigrations() {
  try {
    const logDir = app.getPath("userData");
    const statePath = path.join(logDir, "migration-state.json");
    if (!fs.existsSync(statePath)) {
      return false;
    }
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    const currentVersion = app.getVersion();
    const currentDbUrl = process.env.DATABASE_URL || "";
    const dbUrlHash = crypto.createHash("sha256").update(currentDbUrl).digest("hex");
    const migrationHash = getMigrationsHash();

    if (
      (state.lastVersion === currentVersion && state.lastDbUrlHash === dbUrlHash) ||
      (migrationHash && state.lastMigrationHash === migrationHash && state.lastDbUrlHash === dbUrlHash)
    ) {
      console.log("[Electron Main] Skipping Prisma migrations as schema and database URL have not changed.");
      return true;
    }
  } catch (err) {
    console.error("[Electron Main] Error reading migration state:", err);
  }
  return false;
}

// Helper to save migration state on successful migration run
function saveMigrationState() {
  try {
    const logDir = app.getPath("userData");
    const statePath = path.join(logDir, "migration-state.json");
    const currentVersion = app.getVersion();
    const currentDbUrl = process.env.DATABASE_URL || "";
    const dbUrlHash = crypto.createHash("sha256").update(currentDbUrl).digest("hex");
    const migrationHash = getMigrationsHash();

    fs.writeFileSync(statePath, JSON.stringify({
      lastVersion: currentVersion,
      lastDbUrlHash: dbUrlHash,
      lastMigrationHash: migrationHash
    }, null, 2), "utf-8");
    console.log("[Electron Main] Migration state saved successfully.");
  } catch (err) {
    console.error("[Electron Main] Error writing migration state:", err);
  }
}

// Run Prisma Migrations before launching the server
function runPrismaMigrations() {
  return new Promise((resolve) => {
    if (shouldSkipMigrations()) {
      resolve(true);
      return;
    }

    let serverDir;
    if (app.isPackaged) {
      serverDir = path.join(process.resourcesPath, "../server");
    } else {
      serverDir = path.join(__dirname, "../server");
    }

    const prismaCliPath = path.join(serverDir, "node_modules/prisma/build/index.js");
    
    if (!fs.existsSync(prismaCliPath)) {
      console.warn(`[Electron Main] Prisma CLI not found at ${prismaCliPath}. Skipping migrations.`);
      resolve(true); // Proceed anyway
      return;
    }

    const nodeExec = app.isPackaged ? process.execPath : "node";
    const pathSeparator = process.platform === "win32" ? ";" : ":";
    const nodeModulesPath = path.join(serverDir, "node_modules");

    const spawnEnv = {
      ...process.env,
      PORT: String(SERVER_PORT),
      NODE_PATH: `${nodeModulesPath}${process.env.NODE_PATH ? `${pathSeparator}${process.env.NODE_PATH}` : ""}`,
      ...(app.isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
    };

    const runDeploy = () => {
      console.log("[Electron Main] Running Prisma migrate deploy...");
      const migrationProcess = spawn(nodeExec, [prismaCliPath, "migrate", "deploy"], {
        cwd: serverDir,
        env: spawnEnv,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdoutData = "";
      let stderrData = "";

      migrationProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      migrationProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      migrationProcess.on("close", (code) => {
        console.log(`[Electron Main] Prisma migration exited with code ${code}`);
        if (code === 0) {
          saveMigrationState();
          resolve(true);
        } else {
          console.error(`[Electron Main] Migration stdout:\n${stdoutData}`);
          console.error(`[Electron Main] Migration stderr:\n${stderrData}`);

          // Check if error is P3005 (database not empty)
          const hasP3005 = stdoutData.includes("P3005") || stderrData.includes("P3005");
          if (hasP3005) {
            console.log("[Electron Main] Database is not empty (P3005). Attempting to baseline by marking init migration as applied...");
            runBaseline();
          } else {
            console.warn("[Electron Main] Prisma migration failed, but proceeding to launch anyway.");
            resolve(true);
          }
        }
      });

      migrationProcess.on("error", (err) => {
        console.error("[Electron Main] Failed to spawn Prisma migration:", err);
        resolve(true);
      });
    };

    const runBaseline = () => {
      const baselineProcess = spawn(nodeExec, [prismaCliPath, "migrate", "resolve", "--applied", "20260114095420_init"], {
        cwd: serverDir,
        env: spawnEnv,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdoutData = "";
      let stderrData = "";

      baselineProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      baselineProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      baselineProcess.on("close", (code) => {
        console.log(`[Electron Main] Prisma baseline resolve exited with code ${code}`);
        if (code === 0) {
          console.log("[Electron Main] Initial migration resolved successfully. Retrying deploy...");
          runDeploy(); // Retry deploy after marking baseline migration as applied
        } else {
          console.error(`[Electron Main] Baseline resolve stdout:\n${stdoutData}`);
          console.error(`[Electron Main] Baseline resolve stderr:\n${stderrData}`);
          console.warn("[Electron Main] Prisma baseline resolve failed, but proceeding to launch anyway.");
          resolve(true);
        }
      });

      baselineProcess.on("error", (err) => {
        console.error("[Electron Main] Failed to spawn Prisma baseline resolve:", err);
        resolve(true);
      });
    };

    runDeploy();
  });
}

// Check if Express backend server is alive
function checkServerHealth(port = SERVER_PORT) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// Start Node.js Express server child process
async function startExpressServer() {
  const isRunning = await checkServerHealth();
  if (isRunning) {
    console.log(`[Electron Main] Express backend is already running on port ${SERVER_PORT}`);
    return;
  }

  // In dev: server is at ../server relative to electron/main.js
  // When packaged with extraFiles: server is at <appRoot>/server (alongside resources/)
  let serverDir;
  if (app.isPackaged) {
    // process.resourcesPath = <appRoot>/resources — go up one level to reach <appRoot>/server
    serverDir = path.join(process.resourcesPath, "../server");
  } else {
    serverDir = path.join(__dirname, "../server");
  }
  const serverScript = path.join(serverDir, "Server.js");

  console.log(`[Electron Main] Spawning Express backend server: ${serverScript}`);

  const nodeModulesPath = path.join(serverDir, "node_modules");

  // Fix path separator for Windows (semicolon) vs POSIX (colon)
  const pathSeparator = process.platform === "win32" ? ";" : ":";

  // When packaged as AppImage, process.execPath = Electron binary.
  // Setting ELECTRON_RUN_AS_NODE=1 makes it behave like Node.js.
  // In dev, just use the system "node" binary.
  const nodeExec = app.isPackaged ? process.execPath : "node";
  const spawnEnv = {
    ...process.env,
    PORT: String(SERVER_PORT),
    NODE_PATH: `${nodeModulesPath}${process.env.NODE_PATH ? `${pathSeparator}${process.env.NODE_PATH}` : ""}`,
    ...(app.isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
  };

  // Set up log files in userData directory for production debugging
  const logDir = app.getPath("userData");
  const outLogPath = path.join(logDir, "backend_out.log");
  const errLogPath = path.join(logDir, "backend_err.log");

  console.log(`[Electron Main] Logging backend stdout to: ${outLogPath}`);
  console.log(`[Electron Main] Logging backend stderr to: ${errLogPath}`);

  // Create write streams for logging asynchronously (non-blocking)
  try {
    outLogStream = fs.createWriteStream(outLogPath, { flags: "a" });
    errLogStream = fs.createWriteStream(errLogPath, { flags: "a" });
    outLogStream.on("error", (err) => console.error("[Log Stream Error] outLogStream:", err));
    errLogStream.on("error", (err) => console.error("[Log Stream Error] errLogStream:", err));
  } catch (e) {
    console.error("[Electron Main] Failed to create log write streams", e);
  }

  serverProcess = spawn(nodeExec, [serverScript], {
    cwd: serverDir,
    env: spawnEnv,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  serverProcess.stdout.on("data", (data) => {
    const text = data.toString().trim();
    console.log(`[Express Backend]: ${text}`);
    if (outLogStream) {
      outLogStream.write(`[${new Date().toISOString()}] ${text}\n`);
    }
  });

  serverProcess.stderr.on("data", (data) => {
    const text = data.toString().trim();
    console.error(`[Express Backend Error]: ${text}`);
    if (errLogStream) {
      errLogStream.write(`[${new Date().toISOString()}] ${text}\n`);
    }
  });

  serverProcess.on("close", (code) => {
    console.log(`[Electron Main] Express server process exited with code ${code}`);
    serverProcess = null;
  });
}

// Stop Express server process safely
function stopExpressServer() {
  console.log("[Electron Main] Sending shutdown command to Express backend...");
  try {
    const req = http.request({
      hostname: "localhost",
      port: SERVER_PORT,
      path: "/api/shutdown",
      method: "POST",
      timeout: 1000
    }, (res) => {
      console.log(`[Electron Main] Backend shutdown response status: ${res.statusCode}`);
    });
    req.on("error", (e) => {
      console.warn(`[Electron Main] Backend shutdown request failed (expected if not running): ${e.message}`);
    });
    req.end();
  } catch (err) {
    console.error("[Electron Main] Failed to send shutdown request:", err);
  }

  if (serverProcess && serverProcess.pid) {
    console.log("[Electron Main] Terminating Express backend server process...");
    try {
      if (process.platform === "win32") {
        const { execSync } = require("child_process");
        execSync(`taskkill /pid ${serverProcess.pid} /f /t`);
      } else {
        serverProcess.kill("SIGKILL");
      }
    } catch (e) {
      try { serverProcess.kill(); } catch (_) {}
    }
    serverProcess = null;
  }
  if (outLogStream) {
    outLogStream.end();
    outLogStream = null;
  }
  if (errLogStream) {
    errLogStream.end();
    errLogStream = null;
  }
}

// Poll until server is ready (up to 32 seconds, checking every 80ms)
function waitForServer(port = SERVER_PORT, retries = 400, intervalMs = 80) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      checkServerHealth(port).then((isUp) => {
        if (isUp) {
          console.log(`[Electron Main] Server is ready on port ${port}`);
          resolve(true);
        } else if (++attempts < retries) {
          setTimeout(check, intervalMs);
        } else {
          console.error(`[Electron Main] Server did not start after ${retries} attempts`);
          resolve(false);
        }
      });
    };
    check();
  });
}

// Create Splash Screen Window
function createSplashWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, "../client/dist/app-logo.png")
    : path.join(__dirname, "../client/public/app-logo.png");

  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    resizable: false,
    transparent: !isWine,
    alwaysOnTop: true,
    icon: iconPath,
    backgroundColor: "#0f0f1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  const splashPath = path.join(__dirname, "splash.html");
  splashWindow.loadFile(splashPath).catch((err) => {
    console.error("[Electron Main] Failed to load splash screen:", err);
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

// Create Main Application Window
async function createMainWindow() {
  // Use direct icon path based on packaging state to avoid synchronous fs.existsSync call
  const iconPath = app.isPackaged
    ? path.join(__dirname, "../client/dist/app-logo.png")
    : path.join(__dirname, "../client/public/app-logo.png");

  const isWindows = process.platform === "win32" && !isWine;
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "AGR Jewellery Management System",
    icon: iconPath,
    frame: isWindows ? true : false,
    titleBarStyle: "hidden",
    titleBarOverlay: isWindows
      ? {
          color: "#1a2435", // Matches the custom title bar gradient start/color
          symbolColor: "#ffffff",
          height: 38,
        }
      : isMac
      ? true
      : false,
    autoHideMenuBar: true,
    show: false, // Initially hidden to prevent white flashes
    backgroundColor: "#0d1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: false,
    }
  });

  // Trigger or re-initialize startup tasks concurrently
  startInitialization();

  // Determine environment and load page
  const isDev = !app.isPackaged && (process.env.NODE_ENV === "development" || process.argv.includes("--dev"));
  if (isDev) {
    console.log(`[Electron Main] Loading development URL: ${CLIENT_DEV_URL}`);
    mainWindow.loadURL(CLIENT_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const distIndexPath = path.join(__dirname, "../client/dist/index.html");
    console.log(`[Electron Main] Loading production file: ${distIndexPath}`);
    mainWindow.loadFile(distIndexPath).catch((err) => {
      console.error("[Electron Main] Failed to load production file:", err);
    });
  }

  // Wait for BOTH the HTML renderer and backend Express server to be ready before showing main window
  const rendererLoaded = new Promise((resolve) => {
    mainWindow.webContents.once("did-finish-load", () => resolve(true));
    mainWindow.webContents.once("did-fail-load", () => resolve(false));
  });

  Promise.all([rendererLoaded, serverPromise || Promise.resolve(true)])
    .then(([rendererSuccess, serverSuccess]) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;

      if (rendererSuccess && serverSuccess) {
        // Transition from splash screen to main window only when backend is ready
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
        mainWindow.show();

        // Delay non-critical tasks like auto updater until 3 seconds after transition
        setTimeout(() => {
          setupAutoUpdater();
        }, 3000);
      } else {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
        if (!serverSuccess) {
          dialog.showErrorBox("Backend Server Failure", "Failed to connect to backend server. Please restart the application.");
        } else {
          dialog.showErrorBox("Startup Error", "Failed to load frontend resources. Please restart the application.");
        }
        app.quit();
      }
    })
    .catch((err) => {
      console.error("[Electron Main] Error during startup sequence:", err);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      dialog.showErrorBox("Startup Failure", `An unexpected error occurred: ${err.message || err}`);
      app.quit();
    });

  // Handle external links opening in user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    migrationPromise = null;
    serverPromise = null;
  });
}

// Register IPC handlers
function registerIpcHandlers() {
  ipcMain.on("check-wine", (event) => {
    event.returnValue = isWine;
  });

  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window-maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("window-close", () => {
    if (splashWindow && !splashWindow.isDestroyed() && (!mainWindow || !mainWindow.isVisible())) {
      console.log("[Electron Main] Splash screen close requested before main window is visible. Quitting app...");
      splashWindow.close();
      app.quit();
    } else if (mainWindow) {
      mainWindow.close();
    } else if (splashWindow) {
      splashWindow.close();
    }
  });

  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });

  ipcMain.handle("is-maximized", () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle("check-server-health", async () => {
    return await checkServerHealth();
  });

  ipcMain.handle("get-server-status", () => serverStatus);
  ipcMain.handle("get-migration-status", () => migrationStatus);

  // Helper function to cleanly shut down server and lock before running quitAndInstall
  function performUpdateInstall() {
    if (isInstallingUpdate) return;
    isInstallingUpdate = true;
    console.log("[AutoUpdater] Releasing lock & shutting down backend for clean update install...");

    stopExpressServer();

    try {
      app.releaseSingleInstanceLock();
    } catch (e) {
      console.error("[AutoUpdater] Error releasing single instance lock:", e);
    }

    setImmediate(() => {
      try {
        autoUpdater.quitAndInstall(true, true);
      } catch (err) {
        console.error("[AutoUpdater] Error calling quitAndInstall:", err);
        app.quit();
      }
    });
  }

  // Triggered when user clicks "Install" / "Restart Now" in the React UI
  ipcMain.on("install-update", () => {
    console.log("[AutoUpdater] User requested restart to apply update.");
    if (updateReadyToInstall) {
      performUpdateInstall();
    } else {
      // Deferred but not yet downloaded — start download now
      autoUpdater.downloadUpdate();
    }
  });

  // OS-level interactions (file picking, directory selection, system error alerts)
  ipcMain.handle("dialog-show-open-dialog", async (event, options) => {
    const parentWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    return await dialog.showOpenDialog(parentWin, options);
  });

  ipcMain.handle("dialog-show-save-dialog", async (event, options) => {
    const parentWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    return await dialog.showSaveDialog(parentWin, options);
  });

  ipcMain.handle("dialog-show-message-box", async (event, options) => {
    const parentWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    return await dialog.showMessageBox(parentWin, options);
  });

  // Synchronous IPC dialog channels to override window.alert and window.confirm
  ipcMain.on("window-alert", (event, message) => {
    const parentWin = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    dialog.showMessageBoxSync(parentWin, {
      type: "warning",
      buttons: ["OK"],
      title: "Alert",
      message: String(message),
      noLink: true,
    });
    event.returnValue = null;
  });

  ipcMain.on("window-confirm", (event, message) => {
    const parentWin = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    const result = dialog.showMessageBoxSync(parentWin, {
      type: "question",
      buttons: ["Cancel", "OK"],
      defaultId: 1,
      cancelId: 0,
      title: "Confirm",
      message: String(message),
      noLink: true,
    });
    event.returnValue = (result === 1);
  });

  // Spawn modal child windows
  ipcMain.handle("create-modal-window", async (event, url, options = {}) => {
    if (!mainWindow) return null;

    const modalWindow = new BrowserWindow({
      parent: mainWindow,
      modal: true,
      width: options.width || 800,
      height: options.height || 600,
      frame: false,
      titleBarStyle: "hidden",
      backgroundColor: "#f9f9f9",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
      },
      ...options,
    });

    if (url.startsWith("http:") || url.startsWith("https:")) {
      await modalWindow.loadURL(url);
    } else {
      await modalWindow.loadFile(url);
    }

    return modalWindow.id;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO UPDATER
// Only active in production (packaged) builds — never fires in dev mode.
// Strategy:
//   PATCH (1.0.0→1.0.1): silent download, OS notification when ready
//   MINOR/MAJOR (1.x or 2.x): dialog → Update Now or Later
//   Later: sends IPC to renderer so UpdateBadge appears in the UI
// ─────────────────────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;        // Download silently in background
  autoUpdater.autoInstallOnAppQuit = true; // Install silently when app quits

  // Check immediately on startup
  autoUpdater.checkForUpdates().catch((err) => {
    console.error("[AutoUpdater] Initial check failed:", err?.message);
  });

  // Automatically re-check for updates every 5 minutes while app remains open
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[AutoUpdater] Periodic update check failed:", err?.message);
    });
  }, 5 * 60 * 1000);

  autoUpdater.on("update-available", (info) => {
    console.log(`[AutoUpdater] Update v${info.version} available — downloading in background.`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-progress", 0);
    }
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent || 0);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-progress", percent);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateReadyToInstall = true;
    console.log(`[AutoUpdater] v${info.version} downloaded — ready to install`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-ready", info.version);
    }
    if (Notification.isSupported()) {
      new Notification({
        title: "AGR Jewellery — Update Ready",
        body: `Version v${info.version} downloaded. Click Restart in the app header or close to apply.`,
      }).show();
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error:", err?.message);
  });
}

// App Lifecycle Events
app.whenReady().then(() => {
  initializeEnvironment(); // Initialize env before spawning processes
  registerIpcHandlers();

  // Start migrations and Express server in parallel in the background immediately
  startInitialization();

  createSplashWindow();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      createMainWindow();
    }
  });
});

app.on("before-quit", (event) => {
  console.log("[Electron Main] App before-quit triggered.");
  if (updateReadyToInstall && !isInstallingUpdate) {
    performUpdateInstall();
  } else {
    stopExpressServer();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  stopExpressServer();
});

process.on("exit", () => {
  stopExpressServer();
});
