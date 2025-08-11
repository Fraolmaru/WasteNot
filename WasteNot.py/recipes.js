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

  const savedApiKey = localStorage.getItem('spoonacular_api_key');
  if (savedApiKey) {
    spoonacularApiKey = savedApiKey;
  }
}

function setupEventListeners() {
  // Inventory button
  const findRecipesBtn = document.getElementById('find-recipes-btn');
  if (findRecipesBtn) {
    findRecipesBtn.addEventListener('click', searchRecipesFromInventory);
  }

  // Manual search
  const form = document.getElementById('recipe-search-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      searchRecipesFromManual();
    });
  }

  // Modal
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

function getInventoryIngredientNames() {
  const raw = localStorage.getItem('wastenot_items');
  if (!raw) {
    return [];
  }

  let items = [];
  try { 
    items = JSON.parse(raw); 
  } catch { 
    return []; 
  }

  const now = new Date();
  return items
    .filter(it => {
      const exp = new Date(it.expiryDate);
      return !isNaN(exp) && exp >= now;
    })
    .map(it => it.name)
    .filter(Boolean);
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

async function searchRecipesFromInventory() {
  const ingredients = getInventoryIngredientNames();
  if (ingredients.length === 0) {
    showNotification('No non-expired items in your inventory. Try manual search!', 'error');
    return;
  }
  await searchRecipesWithComplex(ingredients); // allows extra ingredients + respects filters
}

async function searchRecipesFromManual() {
  const raw = (document.getElementById('recipe-ingredients')?.value || '').trim();
  const ingredients = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (ingredients.length === 0) {
    showNotification('Please enter at least one ingredient.', 'error');
    return;
  }
  await searchRecipes(ingredients);
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

async function searchRecipesWithComplex(ingredients) {
  if (!spoonacularApiKey) {
    showNotification('Please configure your Spoonacular API key in Profile settings', 'error');
    return;
  }

  showLoading(true);
  try {
    const cuisine = document.getElementById('cuisine-filter')?.value || '';
    const diet = document.getElementById('diet-filter')?.value || '';
    const maxTime = document.getElementById('max-time-filter')?.value || '';

    const params = new URLSearchParams({
      apiKey: spoonacularApiKey,
      number: '12',
      addRecipeInformation: 'true',
      instructionsRequired: 'true',
      includeIngredients: ingredients.slice(0, 20).join(','),
    });
    if (cuisine) params.set('cuisine', cuisine);
    if (diet) params.set('diet', diet);
    if (maxTime) params.set('maxReadyTime', maxTime);

    const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    currentRecipes = results;
    localStorage.setItem('wastenot_recipes', JSON.stringify(results));
    displayRecipes(results);
    showNotification(`Found ${results.length} recipes!`, 'success');
  } catch (err) {
    console.error(err);
    showNotification('Error searching recipes. Please check your API key and try again.', 'error');
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
window.closeRecipeModal = closeRecipeModal;
window.testSpoonacularAPI = testSpoonacularAPI;
