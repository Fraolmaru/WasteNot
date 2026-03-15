// Analytics functionality
let currentPeriod = 7;
let analyticsData = {};

document.addEventListener('DOMContentLoaded', function() {
  initializeAnalytics();
});

function initializeAnalytics() {
  loadAnalyticsData();
  setupEventListeners();
  updateAnalytics();
  initializeCharts();
}

function setupEventListeners() {
  // Time period buttons
  const timeButtons = document.querySelectorAll('.time-btn');
  timeButtons.forEach(button => {
    button.addEventListener('click', function() {
      currentPeriod = parseInt(this.dataset.period);
      
      // Update active button
      timeButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Update analytics
      updateAnalytics();
      updateCharts();
    });
  });
}

function loadAnalyticsData() {
  // Load items from localStorage
  const savedItems = localStorage.getItem('wastenot_items');
  if (savedItems) {
    analyticsData.items = JSON.parse(savedItems);
  } else {
    analyticsData.items = [];
  }
  
  // Load analytics from localStorage
  const savedAnalytics = localStorage.getItem('wastenot_analytics');
  if (savedAnalytics) {
    analyticsData.analytics = JSON.parse(savedAnalytics);
  } else {
    analyticsData.analytics = {};
  }
}

function updateAnalytics() {
  const items = analyticsData.items || [];
  const now = new Date();
  const periodStart = new Date(now.getTime() - (currentPeriod * 24 * 60 * 60 * 1000));
  
  // Filter items for current period
  const periodItems = items.filter(item => {
    const addedDate = new Date(item.addedDate);
    return addedDate >= periodStart;
  });
  
  // Calculate metrics
  const totalItems = periodItems.length;
  const expiredItems = periodItems.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate < now;
  }).length;
  
  const wastePercentage = totalItems > 0 ? (expiredItems / totalItems * 100) : 0;
  const moneySaved = calculateMoneySaved(periodItems);
  
  // Update metrics display
  document.getElementById('total-items-metric').textContent = totalItems;
  document.getElementById('wasted-items-metric').textContent = expiredItems;
  document.getElementById('waste-percentage-metric').textContent = `${wastePercentage.toFixed(1)}%`;
  document.getElementById('money-saved-metric').textContent = `$${moneySaved.toFixed(2)}`;
  
  // Update insights
  updateInsights(periodItems);
}

function calculateMoneySaved(items) {
  // Simple calculation - assume average item cost of $3
  const averageItemCost = 3;
  const savedItems = items.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    const now = new Date();
    return expiryDate > now;
  });
  
  return savedItems.length * averageItemCost;
}

function updateInsights(items) {
  if (items.length === 0) {
    document.getElementById('top-wasted-item').textContent = 'No data available';
    document.getElementById('best-shopping-day').textContent = 'No data available';
    document.getElementById('improvement-trend').textContent = 'No data available';
    document.getElementById('recipe-success-rate').textContent = 'No data available';
    return;
  }
  
  // Top wasted item
  const expiredItems = items.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate < new Date();
  });
  
  if (expiredItems.length > 0) {
    const itemCounts = {};
    expiredItems.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
    });
    const topWasted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('top-wasted-item').textContent = topWasted[0];
  } else {
    document.getElementById('top-wasted-item').textContent = 'No wasted items';
  }
  
  // Best shopping day (simplified)
  const dayCounts = {};
  items.forEach(item => {
    const day = new Date(item.addedDate).toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  
  if (Object.keys(dayCounts).length > 0) {
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('best-shopping-day').textContent = bestDay[0];
  } else {
    document.getElementById('best-shopping-day').textContent = 'No data available';
  }
  
  // Improvement trend (simplified)
  const wasteRate = items.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate < new Date();
  }).length / items.length * 100;
  
  if (wasteRate < 20) {
    document.getElementById('improvement-trend').textContent = 'Excellent! Keep it up!';
  } else if (wasteRate < 40) {
    document.getElementById('improvement-trend').textContent = 'Good progress, room for improvement';
  } else {
    document.getElementById('improvement-trend').textContent = 'Focus on reducing waste';
  }
  
  // Recipe success rate
  const savedRecipes = localStorage.getItem('wastenot_recipes');
  if (savedRecipes) {
    const recipes = JSON.parse(savedRecipes);
    document.getElementById('recipe-success-rate').textContent = `${recipes.length} recipes found`;
  } else {
    document.getElementById('recipe-success-rate').textContent = 'No recipes yet';
  }
}

function initializeCharts() {
  // Initialize Chart.js charts
  createCategoryChart();
  createTrendChart();
  createExpirationChart();
  createComparisonChart();
}

function createCategoryChart() {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;
  
  const items = analyticsData.items || [];
  const categoryData = {};
  
  items.forEach(item => {
    const expiryDate = new Date(item.expiryDate);
    const now = new Date();
    
    if (expiryDate < now) {
      categoryData[item.category] = (categoryData[item.category] || 0) + 1;
    }
  });
  
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#C9CBCF'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function createTrendChart() {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;
  
  const items = analyticsData.items || [];
  const now = new Date();
  const labels = [];
  const wasteData = [];
  const savedData = [];
  
  // Generate labels for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    const dayItems = items.filter(item => {
      const itemDate = new Date(item.addedDate);
      return itemDate.toDateString() === date.toDateString();
    });
    
    const dayWaste = dayItems.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      return expiryDate < now;
    }).length;
    
    const daySaved = dayItems.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      return expiryDate > now;
    }).length;
    
    wasteData.push(dayWaste);
    savedData.push(daySaved);
  }
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Wasted Items',
        data: wasteData,
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.4
      }, {
        label: 'Saved Items',
        data: savedData,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function createExpirationChart() {
  const ctx = document.getElementById('expiration-chart');
  if (!ctx) return;
  
  const items = analyticsData.items || [];
  const now = new Date();
  
  const expirationRanges = {
    'Same Day': 0,
    '1-3 Days': 0,
    '4-7 Days': 0,
    '1-2 Weeks': 0,
    '2+ Weeks': 0
  };
  
  items.forEach(item => {
    const expiryDate = new Date(item.expiryDate);
    const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiry < 0) {
      expirationRanges['Same Day']++;
    } else if (daysUntilExpiry <= 3) {
      expirationRanges['1-3 Days']++;
    } else if (daysUntilExpiry <= 7) {
      expirationRanges['4-7 Days']++;
    } else if (daysUntilExpiry <= 14) {
      expirationRanges['1-2 Weeks']++;
    } else {
      expirationRanges['2+ Weeks']++;
    }
  });
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(expirationRanges),
      datasets: [{
        label: 'Items',
        data: Object.values(expirationRanges),
        backgroundColor: [
          '#FF6384',
          '#FF9800',
          '#FFCE56',
          '#4CAF50',
          '#2196F3'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function createComparisonChart() {
  const ctx = document.getElementById('comparison-chart');
  if (!ctx) return;
  
  const items = analyticsData.items || [];
  const now = new Date();
  
  // Calculate monthly data for the last 3 months
  const monthlyData = [];
  const labels = [];
  
  for (let i = 2; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthItems = items.filter(item => {
      const itemDate = new Date(item.addedDate);
      return itemDate >= monthStart && itemDate <= monthEnd;
    });
    
    const monthWaste = monthItems.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      return expiryDate < now;
    }).length;
    
    labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
    monthlyData.push(monthWaste);
  }
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Wasted Items',
        data: monthlyData,
        backgroundColor: '#FF6384'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function updateCharts() {
  // Destroy existing charts and recreate them
  Chart.helpers.each(Chart.instances, function(instance) {
    instance.destroy();
  });
  
  initializeCharts();
}

function exportData(format) {
  const items = analyticsData.items || [];
  const analytics = analyticsData.analytics || {};
  
  let data, filename, mimeType;
  
  switch (format) {
    case 'csv':
      data = convertToCSV(items);
      filename = 'wastenot_analytics.csv';
      mimeType = 'text/csv';
      break;
    case 'json':
      data = JSON.stringify({ items, analytics }, null, 2);
      filename = 'wastenot_analytics.json';
      mimeType = 'application/json';
      break;
    case 'pdf':
      // For PDF, we'd need a PDF library
      showNotification('PDF export not implemented yet', 'info');
      return;
    default:
      showNotification('Invalid export format', 'error');
      return;
  }
  
  // Create download link
  const blob = new Blob([data], { type: mimeType });
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

function convertToCSV(items) {
  const headers = ['Name', 'Category', 'Quantity', 'Unit', 'Expiry Date', 'Status', 'Notes'];
  const rows = items.map(item => {
    const now = new Date();
    const expiryDate = new Date(item.expiryDate);
    let status = 'Fresh';
    
    if (expiryDate < now) {
      status = 'Expired';
    } else if ((expiryDate - now) / (1000 * 60 * 60 * 24) <= 3) {
      status = 'Expiring Soon';
    }
    
    return [
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.expiryDate,
      status,
      item.notes || ''
    ];
  });
  
  return [headers, ...rows].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
}

// Export functions for global access
window.exportData = exportData; 