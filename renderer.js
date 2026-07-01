// Tab state management
const tabs = new Map();
let activeTabId = null;
let tabCounter = 0;

// DOM elements
const tabsContainer = document.getElementById('tabsContainer');
const sidebarTabs = document.getElementById('sidebarTabs');
const urlInput = document.getElementById('urlInput');
const suggestionsDropdown = document.getElementById('suggestionsDropdown');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const newTabTop = document.getElementById('newTabTop');
const newTabSidebar = document.getElementById('newTabSidebar');

// Dynamic tab sizing
function updateTabSizes() {
  const tabElements = tabsContainer.querySelectorAll('.browser-tab');
  const tabCount = tabElements.length;
  
  if (tabCount === 0) return;
  
  // Chrome behavior: calculate available width for tabs
  // Account for traffic lights, new tab button, and margins
  const tabBarWidth = document.querySelector('.tabs-wrapper').offsetWidth;
  const newTabBtnWidth = 40; // Width of + button
  const availableWidth = tabBarWidth - newTabBtnWidth - 10; // Small margin
  
  // Calculate tab width (max 240px, min 48px)
  let tabWidth = Math.floor(availableWidth / tabCount);
  tabWidth = Math.max(48, Math.min(240, tabWidth));
  
  // Check if tabs need to shrink or if + button can follow
  const totalTabWidth = tabWidth * tabCount;
  
  if (totalTabWidth < availableWidth) {
    // Tabs fit comfortably, + button follows
    tabsContainer.style.flex = '0 0 auto';
  } else {
    // Tabs fill space, + button stays at edge
    tabsContainer.style.flex = '1 1 auto';
  }
  
  tabElements.forEach(tab => {
    tab.style.width = `${tabWidth}px`;
    tab.style.maxWidth = `${tabWidth}px`;
  });
}

// Initialize with first tab
window.addEventListener('DOMContentLoaded', () => {
  createNewTab('https://www.google.com');
  window.addEventListener('resize', updateTabSizes);
  
  // Traffic light button handlers
  document.querySelector('.traffic-light.close')?.addEventListener('click', () => {
    window.close();
  });
  
  document.querySelector('.traffic-light.minimize')?.addEventListener('click', () => {
    // Minimize functionality would need electron IPC
    console.log('Minimize clicked');
  });
  
  document.querySelector('.traffic-light.maximize')?.addEventListener('click', () => {
    // Maximize functionality would need electron IPC
    console.log('Maximize clicked');
  });
});

// Create new tab
async function createNewTab(url = 'https://www.google.com') {
  const tabId = `tab-${++tabCounter}`;
  
  const tabData = {
    id: tabId,
    url,
    title: 'New Tab',
    favicon: null,
    loading: false,
    canGoBack: false,
    canGoForward: false
  };
  
  tabs.set(tabId, tabData);
  
  // Create UI elements
  createTabUI(tabData);
  createSidebarTabUI(tabData);
  
  // Create browser view
  const result = await window.browserAPI.createTab(tabId, url);
  
  if (result.success) {
    switchToTab(tabId);
  } else {
    console.error('Failed to create tab:', result.error);
    tabs.delete(tabId);
  }
}

// Create tab UI in top bar
function createTabUI(tabData) {
  const tab = document.createElement('div');
  tab.className = 'browser-tab';
  tab.dataset.tabId = tabData.id;
  
  const icon = document.createElement('img');
  icon.className = 'tab-icon';
  icon.src = tabData.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239aa0a6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>';
  icon.onerror = () => {
    icon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239aa0a6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>';
  };
  
  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = tabData.title;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.innerHTML = '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabData.id);
  };
  
  tab.appendChild(icon);
  tab.appendChild(title);
  tab.appendChild(closeBtn);
  
  tab.onclick = () => switchToTab(tabData.id);
  
  tabsContainer.appendChild(tab);
  
  // Update tab sizes
  updateTabSizes();
}

// Create sidebar tab UI
function createSidebarTabUI(tabData) {
  const tab = document.createElement('button');
  tab.className = 'sidebar-tab';
  tab.dataset.tabId = tabData.id;
  
  const icon = document.createElement('img');
  icon.className = 'sidebar-tab-icon';
  icon.src = tabData.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239aa0a6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>';
  icon.onerror = () => {
    icon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239aa0a6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>';
  };
  
  const titleSpan = document.createElement('span');
  titleSpan.className = 'sidebar-tab-title';
  titleSpan.textContent = tabData.title;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'sidebar-tab-close';
  closeBtn.innerHTML = '<svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabData.id);
  };
  
  tab.appendChild(icon);
  tab.appendChild(titleSpan);
  tab.appendChild(closeBtn);
  
  tab.onclick = () => switchToTab(tabData.id);
  
  sidebarTabs.appendChild(tab);
}

// Switch to tab
async function switchToTab(tabId) {
  if (activeTabId === tabId) return;
  
  activeTabId = tabId;
  const tabData = tabs.get(tabId);
  
  if (!tabData) return;
  
  // Update UI
  document.querySelectorAll('.browser-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tabId === tabId);
  });
  
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tabId === tabId);
  });
  
  // Update URL bar
  urlInput.value = tabData.url;
  
  // Update nav buttons
  updateNavButtons(tabData);
  
  // Show the tab
  await window.browserAPI.showTab(tabId);
}

// Close tab
async function closeTab(tabId) {
  const tabData = tabs.get(tabId);
  if (!tabData) return;
  
  // Remove UI elements
  const topTab = tabsContainer.querySelector(`[data-tab-id="${tabId}"]`);
  const sidebarTab = sidebarTabs.querySelector(`[data-tab-id="${tabId}"]`);
  
  if (topTab) topTab.remove();
  if (sidebarTab) sidebarTab.remove();
  
  // Update tab sizes after removal
  updateTabSizes();
  
  // Close the browser view
  await window.browserAPI.closeTab(tabId);
  
  // Remove from state
  tabs.delete(tabId);
  
  // Switch to another tab if this was active
  if (activeTabId === tabId) {
    const remainingTabs = Array.from(tabs.keys());
    if (remainingTabs.length > 0) {
      switchToTab(remainingTabs[0]);
    } else {
      // Create a new tab if all were closed
      createNewTab();
    }
  }
}

// Update navigation buttons
function updateNavButtons(tabData) {
  backBtn.disabled = !tabData.canGoBack;
  forwardBtn.disabled = !tabData.canGoForward;
}

// Handle URL input
urlInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const input = urlInput.value.trim();
    if (!input) return;
    
    let url;
    
    // Check if input looks like a URL
    if (input.includes('.') && !input.includes(' ')) {
      // Add protocol if missing
      url = input.startsWith('http://') || input.startsWith('https://') 
        ? input 
        : `https://${input}`;
    } else {
      // Search query
      url = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }
    
    if (activeTabId) {
      await window.browserAPI.navigate(activeTabId, url);
      tabs.get(activeTabId).url = url;
    }
    
    suggestionsDropdown.classList.remove('show');
    urlInput.blur();
  }
});

// URL input suggestions
let suggestionTimeout;
urlInput.addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  
  clearTimeout(suggestionTimeout);
  
  if (!query) {
    suggestionsDropdown.classList.remove('show');
    return;
  }
  
  suggestionTimeout = setTimeout(async () => {
    const suggestions = await window.browserAPI.getSuggestions(query);
    
    if (suggestions.length > 0) {
      renderSuggestions(suggestions, query);
      suggestionsDropdown.classList.add('show');
    } else {
      suggestionsDropdown.classList.remove('show');
    }
  }, 150);
});

// Render suggestions
function renderSuggestions(suggestions, query) {
  suggestionsDropdown.innerHTML = '';
  
  suggestions.forEach(suggestion => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    
    const icon = document.createElement('svg');
    icon.className = 'suggestion-icon';
    icon.setAttribute('width', '16');
    icon.setAttribute('height', '16');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    
    if (suggestion.type === 'history') {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
    } else {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>';
    }
    
    const text = document.createElement('span');
    text.className = 'suggestion-text';
    text.textContent = suggestion.url || suggestion.title;
    
    const type = document.createElement('span');
    type.className = 'suggestion-type';
    type.textContent = suggestion.type;
    
    item.appendChild(icon);
    item.appendChild(text);
    item.appendChild(type);
    
    item.onclick = async () => {
      urlInput.value = suggestion.url;
      if (activeTabId) {
        await window.browserAPI.navigate(activeTabId, suggestion.url);
        tabs.get(activeTabId).url = suggestion.url;
      }
      suggestionsDropdown.classList.remove('show');
    };
    
    suggestionsDropdown.appendChild(item);
  });
}

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.url-bar-container')) {
    suggestionsDropdown.classList.remove('show');
  }
});

// Navigation buttons
backBtn.addEventListener('click', async () => {
  if (activeTabId) {
    await window.browserAPI.goBack(activeTabId);
  }
});

forwardBtn.addEventListener('click', async () => {
  if (activeTabId) {
    await window.browserAPI.goForward(activeTabId);
  }
});

reloadBtn.addEventListener('click', async () => {
  if (activeTabId) {
    await window.browserAPI.reload(activeTabId);
  }
});

// New tab buttons
newTabTop.addEventListener('click', () => createNewTab());
newTabSidebar.addEventListener('click', () => createNewTab());

// IPC event listeners
window.browserAPI.onTitleUpdated(({ tabId, title }) => {
  const tabData = tabs.get(tabId);
  if (!tabData) return;
  
  tabData.title = title;
  
  const topTab = tabsContainer.querySelector(`[data-tab-id="${tabId}"] .tab-title`);
  const sidebarTab = sidebarTabs.querySelector(`[data-tab-id="${tabId}"] .sidebar-tab-title`);
  
  if (topTab) topTab.textContent = title;
  if (sidebarTab) sidebarTab.textContent = title;
});

window.browserAPI.onFaviconUpdated(({ tabId, favicon }) => {
  const tabData = tabs.get(tabId);
  if (!tabData) return;
  
  tabData.favicon = favicon;
  
  const topIcon = tabsContainer.querySelector(`[data-tab-id="${tabId}"] .tab-icon`);
  const sidebarIcon = sidebarTabs.querySelector(`[data-tab-id="${tabId}"] .sidebar-tab-icon`);
  
  if (topIcon) topIcon.src = favicon;
  if (sidebarIcon) sidebarIcon.src = favicon;
});

window.browserAPI.onNavigated(({ tabId, url, canGoBack, canGoForward }) => {
  const tabData = tabs.get(tabId);
  if (!tabData) return;
  
  tabData.url = url;
  tabData.canGoBack = canGoBack;
  tabData.canGoForward = canGoForward;
  
  if (tabId === activeTabId) {
    urlInput.value = url;
    updateNavButtons(tabData);
  }
});

window.browserAPI.onLoading(({ tabId, loading }) => {
  const tabData = tabs.get(tabId);
  if (!tabData) return;
  
  tabData.loading = loading;
  
  const topTab = tabsContainer.querySelector(`[data-tab-id="${tabId}"]`);
  if (!topTab) return;
  
  if (loading) {
    const currentIcon = topTab.querySelector('.tab-icon, .tab-loading');
    if (currentIcon && !currentIcon.classList.contains('tab-loading')) {
      const spinner = document.createElement('div');
      spinner.className = 'tab-loading';
      currentIcon.replaceWith(spinner);
    }
  } else {
    const currentElement = topTab.querySelector('.tab-loading, .tab-icon');
    if (currentElement) {
      const icon = document.createElement('img');
      icon.className = 'tab-icon';
      icon.src = tabData.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239aa0a6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>';
      icon.onerror = () => {
        icon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239aa0a6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>';
      };
      currentElement.replaceWith(icon);
    }
  }
});
