import { secureApiCall, apiCallWithRetry } from './api-utils.js';
import { showAuthModal } from './auth.js';

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// API cache and state management
const apiCache = new Map();
const API_CACHE_TTL = 60000; // 1 minute cache TTL

// Global alerts state
const alertsState = {
    total: 0,
    triggered: 0,
    lastUpdated: null
};

// Error tracking
function logError(error, context) {
    // In production, you'd send this to a monitoring service like Sentry
    console.error(`Error in ${context}:`, error);

    // For development, show in console with more details
    console.group(`Error Details (${context})`);
    console.error(error);
    console.trace();
    console.groupEnd();
    
    // Return a standardized error message for UI
    return error.message === "Authentication required" 
        ? "Please login to view your price alerts" 
        : "An error occurred. Please try again later.";
}

// Clear specific cache entries by pattern
function clearCacheByPattern(pattern) {
    for (const key of apiCache.keys()) {
        if (key.includes(pattern)) {
            apiCache.delete(key);
        }
    }
}

// Define variables outside DOMContentLoaded for global access
let alertsList = null;
let trackAlertsModal = null;
let alertTemplate = null;
let currentAlertsPage = 1;
const title = str => {
    if (!str) return ''; // Add null check
    return str.replace(/\b\w/g, c => c.toUpperCase());
};

// Render single alert item - moved outside DOMContentLoaded
function renderAlertItem(alert) {
    if (!alertTemplate || !alertsList) {
        alertTemplate = document.querySelector('.alert-item-template');
        alertsList = document.querySelector('.alerts-list');
        if (!alertTemplate || !alertsList) return;
    }
    
    try {
        // Clone template
        const alertItem = alertTemplate.content.cloneNode(true);
        
        // Set alert data
        const modelEl = alertItem.querySelector('.alert-model');
        const brandEl = alertItem.querySelector('.alert-brand');
        const imageEl = alertItem.querySelector('.alert-image img');
        const targetPriceEl = alertItem.querySelector('.alert-target-price');
        const currentPriceEl = alertItem.querySelector('.alert-current-price');
        
        const model = title(alert.product.model);
        const brand = title(alert.product.brand);
        if (modelEl) modelEl.textContent = model;
        if (brandEl) brandEl.textContent = brand;
        if (imageEl) {
            imageEl.src = alert.product.model_image;
            imageEl.alt = alert.product.model;
            // Add loading="lazy" for better performance
            imageEl.loading = "lazy";
        }
        if (targetPriceEl) targetPriceEl.textContent = `Ksh ${alert.targetPrice.toLocaleString()}`;
        if (currentPriceEl) currentPriceEl.textContent = `Ksh ${alert.currentPrice.toLocaleString()}`;
        
        // Calculate price change
        const priceChangeEl = alertItem.querySelector('.price-change');
        if (priceChangeEl) {
            const priceChange = ((alert.currentPrice - alert.originalPrice) / alert.originalPrice) * 100;
            
            if (priceChange < 0) {
                priceChangeEl.textContent = `↓ ${Math.abs(priceChange).toFixed(1)}%`;
                priceChangeEl.className = 'price-change down';
            } else if (priceChange > 0) {
                priceChangeEl.textContent = `↑ +${priceChange.toFixed(1)}%`;
                priceChangeEl.className = 'price-change up';
            } else {
                priceChangeEl.textContent = `0%`;
                priceChangeEl.className = 'price-change';
            }
        }
        
        // Set badge
        const badge = alertItem.querySelector('.alert-badge span');
        if (badge) {
            if (alert.triggered) {
                badge.textContent = 'Price dropped!';
                badge.className = 'badge-triggered';
            } else {
                badge.textContent = 'Active';
                badge.className = 'badge-active';
            }
        }
        
        // Format date
        const dateEl = alertItem.querySelector('.date-value');
        if (dateEl && alert.createdAt) {
            const date = new Date(alert.createdAt);
            dateEl.textContent = date.toLocaleDateString();
        }
        
        // Set up action buttons with data attributes for better event delegation
        const editBtn = alertItem.querySelector('.btn-edit');
        const deleteBtn = alertItem.querySelector('.btn-delete');
        const viewLink = alertItem.querySelector('.btn-view');
        
        if (editBtn) {
            editBtn.setAttribute('data-alert-id', alert.alert_id);
            editBtn.setAttribute('data-alert-data', JSON.stringify(alert));
        }
        
        if (deleteBtn) {
            deleteBtn.setAttribute('data-alert-id', alert.alert_id);
        }
        
        if (viewLink) {
            const brandParam = encodeURIComponent(alert.product.brand.toLowerCase());
            const modelParam = encodeURIComponent(alert.product.model.toLowerCase());
            viewLink.href = `/?brand=${brandParam}&model=${modelParam}`;
            viewLink.target = "_blank";
            viewLink.rel = "noopener noreferrer"; // Security best practice
        }
        
        // Add to DOM
        alertsList.appendChild(alertItem);
    } catch (error) {
        logError(error, 'renderAlertItem');
    }
}

// Add before loadUserAlerts function
function mapSortValue(clientValue) {
  const sortMap = {
    'newest': 'date-desc',
    'oldest': 'date-asc',
    'price-high': 'price-desc', 
    'price-low': 'price-asc'
  };
  return sortMap[clientValue] || 'date-desc';
}

async function loadUserAlerts(page = 1) {
    if (!alertsList) {
        alertsList = document.querySelector('.alerts-list');
        if (!alertsList) return;
    }
    
    currentAlertsPage = page;
    
    // Show loading state
    alertsList.innerHTML = '<div class="loading-spinner" aria-hidden="true"></div><div class="loading">Loading your price alerts...</div>';
    alertsList.setAttribute('aria-busy', 'true');
    
    try {
        // Get filter and sort options
        const filter = document.getElementById('alertsFilter')?.value || 'all';
        const sort = document.getElementById('alertsSort')?.value || 'newest';
        const mappedSort = mapSortValue(sort);
        
        // Clear cache for fresh data
        clearCacheByPattern(`price-alerts?page=${page}`);
        
        // Use secureApiCall instead of checking for token
        const response = await secureApiCall(`price-alerts?page=${page}&filter=${filter}&sort=${mappedSort}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Show auth modal for unauthorized access
                showAuthModal();
            }
            throw new Error(response.status === 401 ? "Authentication required" : "Failed to load alerts");
        }
        
        const data = await response.json();
        
        // Clear aria-busy state
        alertsList.removeAttribute('aria-busy');
        
        // Clear previous alerts
        alertsList.innerHTML = '';
        console.log('Alerts data:', data);
        
        if (!data.alerts || data.alerts.length === 0) {
            // Display empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <h3>No price alerts found</h3>
                <p>You haven't set any price alerts yet.</p>
                <button class="btn btn-primary">Browse Products</button>
            `;
            alertsList.appendChild(emptyState);
            
            // Add click handler to the browse button
            const browseBtn = emptyState.querySelector('.btn-primary');
            if (browseBtn) {
                browseBtn.addEventListener('click', function() {
                    trackAlertsModal.classList.add('hidden');
                });
            }
            
            // Update pagination
            updatePaginationUI(1, 1);
        } else {
            // Render alerts
            data.alerts.forEach(alert => renderAlertItem(alert));
            
            // Update pagination
            updatePaginationUI(data.currentPage || 1, data.totalPages || 1);
            
            // Set up event delegation for alert actions
            setupAlertEventListeners();
        }
    } catch (error) {
        const errorMessage = logError(error, 'loadUserAlerts');
        
        if (alertsList) {
            alertsList.innerHTML = `<div class="error-message">${errorMessage}</div>`;
            alertsList.removeAttribute('aria-busy');
        }
    }
}

// Setup event delegation for alert actions
function setupAlertEventListeners() {
    if (!alertsList) return;
    
    // Remove existing listeners to prevent duplicates
    alertsList.removeEventListener('click', handleAlertActions);
    
    // Add new listener
    alertsList.addEventListener('click', handleAlertActions);
}

// Event handler for alert actions using event delegation
function handleAlertActions(event) {
    const editBtn = event.target.closest('.btn-edit');
    const deleteBtn = event.target.closest('.btn-delete');
    
    if (editBtn) {
        const alertId = editBtn.getAttribute('data-alert-id');
        try {
            const alertData = JSON.parse(editBtn.getAttribute('data-alert-data'));
            editAlert(alertId, alertData);
        } catch (error) {
            logError(error, 'handleAlertActions - edit');
        }
    } else if (deleteBtn) {
        const alertId = deleteBtn.getAttribute('data-alert-id');
        deleteAlert(alertId);
    }
}

// Helper function for pagination UI
function updatePaginationUI(currentPage, totalPages) {
    const currentPageEl = document.getElementById('currentPage');
    const totalPagesEl = document.getElementById('totalPages');
    
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    
    const paginationBtns = document.querySelectorAll('.btn-page');
    if (paginationBtns && paginationBtns.length >= 2) {
        paginationBtns[0].disabled = currentPage <= 1;
        paginationBtns[1].disabled = currentPage >= totalPages;
        
        // Update ARIA labels
        paginationBtns[0].setAttribute('aria-label', `Go to previous page (${currentPage > 1 ? currentPage - 1 : 1})`);
        paginationBtns[1].setAttribute('aria-label', `Go to next page (${currentPage < totalPages ? currentPage + 1 : totalPages})`);
    }
}

// Function to reload the alerts list
function refreshAlertsList() {
    // Only reload if modal is open
    if (trackAlertsModal && !trackAlertsModal.classList.contains('hidden')) {
        loadUserAlerts(currentAlertsPage);
    }
}

// Make functions globally available
window.loadUserAlerts = loadUserAlerts;
window.refreshAlertsList = refreshAlertsList;

// Add this function to handle returning to track alerts after editing
window.returnToTrackAlertsModal = function() {
    // Check if the modal exists
    if (!trackAlertsModal) return;
    
    // Open the track alerts modal
    window.openTrackAlertsModal();
    
    // Refresh the data
    loadUserAlerts(currentAlertsPage);
};

// Handle delete functionality globally
async function deleteAlert(alert_id) {
    if (confirm('Are you sure you want to delete this price alert?')) {
        try {
            // Show loading state
            const alertItem = document.querySelector(`[data-alert-id="${alert_id}"]`)?.closest('.alert-item');
            if (alertItem) {
                alertItem.classList.add('deleting');
                alertItem.innerHTML += '<div class="overlay-loading">Deleting...</div>';
            }
            
            // Use secureApiCall instead of checking for token
            const response = await secureApiCall(`price-alerts/${alert_id}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                // Clear all alert-related cache entries
                clearCacheByPattern('price-alerts');
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Alert deleted successfully';
                successMsg.setAttribute('role', 'status');
                
                if (alertsList) {
                    alertsList.prepend(successMsg);
                    setTimeout(() => {
                        if (successMsg.parentNode) {
                            successMsg.parentNode.removeChild(successMsg);
                        }
                    }, 3000);
                }
                
                // Refresh the alerts list
                loadUserAlerts(currentAlertsPage);
                
                // Update the badge count
                if (window.updateAlertsBadge) {
                    window.updateAlertsBadge();
                }
            } else {
                throw new Error('Failed to delete alert');
            }
        } catch (error) {
            logError(error, 'deleteAlert');
            alert('Failed to delete the price alert. Please try again.');
            
            // Remove loading state if still present
            const alertItem = document.querySelector(`[data-alert-id="${id}"]`)?.closest('.alert-item');
            if (alertItem) {
                alertItem.classList.remove('deleting');
                const overlay = alertItem.querySelector('.overlay-loading');
                if (overlay) overlay.remove();
            }
        }
    }
}

// Define editAlert globally
function editAlert(alert_id, alertData) {
    // Don't close track alerts modal, just remember it was open
    const trackAlertsWasOpen = trackAlertsModal && !trackAlertsModal.classList.contains('hidden');
    
    if (trackAlertsModal) {
        trackAlertsModal.classList.add('hidden');
    }

    const brand = title(alertData.product.brand);
    // Create a properly formatted product object from alertData
    const productData = {
        product_id: alertData.product.product_id,
        brand: brand,
        model: alertData.product.model,
        model_image: alertData.product.model_image,
        current_price: alertData.currentPrice,
        _existingAlert: {
            alert_id: alert_id,
            targetPrice: alertData.targetPrice,
            email: alertData.email
        },
        _trackAlertsWasOpen: trackAlertsWasOpen
    };
    
    // Show price alarm modal with pre-filled data
    if (window.showPriceAlarmModal) {
        window.showPriceAlarmModal(productData);
    }
}

// Add this function before updateAlertsBadge()

/**
 * Updates the badge UI element with the count of triggered alerts
 * @param {number} count - Number of triggered alerts
 */
function updateBadgeUI(count) {
  // Find the parent elements
  const alertBtn = document.querySelector('.btn-alarm, .price-alerts-icon');
  if (!alertBtn) {
    console.warn('Price alerts button element not found');
    return;
  }

  // Find or create badge element
  let badge = alertBtn.querySelector('.badge');
  
  if (!badge) {
    // Create the badge element if it doesn't exist
    console.log('Creating new badge element');
    badge = document.createElement('span');
    badge.className = 'badge';
    alertBtn.appendChild(badge);
  }

  // Update the badge count
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
    badge.classList.add('active');
    
    // Add animation effect
    badge.classList.remove('pulse');
    setTimeout(() => {
      badge.classList.add('pulse');
    }, 10);
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
    badge.classList.remove('active', 'pulse');
  }
  
  // Update any title/tooltip on the parent button for accessibility
  alertBtn.setAttribute('aria-label', 
    count > 0 ? `Price alerts (${count} triggered)` : 'Price alerts');
}

// Check for alerts and update the badge
function updateAlertsBadge() {
    // Don't update too frequently (throttle)
    if (alertsState.lastUpdated && (Date.now() - alertsState.lastUpdated < 60000)) {
        updateBadgeUI(alertsState.triggered);
        return;
    }

    // Fetch alerts count from API using secureApiCall
    secureApiCall('price-alerts/count')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch alerts count');
            }
            return response.json();
        })
        .then(data => {
            // Update state
            alertsState.total = data.totalCount || 0;
            alertsState.triggered = data.triggeredCount || 0;
            alertsState.lastUpdated = Date.now();

            updateBadgeUI(data.triggeredCount || 0);
        })
        .catch(err => {
            logError(err, 'updateAlertsBadge');
            // Don't clear existing badge on error
        });
}

// Main document ready function
document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    trackAlertsModal = document.getElementById('trackAlertsModal');
    alertsList = document.querySelector('.alerts-list');
    alertTemplate = document.querySelector('.alert-item-template');
    
    const closeBtn = trackAlertsModal?.querySelector('.modal-close');
    const filterSelect = document.getElementById('alertsFilter');
    const sortSelect = document.getElementById('alertsSort');
    const paginationBtns = document.querySelectorAll('.btn-page');
    
    // Keyboard trap for modal accessibility
    function handleModalKeyboard(e) {
        if (e.key === 'Escape') {
            trackAlertsModal.classList.add('hidden');
            document.removeEventListener('keydown', handleModalKeyboard);
        }
        
        // Keep focus within modal for accessibility
        if (e.key === 'Tab') {
            const focusableElements = trackAlertsModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            // If going backward and at first element, go to last element
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
            // If going forward and at last element, circle back to first element
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    // Open modal function - call this when "My Alerts" is clicked
    window.openTrackAlertsModal = function () {
        if (!trackAlertsModal) return;
        
        trackAlertsModal.classList.remove('hidden');
        
        // Set focus for accessibility
        const firstButton = trackAlertsModal.querySelector('button');
        if (firstButton) setTimeout(() => firstButton.focus(), 100);
        
        // Add keyboard trap for accessibility
        document.addEventListener('keydown', handleModalKeyboard);
        
        // Always load fresh data
        loadUserAlerts(currentAlertsPage);
    };
    
    // Close modal
    closeBtn?.addEventListener('click', function () {
        trackAlertsModal.classList.add('hidden');
        document.removeEventListener('keydown', handleModalKeyboard);
    });
    
    // Close on outside click
    trackAlertsModal?.addEventListener('click', function (e) {
        if (e.target === trackAlertsModal) {
            trackAlertsModal.classList.add('hidden');
            document.removeEventListener('keydown', handleModalKeyboard);
        }
    });
    
    // Filter change with debounce
    filterSelect?.addEventListener('change', debounce(function () {
        loadUserAlerts(1); // Reset to first page when filter changes
    }, 300));
    
    // Sort change with debounce
    sortSelect?.addEventListener('change', debounce(function () {
        loadUserAlerts(1); // Reset to first page when sort changes
    }, 300));
    
    // Pagination buttons
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const currentPage = parseInt(document.getElementById('currentPage')?.textContent || '1');
            const totalPages = parseInt(document.getElementById('totalPages')?.textContent || '1');
            
            let newPage = currentPage;
            if (this.classList.contains('prev') && currentPage > 1) {
                newPage = currentPage - 1;
            } else if (this.classList.contains('next') && currentPage < totalPages) {
                newPage = currentPage + 1;
            }
            
            if (newPage !== currentPage) {
                loadUserAlerts(newPage);
            }
        });
    });
    
    // Initialize badge by checking session instead of token
    checkAuthenticated().then(isAuthenticated => {
        if (isAuthenticated) {
            updateAlertsBadge();
            
            // Poll for alerts every 5 minutes
            setInterval(updateAlertsBadge, 300000);
        }
    }).catch(error => {
        console.error("Failed to check authentication status:", error);
    });
});

/**
 * Check if the user is authenticated by verifying session
 * @returns {Promise<boolean>} - Authentication status
 */
async function checkAuthenticated() {
  try {
    const response = await secureApiCall("verify-session");
    return response.ok;
  } catch (error) {
    console.error("Session verification failed:", error);
    return false;
  }
}

// Make functions globally available
window.deleteAlert = deleteAlert;
window.editAlert = editAlert;
window.updateAlertsBadge = updateAlertsBadge;

// Override the original showPriceAlarmModal
const originalShowPriceAlarmModal = window.showPriceAlarmModal;

// Enhance with our version that remembers track alerts state
window.showPriceAlarmModal = function(productData) {
    // Call the original function if it exists
    if (typeof originalShowPriceAlarmModal === 'function') {
        originalShowPriceAlarmModal(productData);
    }
    
    // If this was opened from track alerts modal
    if (productData && productData._trackAlertsWasOpen) {
        // Add a one-time event listener for when price alarm modal closes
        const checkForPriceAlarmModalClosed = setInterval(() => {
            const priceAlarmModal = document.getElementById('priceAlarmModal');
            if (priceAlarmModal && priceAlarmModal.classList.contains('hidden')) {
                clearInterval(checkForPriceAlarmModalClosed);
                window.returnToTrackAlertsModal();
            }
        }, 300);
    }
};