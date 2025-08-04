// Profile functionality
document.addEventListener('DOMContentLoaded', function() {
  initializeProfile();
});

function initializeProfile() {
  loadUserData();
  setupEventListeners();
  loadSavedSettings();
  updateProfileStats();
}

function setupEventListeners() {
  // Preferences form
  const preferencesForm = document.getElementById('preferences-form');
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', handleSavePreferences);
  }
  
  // File upload
  const importFile = document.getElementById('import-file');
  if (importFile) {
    importFile.addEventListener('change', handleFileSelect);
  }
  
  // Confirmation modal
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) {
    const closeBtn = confirmModal.querySelector('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeConfirmModal);
    }
    
    confirmModal.addEventListener('click', function(e) {
      if (e.target === confirmModal) {
        closeConfirmModal();
      }
    });
  }
}

function loadUserData() {
  // Load user info from localStorage
  const savedUser = localStorage.getItem('wastenot_user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-email').textContent = user.email;
  }
  
  // Load items for stats
  const savedItems = localStorage.getItem('wastenot_items');
  if (savedItems) {
    window.appState.items = JSON.parse(savedItems);
  }
}

function loadSavedSettings() {
  // Load saved preferences
  const savedPreferences = localStorage.getItem('wastenot_preferences');
  if (savedPreferences) {
    const preferences = JSON.parse(savedPreferences);
    
    // Apply saved preferences to form
    Object.keys(preferences).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = preferences[key];
        } else {
          element.value = preferences[key];
        }
      }
    });
  }
  
  // Load saved API key
  const savedApiKey = localStorage.getItem('spoonacular_api_key');
  if (savedApiKey) {
    const apiKeyInput = document.getElementById('spoonacular-api-key');
    if (apiKeyInput) {
      apiKeyInput.value = savedApiKey;
    }
  }
  
  // Load Firebase config
  const savedFirebaseConfig = localStorage.getItem('firebase_config');
  if (savedFirebaseConfig) {
    const firebaseConfigInput = document.getElementById('firebase-config');
    if (firebaseConfigInput) {
      firebaseConfigInput.value = savedFirebaseConfig;
    }
  }
}

function updateProfileStats() {
  const items = window.appState.items || [];
  const now = new Date();
  
  // Calculate stats
  const totalItems = items.length;
  const daysActive = calculateDaysActive();
  const wasteReduced = calculateWasteReduced();
  
  // Update display
  document.getElementById('total-items-count').textContent = totalItems;
  document.getElementById('days-active').textContent = daysActive;
  document.getElementById('waste-reduced').textContent = `${wasteReduced.toFixed(1)}%`;
}

function calculateDaysActive() {
  const items = window.appState.items || [];
  if (items.length === 0) return 0;
  
  const firstItemDate = new Date(Math.min(...items.map(item => new Date(item.addedDate))));
  const now = new Date();
  const daysDiff = (now - firstItemDate) / (1000 * 60 * 60 * 24);
  
  return Math.max(1, Math.floor(daysDiff));
}

function calculateWasteReduced() {
  const items = window.appState.items || [];
  if (items.length === 0) return 0;
  
  const now = new Date();
  const expiredItems = items.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate < now;
  }).length;
  
  const totalItems = items.length;
  const wasteRate = totalItems > 0 ? (expiredItems / totalItems * 100) : 0;
  
  // Assume baseline waste rate of 30% and calculate improvement
  const baselineWasteRate = 30;
  const improvement = Math.max(0, baselineWasteRate - wasteRate);
  
  return improvement;
}

function handleSavePreferences(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const preferences = {
    'notification-email': formData.get('notification-email') === 'on',
    'notification-push': formData.get('notification-push') === 'on',
    'reminder-days': formData.get('reminder-days'),
    'default-category': formData.get('default-category'),
    'currency': formData.get('currency')
  };
  
  // Save to localStorage
  localStorage.setItem('wastenot_preferences', JSON.stringify(preferences));
  
  // Save API key if provided
  const apiKey = document.getElementById('spoonacular-api-key').value;
  if (apiKey) {
    localStorage.setItem('spoonacular_api_key', apiKey);
  }
  
  // Save Firebase config if provided
  const firebaseConfig = document.getElementById('firebase-config').value;
  if (firebaseConfig) {
    localStorage.setItem('firebase_config', firebaseConfig);
  }
  
  showNotification('Preferences saved successfully!', 'success');
}

async function testSpoonacularAPI() {
  const apiKey = document.getElementById('spoonacular-api-key').value;
  
  if (!apiKey) {
    showNotification('Please enter your Spoonacular API key first', 'error');
    return;
  }
  
  try {
    const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&query=pasta&number=1`);
    
    if (response.ok) {
      showNotification('Spoonacular API connection successful!', 'success');
      localStorage.setItem('spoonacular_api_key', apiKey);
    } else {
      showNotification('API connection failed. Please check your key.', 'error');
    }
  } catch (error) {
    showNotification('Error testing API connection', 'error');
  }
}

function exportUserData(format) {
  const data = {
    items: JSON.parse(localStorage.getItem('wastenot_items') || '[]'),
    recipes: JSON.parse(localStorage.getItem('wastenot_recipes') || '[]'),
    analytics: JSON.parse(localStorage.getItem('wastenot_analytics') || '{}'),
    preferences: JSON.parse(localStorage.getItem('wastenot_preferences') || '{}'),
    user: JSON.parse(localStorage.getItem('wastenot_user') || '{}')
  };
  
  let exportData, filename, mimeType;
  
  switch (format) {
    case 'json':
      exportData = JSON.stringify(data, null, 2);
      filename = 'wastenot_user_data.json';
      mimeType = 'application/json';
      break;
    case 'csv':
      exportData = convertItemsToCSV(data.items);
      filename = 'wastenot_user_data.csv';
      mimeType = 'text/csv';
      break;
    default:
      showNotification('Invalid export format', 'error');
      return;
  }
  
  // Create download link
  const blob = new Blob([exportData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification(`Data exported as ${format.toUpperCase()}`, 'success');
}

function convertItemsToCSV(items) {
  const headers = ['Name', 'Category', 'Quantity', 'Unit', 'Expiry Date', 'Added Date', 'Notes'];
  const rows = items.map(item => [
    item.name,
    item.category,
    item.quantity,
    item.unit,
    item.expiryDate,
    item.addedDate,
    item.notes || ''
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  const selectedFileSpan = document.getElementById('selected-file');
  const importBtn = document.getElementById('import-btn');
  
  if (file) {
    selectedFileSpan.textContent = file.name;
    importBtn.disabled = false;
  } else {
    selectedFileSpan.textContent = 'No file selected';
    importBtn.disabled = true;
  }
}

function importUserData() {
  const fileInput = document.getElementById('import-file');
  const file = fileInput.files[0];
  
  if (!file) {
    showNotification('Please select a file to import', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validate data structure
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid data format');
      }
      
      // Import data
      localStorage.setItem('wastenot_items', JSON.stringify(data.items));
      if (data.recipes) localStorage.setItem('wastenot_recipes', JSON.stringify(data.recipes));
      if (data.analytics) localStorage.setItem('wastenot_analytics', JSON.stringify(data.analytics));
      if (data.preferences) localStorage.setItem('wastenot_preferences', JSON.stringify(data.preferences));
      if (data.user) localStorage.setItem('wastenot_user', JSON.stringify(data.user));
      
      // Update global state
      if (window.appState) {
        window.appState.items = data.items;
        window.appState.recipes = data.recipes || [];
        window.appState.analytics = data.analytics || {};
      }
      
      // Reset file input
      fileInput.value = '';
      document.getElementById('selected-file').textContent = 'No file selected';
      document.getElementById('import-btn').disabled = true;
      
      showNotification('Data imported successfully!', 'success');
      
      // Refresh page to update all displays
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      showNotification('Error importing data. Please check file format.', 'error');
    }
  };
  
  reader.readAsText(file);
}

function clearAllData() {
  showConfirmModal(
    'Clear All Data',
    'Are you sure you want to clear all your data? This action cannot be undone.',
    () => {
      // Clear all localStorage data
      localStorage.removeItem('wastenot_items');
      localStorage.removeItem('wastenot_recipes');
      localStorage.removeItem('wastenot_analytics');
      localStorage.removeItem('wastenot_preferences');
      localStorage.removeItem('spoonacular_api_key');
      localStorage.removeItem('firebase_config');
      
      // Clear global state
      if (window.appState) {
        window.appState.items = [];
        window.appState.recipes = [];
        window.appState.analytics = {};
      }
      
      showNotification('All data cleared successfully!', 'success');
      
      // Refresh page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  );
}

function deleteAccount() {
  showConfirmModal(
    'Delete Account',
    'Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.',
    () => {
      // Clear all data
      localStorage.clear();
      
      // Clear global state
      if (window.appState) {
        window.appState.user = null;
        window.appState.isAuthenticated = false;
        window.appState.items = [];
        window.appState.recipes = [];
        window.appState.analytics = {};
      }
      
      showNotification('Account deleted successfully!', 'success');
      
      // Redirect to home page
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    }
  );
}

function showConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleElement = document.getElementById('confirm-title');
  const messageElement = document.getElementById('confirm-message');
  const confirmBtn = document.getElementById('confirm-action-btn');
  
  titleElement.textContent = title;
  messageElement.textContent = message;
  
  // Remove existing event listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  // Add new event listener
  newConfirmBtn.addEventListener('click', () => {
    closeConfirmModal();
    onConfirm();
  });
  
  modal.style.display = 'block';
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').style.display = 'none';
}

// Export functions for global access
window.exportUserData = exportUserData;
window.importUserData = importUserData;
window.clearAllData = clearAllData;
window.deleteAccount = deleteAccount;
window.closeConfirmModal = closeConfirmModal;
window.testSpoonacularAPI = testSpoonacularAPI; 