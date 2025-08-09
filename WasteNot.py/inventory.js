// Inventory management functionality
let currentItems = [];
let filteredItems = [];
let editingItemId = null;

// API key
const SPOONACULAR_API_KEY = "b76b4134ccd3415ca766cde58f04c8c0";

document.addEventListener('DOMContentLoaded', function() {
  initializeInventory();

  const recipeForm = document.getElementById('recipe-search-form');
  if (recipeForm) {
    recipeForm.addEventListener('submit', handleRecipeSearch);
  }
});

function initializeInventory() {
  loadItems();
  setupEventListeners();
  setupSearchAndFilters();
  
  // Check if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  if (editId) {
    editItem(editId);
  }
}

function setupEventListeners() {
  // Add item form
  const addItemForm = document.getElementById('add-item-form');
  if (addItemForm) {
    addItemForm.addEventListener('submit', handleAddItem);
  }
  
  // Edit item form
  const editItemForm = document.getElementById('edit-item-form');
  if (editItemForm) {
    editItemForm.addEventListener('submit', handleEditItem);
  }
  
  // Modal close button
  const closeButtons = document.querySelectorAll('.close');
  closeButtons.forEach(button => {
    button.addEventListener('click', closeEditModal);
  });
  
  // Close modal when clicking outside
  const modal = document.getElementById('edit-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeEditModal();
      }
    });
  }
  
  // Bulk delete button
  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', handleBulkDelete);
  }
}

function setupSearchAndFilters() {
  // Search functionality
  const searchInput = document.getElementById('search-items');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Category filter
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', handleFilter);
  }
  
  // Status filter
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', handleFilter);
  }
}

function loadItems() {
  const savedItems = localStorage.getItem('wastenot_items');
  if (savedItems) {
    currentItems = JSON.parse(savedItems);
  }
  
  filteredItems = [...currentItems];
  renderItems();
}

function renderItems() {
  const itemsGrid = document.getElementById('inventory-items');
  
  if (filteredItems.length === 0) {
    itemsGrid.innerHTML = '<p class="empty-state">No items found. Add your first item above!</p>';
    return;
  }
  
  itemsGrid.innerHTML = '';
  
  filteredItems.forEach(item => {
    const itemCard = createItemCard(item);
    itemsGrid.appendChild(itemCard);
  });
  
  updateBulkDeleteButton();
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
        <label class="checkbox-container">
          <input type="checkbox" class="item-checkbox" data-item-id="${item.id}">
          <span class="checkmark"></span>
        </label>
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
    ${item.notes ? `<div class="item-notes"><span>Notes:</span> ${item.notes}</div>` : ''}
  `;
  
  return card;
}

function handleAddItem(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const itemData = {
    id: 'item_' + Date.now(),
    name: formData.get('item-name'),
    category: formData.get('item-category'),
    quantity: parseInt(formData.get('item-quantity')),
    unit: formData.get('item-unit'),
    expiryDate: formData.get('item-expiry'),
    notes: formData.get('item-notes') || '',
    addedDate: new Date().toISOString()
  };
  
  // Validate required fields
  if (!itemData.name || !itemData.category || !itemData.expiryDate) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  // Add to items array
  currentItems.push(itemData);
  saveItems();
  
  // Reset form
  e.target.reset();
  
  // Refresh display
  loadItems();
  
  showNotification('Item added successfully!', 'success');
}

function handleEditItem(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const itemData = {
    id: editingItemId,
    name: formData.get('edit-item-name'),
    category: formData.get('edit-item-category'),
    quantity: parseInt(formData.get('edit-item-quantity')),
    unit: formData.get('edit-item-unit'),
    expiryDate: formData.get('edit-item-expiry'),
    notes: formData.get('edit-item-notes') || ''
  };
  
  // Update item in array
  const index = currentItems.findIndex(item => item.id === editingItemId);
  if (index !== -1) {
    currentItems[index] = { ...currentItems[index], ...itemData };
    saveItems();
    
    // Close modal and refresh
    closeEditModal();
    loadItems();
    
    showNotification('Item updated successfully!', 'success');
  }
}

function editItem(itemId) {
  const item = currentItems.find(item => item.id === itemId);
  if (!item) return;
  
  editingItemId = itemId;
  
  // Populate edit form
  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('edit-item-name').value = item.name;
  document.getElementById('edit-item-category').value = item.category;
  document.getElementById('edit-item-quantity').value = item.quantity;
  document.getElementById('edit-item-unit').value = item.unit;
  document.getElementById('edit-item-expiry').value = item.expiryDate.split('T')[0];
  document.getElementById('edit-item-notes').value = item.notes || '';
  
  // Show modal
  document.getElementById('edit-modal').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingItemId = null;
}

function deleteItem(itemId) {
  if (confirm('Are you sure you want to delete this item?')) {
    currentItems = currentItems.filter(item => item.id !== itemId);
    saveItems();
    loadItems();
    
    showNotification('Item deleted successfully!', 'success');
  }
}

function handleBulkDelete() {
  const selectedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
  const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.itemId);
  
  if (selectedIds.length === 0) {
    showNotification('Please select items to delete', 'error');
    return;
  }
  
  if (confirm(`Are you sure you want to delete ${selectedIds.length} item(s)?`)) {
    currentItems = currentItems.filter(item => !selectedIds.includes(item.id));
    saveItems();
    loadItems();
    
    showNotification(`${selectedIds.length} item(s) deleted successfully!`, 'success');
  }
}

function updateBulkDeleteButton() {
  const selectedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  
  if (selectedCheckboxes.length > 0) {
    bulkDeleteBtn.style.display = 'block';
    bulkDeleteBtn.textContent = `Delete Selected (${selectedCheckboxes.length})`;
  } else {
    bulkDeleteBtn.style.display = 'none';
  }
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  filteredItems = currentItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm))
  );
  
  renderItems();
}

function handleFilter() {
  const categoryFilter = document.getElementById('category-filter').value;
  const statusFilter = document.getElementById('status-filter').value;
  const searchTerm = document.getElementById('search-items').value.toLowerCase();
  
  filteredItems = currentItems.filter(item => {
    // Category filter
    if (categoryFilter && item.category !== categoryFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter) {
      const now = new Date();
      const expiryDate = new Date(item.expiryDate);
      const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
      
      let itemStatus = 'fresh';
      if (daysUntilExpiry < 0) {
        itemStatus = 'expired';
      } else if (daysUntilExpiry <= 3) {
        itemStatus = 'expiring-soon';
      }
      
      if (statusFilter !== itemStatus) {
        return false;
      }
    }
    
    // Search filter
    if (searchTerm) {
      return item.name.toLowerCase().includes(searchTerm) ||
             item.category.toLowerCase().includes(searchTerm) ||
             (item.notes && item.notes.toLowerCase().includes(searchTerm));
    }
    
    return true;
  });
  
  renderItems();
}

function saveItems() {
  localStorage.setItem('wastenot_items', JSON.stringify(currentItems));
  
  // Update global state
  if (window.appState) {
    window.appState.items = currentItems;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Add event listeners for checkboxes
document.addEventListener('change', function(e) {
  if (e.target.classList.contains('item-checkbox')) {
    updateBulkDeleteButton();
  }
});

// Recipe Search
async function handleRecipeSearch(e) {
  e.preventDefault();
  const resultsContainer = document.getElementById('recipe-results');
  resultsContainer.innerHTML = '<p>Loading recipes...</p>';

  // 1) prefer user input; fallback to inventory items
  const userInput = (document.getElementById('recipe-ingredients').value || '').trim();
  let ingredientsList = [];

  if (userInput) {
    ingredientsList = userInput.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    // fallback: use only non-expired inventory items (optional)
    const now = new Date();
    ingredientsList = currentItems
      .filter(it => {
        const exp = new Date(it.expiryDate);
        return !isNaN(exp) && exp >= now; // only not-expired items
      })
      .map(it => it.name.trim())
      .filter(Boolean);
  }

  if (ingredientsList.length === 0) {
    resultsContainer.innerHTML = '<p>Please add items to your inventory or type ingredients to search.</p>';
    return;
  }

  // Limit number of ingredients to avoid very long query
  const ingredients = ingredientsList.slice(0, 20).join(',');
  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=8&ranking=1&ignorePantry=true&apiKey=${SPOONACULAR_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error('Spoonacular response error:', res.status, text);
      resultsContainer.innerHTML = `<p>Error fetching recipes (status ${res.status}). Check console for details.</p>`;
      return;
    }

    const data = await res.json();

    // Spoonacular returns an array for this endpoint on success
    if (!Array.isArray(data) || data.length === 0) {
      console.log('Spoonacular returned empty or unexpected data:', data);
      resultsContainer.innerHTML = '<p>No recipes found for the provided ingredients. Try adjusting names (e.g., "broccoli" not "brocoli").</p>';
      return;
    }

    displayRecipes(data);
  } catch (error) {
    console.error('Fetch error:', error);
    resultsContainer.innerHTML = '<p>Error fetching recipes. Please try again.</p>';
  }
}

function displayRecipes(recipes) {
  const container = document.getElementById('recipe-results');
  container.innerHTML = '';

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    // Small list of missed ingredients for user info
    const missed = (recipe.missedIngredients || []).map(i => i.name).join(', ');
    const used = (recipe.usedIngredients || []).map(i => i.name).join(', ');

    card.innerHTML = `
      <img src="${recipe.image}" alt="${recipe.title}" />
      <h3>${recipe.title}</h3>
      <p><strong>Used:</strong> ${used || recipe.usedIngredientCount}</p>
      <p><strong>Missing:</strong> ${missed || recipe.missedIngredientCount}</p>
      <a href="https://spoonacular.com/recipes/${encodeURIComponent(recipe.title.replace(/\s+/g, '-'))}-${recipe.id}" target="_blank" class="btn-primary">View Recipe</a>
    `;
    container.appendChild(card);
  });
}

// Export functions for global access
window.editItem = editItem;
window.deleteItem = deleteItem;
window.closeEditModal = closeEditModal;
