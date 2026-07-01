import { app, BrowserWindow, ipcMain, WebContentsView, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
const views = new Map();
const history = new Map(); // tabId -> [urls]
const bookmarks = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#202124',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('resize', () => {
    views.forEach(view => {
      if (!view.webContents.isDestroyed()) {
        const bounds = mainWindow.getContentBounds();
        view.setBounds({
          x: 250,
          y: 90,
          width: bounds.width - 250,
          height: bounds.height - 90
        });
      }
    });
  });

  mainWindow.on('closed', () => {
    views.forEach(view => {
      if (!view.webContents.isDestroyed()) {
        view.webContents.close();
      }
    });
    views.clear();
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('browser:create-tab', async (event, { tabId, url }) => {
  try {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        partition: 'persist:browser'
      }
    });

    views.set(tabId, view);
    history.set(tabId, []);
    mainWindow.contentView.addChildView(view);

    const bounds = mainWindow.getContentBounds();
    view.setBounds({
      x: 250,
      y: 90,
      width: bounds.width - 250,
      height: bounds.height - 90
    });

    // Wire events
    view.webContents.on('page-title-updated', (e, title) => {
      mainWindow.webContents.send('browser:title-updated', { tabId, title });
    });

    view.webContents.on('page-favicon-updated', (e, favicons) => {
      mainWindow.webContents.send('browser:favicon-updated', { tabId, favicon: favicons[0] });
    });

    view.webContents.on('did-navigate', (e, url) => {
      const tabHistory = history.get(tabId) || [];
      tabHistory.push(url);
      history.set(tabId, tabHistory.slice(-50));
      
      mainWindow.webContents.send('browser:navigated', {
        tabId,
        url,
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      });
    });

    view.webContents.on('did-navigate-in-page', (e, url) => {
      mainWindow.webContents.send('browser:navigated', {
        tabId,
        url,
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      });
    });

    view.webContents.on('did-start-loading', () => {
      mainWindow.webContents.send('browser:loading', { tabId, loading: true });
    });

    view.webContents.on('did-stop-loading', () => {
      mainWindow.webContents.send('browser:loading', { tabId, loading: false });
    });

    // Popup handler
    view.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    await view.webContents.loadURL(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to create tab:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('browser:close-tab', async (event, { tabId }) => {
  const view = views.get(tabId);
  if (!view) return { success: false };

  try {
    mainWindow.contentView.removeChildView(view);
    if (!view.webContents.isDestroyed()) {
      view.webContents.close();
    }
    views.delete(tabId);
    history.delete(tabId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('browser:show-tab', async (event, { tabId }) => {
  const view = views.get(tabId);
  if (!view) return { success: false };
  views.forEach(v => v.setVisible(false));
  view.setVisible(true);
  return { success: true };
});

ipcMain.handle('browser:navigate', async (event, { tabId, url }) => {
  const view = views.get(tabId);
  if (!view) return { success: false };
  try {
    await view.webContents.loadURL(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('browser:go-back', async (event, { tabId }) => {
  const view = views.get(tabId);
  if (view && view.webContents.canGoBack()) {
    view.webContents.goBack();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('browser:go-forward', async (event, { tabId }) => {
  const view = views.get(tabId);
  if (view && view.webContents.canGoForward()) {
    view.webContents.goForward();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('browser:reload', async (event, { tabId }) => {
  const view = views.get(tabId);
  if (view) {
    view.webContents.reload();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('browser:get-suggestions', async (event, { query }) => {
  const suggestions = [];
  const lowerQuery = query.toLowerCase();
  
  // Add history-based suggestions
  history.forEach((urls, tabId) => {
    urls.forEach(url => {
      if (url.toLowerCase().includes(lowerQuery) && !suggestions.find(s => s.url === url)) {
        suggestions.push({ type: 'history', url, title: url });
      }
    });
  });
  
  return suggestions.slice(0, 8);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
