// Global state management
const appState = {
  user: null,
  isAuthenticated: false,
  items: [],
  recipes: [],
  analytics: {}
};

// Firebase configuration (to be set by user)
let firebaseConfig = null;
let db = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  loadUserData();
});

function initializeApp() {
  // Check if user is logged in (localStorage for now)
  const savedUser = localStorage.getItem('wastenot_user');
  if (savedUser) {
    appState.user = JSON.parse(savedUser);
    appState.isAuthenticated = true;
    updateAuthUI();
  }
  
  // Load saved data
  loadSavedData();
}

document.addEventListener('click', function (e) {
  const btn = e.target.closest('#login-btn, #logout-btn');
  if (!btn) {
    return;
  }
  e.preventDefault();
  try {
    if (btn.id === 'login-btn') {
      handleLogin();
    } else {
      handleLogout();
    }
  } catch (err) {
    console.error('Auth handler error:', err);
  }
}, true);


function setupEventListeners() {
    // one delegated handler for ALL login/logout buttons anywhere
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.auth-btn');
      if (!btn) {
        return;
      }
      e.preventDefault();
      if (btn.id === 'login-btn') {
        handleLogin();
      } else if (btn.id === 'logout-btn') {
        handleLogout();
      }
    }, true);
  
    // Navigation highlight
    setupNavigation();
}

function setupNavigation() {
  // Highlight current page in navigation
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
}

function handleLogin() {
  // Simulate login for now
  const user = {
    id: 'user_' + Date.now(),
    name: 'Demo User',
    email: 'demo@wastenot.com',
    avatar: null
  };
  
  appState.user = user;
  appState.isAuthenticated = true;
  
  // Save to localStorage
  localStorage.setItem('wastenot_user', JSON.stringify(user));
  
  updateAuthUI();
  
  // Show welcome message
  showNotification('Welcome back!', 'success');
}

function handleLogout() {
  appState.user = null;
  appState.isAuthenticated = false;
  
  // Clear localStorage
  localStorage.removeItem('wastenot_user');
  
  updateAuthUI();
  
  // Redirect to home page
  window.location.href = 'index.html';
}

function updateAuthUI() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userName = document.getElementById('user-name');
  
  if (appState.isAuthenticated) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (userName) userName.textContent = appState.user.name;
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userName) userName.textContent = 'Guest';
  }
}

function loadUserData() {
  // Load user's items, recipes, etc.
  loadItems();
  loadRecipes();
  loadAnalytics();
}

function loadItems() {
  const savedItems = localStorage.getItem('wastenot_items');
  if (savedItems) {
    appState.items = JSON.parse(savedItems);
  }
}

function loadRecipes() {
  const savedRecipes = localStorage.getItem('wastenot_recipes');
  if (savedRecipes) {
    appState.recipes = JSON.parse(savedRecipes);
  }
}

function loadAnalytics() {
  const savedAnalytics = localStorage.getItem('wastenot_analytics');
  if (savedAnalytics) {
    appState.analytics = JSON.parse(savedAnalytics);
  }
}

function saveData() {
  localStorage.setItem('wastenot_items', JSON.stringify(appState.items));
  localStorage.setItem('wastenot_recipes', JSON.stringify(appState.recipes));
  localStorage.setItem('wastenot_analytics', JSON.stringify(appState.analytics));
}

function loadSavedData() {
  // Load any saved data from localStorage
  const savedData = localStorage.getItem('wastenot_data');
  if (savedData) {
    const data = JSON.parse(savedData);
    // Merge with current state
    Object.assign(appState, data);
  }
}

// Utility functions
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
  
  // Close button
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .notification-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  
  .notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;
document.head.appendChild(notificationStyles);

// Export functions for other pages
window.appState = appState;
window.showNotification = showNotification;
window.saveData = saveData;
