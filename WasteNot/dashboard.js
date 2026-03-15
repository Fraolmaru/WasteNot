// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
  initializeDashboard();
});

function initializeDashboard() {
  // Load data from localStorage
  loadDashboardData();
  
  // Update dashboard stats
  updateDashboardStats();
  
  // Load recent items
  loadRecentItems();
  
  // Load expiring items
  loadExpiringItems();
  
  // Load recipe suggestions
  loadRecipeSuggestions();
}

function loadDashboardData() {
  // Load items from localStorage
  const savedItems = localStorage.getItem('wastenot_items');
  if (savedItems) {
    window.appState.items = JSON.parse(savedItems);
  }
  
  // Load recipes from localStorage
  const savedRecipes = localStorage.getItem('wastenot_recipes');
  if (savedRecipes) {
    window.appState.recipes = JSON.parse(savedRecipes);
  }
}

function updateDashboardStats() {
  const items = window.appState.items || [];
  const now = new Date();
  
  // Calculate stats
  const totalItems = items.length;
  const expiringSoon = items.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  }).length;
  
  const expiredItems = items.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate < now;
  }).length;
  
  const recipesFound = window.appState.recipes ? window.appState.recipes.length : 0;
  
  // Update DOM
  document.getElementById('total-items').textContent = totalItems;
  document.getElementById('expiring-soon').textContent = expiringSoon;
  document.getElementById('expired-items').textContent = expiredItems;
  document.getElementById('recipes-found').textContent = recipesFound;
}

function loadRecentItems() {
  const items = window.appState.items || [];
  const recentItemsList = document.getElementById('recent-items-list');
  
  if (items.length === 0) {
    recentItemsList.innerHTML = '<p class="empty-state">No items added yet. <a href="inventory.html">Add your first item</a></p>';
    return;
  }
  
  // Get 5 most recent items
  const recentItems = items
    .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
    .slice(0, 5);
  
  recentItemsList.innerHTML = '';
  
  recentItems.forEach(item => {
    const itemCard = createItemCard(item);
    recentItemsList.appendChild(itemCard);
  });
}

function loadExpiringItems() {
  const items = window.appState.items || [];
  const expiringList = document.getElementById('expiring-list');
  const now = new Date();
  
  // Get items expiring in the next 3 days
  const expiringItems = items.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  
  if (expiringItems.length === 0) {
    expiringList.innerHTML = '<p class="empty-state">No items expiring soon!</p>';
    return;
  }
  
  expiringList.innerHTML = '';
  
  expiringItems.forEach(item => {
    const itemCard = createItemCard(item);
    expiringList.appendChild(itemCard);
  });
}

function loadRecipeSuggestions() {
  const items = window.appState.items || [];
  const recipesGrid = document.getElementById('recipe-suggestions');
  
  if (items.length === 0) {
    recipesGrid.innerHTML = '<p class="empty-state">Add items to get recipe suggestions</p>';
    return;
  }
  
  // For now, show a placeholder message
  // In the future, this will integrate with Spoonacular API
  recipesGrid.innerHTML = `
    <div class="recipe-suggestion-placeholder">
      <p>Recipe suggestions will appear here based on your available ingredients.</p>
      <a href="recipes.html" class="btn-primary">Find Recipes</a>
    </div>
  `;
}

function createItemCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card';
  
  const now = new Date();
  const expiryDate = new Date(item.expiryDate);
  const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
  
  // Determine status
  let status = 'fresh';
  let statusText = 'Fresh';
  
  if (daysUntilExpiry < 0) {
    status = 'expired';
    statusText = 'Expired';
  } else if (daysUntilExpiry <= 3) {
    status = 'expiring-soon';
    statusText = 'Expiring Soon';
  }
  
  card.classList.add(status);
  
  card.innerHTML = `
    <div class="item-header">
      <div class="item-name">${item.name}</div>
      <div class="item-actions">
        <button class="item-action-btn" onclick="editItem('${item.id}')" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="item-action-btn" onclick="deleteItem('${item.id}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="item-details">
      <div class="item-detail">
        <span>Category</span>
        <span>${item.category}</span>
      </div>
      <div class="item-detail">
        <span>Quantity</span>
        <span>${item.quantity} ${item.unit}</span>
      </div>
      <div class="item-detail">
        <span>Expires</span>
        <span>${formatDate(item.expiryDate)}</span>
      </div>
      <div class="item-detail">
        <span>Status</span>
        <span class="item-status ${status}">${statusText}</span>
      </div>
    </div>
  `;
  
  return card;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function editItem(itemId) {
  // Redirect to inventory page with edit mode
  window.location.href = `inventory.html?edit=${itemId}`;
}

function deleteItem(itemId) {
  if (confirm('Are you sure you want to delete this item?')) {
    const items = window.appState.items || [];
    const updatedItems = items.filter(item => item.id !== itemId);
    
    window.appState.items = updatedItems;
    localStorage.setItem('wastenot_items', JSON.stringify(updatedItems));
    
    // Refresh dashboard
    initializeDashboard();
    
    showNotification('Item deleted successfully', 'success');
  }
}

// Add some sample data for demonstration
function addSampleData() {
  const sampleItems = [
    {
      id: 'item_1',
      name: 'Milk',
      category: 'dairy',
      quantity: 1,
      unit: 'liters',
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      addedDate: new Date().toISOString(),
      notes: 'Organic whole milk'
    },
    {
      id: 'item_2',
      name: 'Bananas',
      category: 'fruits',
      quantity: 6,
      unit: 'pieces',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      addedDate: new Date().toISOString(),
      notes: 'Yellow bananas'
    },
    {
      id: 'item_3',
      name: 'Chicken Breast',
      category: 'meat',
      quantity: 500,
      unit: 'grams',
      expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (expired)
      addedDate: new Date().toISOString(),
      notes: 'Boneless skinless'
    }
  ];
  
  window.appState.items = sampleItems;
  localStorage.setItem('wastenot_items', JSON.stringify(sampleItems));
  
  // Refresh dashboard
  initializeDashboard();
  
  showNotification('Sample data added!', 'success');
}

// Add sample data button (for demo purposes)
document.addEventListener('DOMContentLoaded', function() {
  // Add a hidden button for demo purposes
  const demoButton = document.createElement('button');
  demoButton.textContent = 'Add Sample Data';
  demoButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2196F3;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 8px;
    cursor: pointer;
    z-index: 1000;
    font-size: 12px;
  `;
  demoButton.onclick = addSampleData;
  document.body.appendChild(demoButton);
});

// Export functions for global access
window.editItem = editItem;
window.deleteItem = deleteItem;
window.addSampleData = addSampleData; 