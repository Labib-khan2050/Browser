const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  createTab: (tabId, url) => ipcRenderer.invoke('browser:create-tab', { tabId, url }),
  closeTab: (tabId) => ipcRenderer.invoke('browser:close-tab', { tabId }),
  showTab: (tabId) => ipcRenderer.invoke('browser:show-tab', { tabId }),
  navigate: (tabId, url) => ipcRenderer.invoke('browser:navigate', { tabId, url }),
  goBack: (tabId) => ipcRenderer.invoke('browser:go-back', { tabId }),
  goForward: (tabId) => ipcRenderer.invoke('browser:go-forward', { tabId }),
  reload: (tabId) => ipcRenderer.invoke('browser:reload', { tabId }),
  getSuggestions: (query) => ipcRenderer.invoke('browser:get-suggestions', { query }),
  
  onTitleUpdated: (callback) => {
    ipcRenderer.on('browser:title-updated', (_, data) => callback(data));
  },
  onFaviconUpdated: (callback) => {
    ipcRenderer.on('browser:favicon-updated', (_, data) => callback(data));
  },
  onNavigated: (callback) => {
    ipcRenderer.on('browser:navigated', (_, data) => callback(data));
  },
  onLoading: (callback) => {
    ipcRenderer.on('browser:loading', (_, data) => callback(data));
  }
});
