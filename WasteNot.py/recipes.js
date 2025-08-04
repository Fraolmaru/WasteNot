// Recipe functionality
let currentRecipes = [];
let selectedIngredients = [];
let spoonacularApiKey = '';

document.addEventListener('DOMContentLoaded', function() {
  initializeRecipes();
});

function initializeRecipes() {
  loadUserData();
  setupEventListeners();
  loadAvailableIngredients();
  
  // Load saved API key
  const savedApiKey = localStorage.getItem('spoonacular_api_key');
  if (savedApiKey) {
    spoonacularApiKey = savedApiKey;
  }
}

function setupEventListeners() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tab = this.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Manual ingredient input
  const addIngredientBtn = document.getElementById('add-ingredient-btn');
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', addManualIngredient);
  }
  
  const ingredientInput = document.getElementById('ingredient-input');
  if (ingredientInput) {
    ingredientInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addManualIngredient();
      }
    });
  }
  
  // Recipe search buttons
  const findRecipesBtn = document.getElementById('find-recipes-btn');
  if (findRecipesBtn) {
    findRecipesBtn.addEventListener('click', searchRecipesFromInventory);
  }
  
  const searchRecipesBtn = document.getElementById('search-recipes-btn');
  if (searchRecipesBtn) {
    searchRecipesBtn.addEventListener('click', searchRecipesFromManual);
  }
  
  // Recipe modal
  const modal = document.getElementById('recipe-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeRecipeModal();
      }
    });
    
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeRecipeModal);
    }
  }
}

function loadUserData() {
  // Load items from localStorage
  const savedItems = localStorage.getItem('wastenot_items');
  if (savedItems) {
    window.appState.items = JSON.parse(savedItems);
  }
  
  // Load recipes from localStorage
  const savedRecipes = localStorage.getItem('wastenot_recipes');
  if (savedRecipes) {
    currentRecipes = JSON.parse(savedRecipes);
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update content
  document.querySelectorAll('.search-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-search`).classList.add('active');
  
  // Update button states
  updateButtonStates();
}

function loadAvailableIngredients() {
  const items = window.appState.items || [];
  const ingredientsList = document.getElementById('ingredients-list');
  
  if (items.length === 0) {
    ingredientsList.innerHTML = '<p class="empty-state">No ingredients in your inventory. <a href="inventory.html">Add some items</a> first!</p>';
    return;
  }
  
  ingredientsList.innerHTML = '';
  
  items.forEach(item => {
    const ingredientTag = document.createElement('div');
    ingredientTag.className = 'ingredient-tag';
    ingredientTag.innerHTML = `
      <span>${item.name}</span>
      <button class="remove-ingredient" onclick="toggleIngredient('${item.name}')">
        <i class="fas fa-plus"></i>
      </button>
    `;
    ingredientsList.appendChild(ingredientTag);
  });
  
  updateButtonStates();
}

function toggleIngredient(ingredientName) {
  const index = selectedIngredients.indexOf(ingredientName);
  if (index > -1) {
    selectedIngredients.splice(index, 1);
  } else {
    selectedIngredients.push(ingredientName);
  }
  
  updateSelectedIngredients();
  updateButtonStates();
}

function addManualIngredient() {
  const input = document.getElementById('ingredient-input');
  const ingredient = input.value.trim();
  
  if (ingredient && !selectedIngredients.includes(ingredient)) {
    selectedIngredients.push(ingredient);
    input.value = '';
    updateSelectedIngredients();
    updateButtonStates();
  }
}

function updateSelectedIngredients() {
  const manualIngredients = document.getElementById('manual-ingredients');
  manualIngredients.innerHTML = '';
  
  selectedIngredients.forEach(ingredient => {
    const tag = document.createElement('div');
    tag.className = 'ingredient-tag';
    tag.innerHTML = `
      <span>${ingredient}</span>
      <button class="remove-ingredient" onclick="removeManualIngredient('${ingredient}')">
        <i class="fas fa-times"></i>
      </button>
    `;
    manualIngredients.appendChild(tag);
  });
}

function removeManualIngredient(ingredient) {
  const index = selectedIngredients.indexOf(ingredient);
  if (index > -1) {
    selectedIngredients.splice(index, 1);
    updateSelectedIngredients();
    updateButtonStates();
  }
}

function updateButtonStates() {
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  
  if (activeTab === 'inventory') {
    const findRecipesBtn = document.getElementById('find-recipes-btn');
    findRecipesBtn.disabled = selectedIngredients.length === 0;
  } else {
    const searchRecipesBtn = document.getElementById('search-recipes-btn');
    searchRecipesBtn.disabled = selectedIngredients.length === 0;
  }
}

async function searchRecipesFromInventory() {
  if (selectedIngredients.length === 0) {
    showNotification('Please select ingredients first', 'error');
    return;
  }
  
  await searchRecipes(selectedIngredients);
}

async function searchRecipesFromManual() {
  if (selectedIngredients.length === 0) {
    showNotification('Please add ingredients first', 'error');
    return;
  }
  
  await searchRecipes(selectedIngredients);
}

async function searchRecipes(ingredients) {
  if (!spoonacularApiKey) {
    showNotification('Please configure your Spoonacular API key in Profile settings', 'error');
    return;
  }
  
  showLoading(true);
  
  try {
    // Get filters
    const cuisine = document.getElementById('cuisine-filter').value;
    const diet = document.getElementById('diet-filter').value;
    const maxTime = document.getElementById('max-time-filter').value;
    
    // Build API URL
    let url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${spoonacularApiKey}&ingredients=${ingredients.join(',')}&number=12&ranking=2`;
    
    if (cuisine) url += `&cuisine=${cuisine}`;
    if (diet) url += `&diet=${diet}`;
    if (maxTime) url += `&maxReadyTime=${maxTime}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const recipes = await response.json();
    
    // Get detailed recipe information
    const detailedRecipes = await Promise.all(
      recipes.map(async (recipe) => {
        try {
          const detailResponse = await fetch(
            `https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${spoonacularApiKey}`
          );
          if (detailResponse.ok) {
            return await detailResponse.json();
          }
        } catch (error) {
          console.error('Error fetching recipe details:', error);
        }
        return recipe;
      })
    );
    
    currentRecipes = detailedRecipes;
    localStorage.setItem('wastenot_recipes', JSON.stringify(currentRecipes));
    
    displayRecipes(detailedRecipes);
    showNotification(`Found ${detailedRecipes.length} recipes!`, 'success');
    
  } catch (error) {
    console.error('Error searching recipes:', error);
    showNotification('Error searching recipes. Please check your API key and try again.', 'error');
    
    // Show demo recipes if API fails
    displayDemoRecipes();
  } finally {
    showLoading(false);
  }
}

function displayRecipes(recipes) {
  const recipesGrid = document.getElementById('recipes-grid');
  const resultsCount = document.getElementById('results-count');
  
  resultsCount.textContent = `${recipes.length} recipes found`;
  
  if (recipes.length === 0) {
    recipesGrid.innerHTML = '<p class="empty-state">No recipes found. Try different ingredients or filters.</p>';
    return;
  }
  
  recipesGrid.innerHTML = '';
  
  recipes.forEach(recipe => {
    const recipeCard = createRecipeCard(recipe);
    recipesGrid.appendChild(recipeCard);
  });
}

function createRecipeCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';
  card.onclick = () => showRecipeDetails(recipe);
  
  const imageUrl = recipe.image || 'https://via.placeholder.com/300x200?text=No+Image';
  
  card.innerHTML = `
    <div class="recipe-image">
      <img src="${imageUrl}" alt="${recipe.title}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    </div>
    <div class="recipe-info">
      <div class="recipe-title">${recipe.title}</div>
      <div class="recipe-meta">
        <span><i class="fas fa-clock"></i> ${recipe.readyInMinutes || 'N/A'} min</span>
        <span><i class="fas fa-users"></i> ${recipe.servings || 'N/A'} servings</span>
        <span><i class="fas fa-star"></i> ${recipe.spoonacularScore || 'N/A'}</span>
      </div>
      <div class="recipe-ingredients">
        ${recipe.usedIngredientCount ? `Uses ${recipe.usedIngredientCount} of your ingredients` : 'Recipe ingredients'}
      </div>
    </div>
  `;
  
  return card;
}

function displayDemoRecipes() {
  const demoRecipes = [
    {
      id: 1,
      title: 'Pasta with Tomato Sauce',
      image: 'https://via.placeholder.com/300x200?text=Pasta',
      readyInMinutes: 25,
      servings: 4,
      spoonacularScore: 85,
      usedIngredientCount: 3
    },
    {
      id: 2,
      title: 'Chicken Stir Fry',
      image: 'https://via.placeholder.com/300x200?text=Stir+Fry',
      readyInMinutes: 30,
      servings: 2,
      spoonacularScore: 92,
      usedIngredientCount: 4
    },
    {
      id: 3,
      title: 'Vegetable Soup',
      image: 'https://via.placeholder.com/300x200?text=Soup',
      readyInMinutes: 45,
      servings: 6,
      spoonacularScore: 78,
      usedIngredientCount: 5
    }
  ];
  
  displayRecipes(demoRecipes);
}

function showRecipeDetails(recipe) {
  const modal = document.getElementById('recipe-modal');
  
  // Populate modal with recipe details
  document.getElementById('modal-recipe-title').textContent = recipe.title;
  document.getElementById('modal-recipe-image').src = recipe.image || 'https://via.placeholder.com/400x300?text=No+Image';
  document.getElementById('modal-recipe-time').textContent = `${recipe.readyInMinutes || 'N/A'} min`;
  document.getElementById('modal-recipe-servings').textContent = `${recipe.servings || 'N/A'} servings`;
  document.getElementById('modal-recipe-rating').textContent = recipe.spoonacularScore || 'N/A';
  
  // Ingredients
  const ingredientsList = document.getElementById('modal-recipe-ingredients');
  ingredientsList.innerHTML = '';
  if (recipe.extendedIngredients) {
    recipe.extendedIngredients.forEach(ingredient => {
      const li = document.createElement('li');
      li.textContent = `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`;
      ingredientsList.appendChild(li);
    });
  }
  
  // Instructions
  const instructionsList = document.getElementById('modal-recipe-instructions');
  instructionsList.innerHTML = '';
  if (recipe.analyzedInstructions && recipe.analyzedInstructions[0]) {
    recipe.analyzedInstructions[0].steps.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step.step;
      instructionsList.appendChild(li);
    });
  }
  
  // Recipe link
  const recipeLink = document.getElementById('modal-recipe-link');
  recipeLink.href = recipe.sourceUrl || `https://spoonacular.com/recipes/${recipe.title.replace(/ /g, '-')}-${recipe.id}`;
  
  // Show modal
  modal.style.display = 'block';
}

function closeRecipeModal() {
  document.getElementById('recipe-modal').style.display = 'none';
}

function showLoading(show) {
  const loadingState = document.getElementById('loading-recipes');
  const recipeResults = document.getElementById('recipe-results');
  
  if (show) {
    loadingState.style.display = 'block';
    recipeResults.style.display = 'none';
  } else {
    loadingState.style.display = 'none';
    recipeResults.style.display = 'block';
  }
}

// Test Spoonacular API connection
async function testSpoonacularAPI() {
  const apiKey = document.getElementById('spoonacular-api-key')?.value || spoonacularApiKey;
  
  if (!apiKey) {
    showNotification('Please enter your Spoonacular API key', 'error');
    return;
  }
  
  try {
    const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&query=pasta&number=1`);
    
    if (response.ok) {
      showNotification('API connection successful!', 'success');
      spoonacularApiKey = apiKey;
      localStorage.setItem('spoonacular_api_key', apiKey);
    } else {
      showNotification('API connection failed. Please check your key.', 'error');
    }
  } catch (error) {
    showNotification('Error testing API connection', 'error');
  }
}

// Export functions for global access
window.toggleIngredient = toggleIngredient;
window.removeManualIngredient = removeManualIngredient;
window.closeRecipeModal = closeRecipeModal;
window.testSpoonacularAPI = testSpoonacularAPI; 