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
}

// API fetch with retry logic and caching
async function fetchWithRetry(url, options, maxRetries = 3, useCache = true) {
    // Generate cache key based on URL and relevant options
    const cacheKey = url + (options.body || '') + (options.method || 'GET');

    // Check cache first (for GET requests)
    if (useCache && options.method !== 'DELETE' && options.method !== 'PUT' && options.method !== 'POST') {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < API_CACHE_TTL)) {
            return {
                ok: true,
                status: 200,
                json: () => Promise.resolve(cachedData.data)
            };
        }
    }

    let retries = 0;
    while (retries <= maxRetries) {
        try {
            const response = await fetch(url, options);

            // For successful GET requests, cache the response
            if (response.ok && useCache && (!options.method || options.method === 'GET')) {
                const data = await response.json();
                apiCache.set(cacheKey, {
                    timestamp: Date.now(),
                    data: data
                });
                return {
                    ok: true,
                    status: response.status,
                    json: () => Promise.resolve(data)
                };
            }

            return response;
        } catch (err) {
            retries++;
            if (retries > maxRetries) throw err;

            // Exponential backoff
            const delay = Math.min(1000 * 2 ** retries, 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Badge UI update function
function updateBadgeUI(count) {
    const alertsBtn = document.querySelector('.btn-alarm');
    if (!alertsBtn) return;

    if (count > 0) {
        alertsBtn.classList.add('has-alerts');

        let badge = alertsBtn.querySelector('.alert-badge-count');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'alert-badge-count';
            alertsBtn.appendChild(badge);
        }
        badge.textContent = count;

        // Add ARIA for accessibility
        alertsBtn.setAttribute('aria-label', `Price alerts (${count} new)`);
    } else {
        alertsBtn.classList.remove('has-alerts');
        const badge = alertsBtn.querySelector('.alert-badge-count');
        if (badge) badge.remove();
        alertsBtn.setAttribute('aria-label', 'Price alerts');
    }
}

// Define variables outside DOMContentLoaded for global access
let alertsList;
let trackAlertsModal;
let alertTemplate;

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
        const titleEl = alertItem.querySelector('.alert-title');
        const brandEl = alertItem.querySelector('.alert-brand');
        const imageEl = alertItem.querySelector('.alert-image img');
        const targetPriceEl = alertItem.querySelector('.alert-target-price');
        const currentPriceEl = alertItem.querySelector('.alert-current-price');
        
        if (titleEl) titleEl.textContent = alert.product.name;
        if (brandEl) brandEl.textContent = alert.product.brand;
        if (imageEl) {
            imageEl.src = alert.product.image;
            imageEl.alt = alert.product.name;
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
        
        // Set up action buttons
        const editBtn = alertItem.querySelector('.btn-edit');
        const deleteBtn = alertItem.querySelector('.btn-delete');
        const viewLink = alertItem.querySelector('.btn-view');
        
        if (editBtn) editBtn.addEventListener('click', () => editAlert(alert.id, alert));
        if (deleteBtn) deleteBtn.addEventListener('click', () => deleteAlert(alert.id));
        if (viewLink) {
            const brandParam = encodeURIComponent(alert.product.brand.toLowerCase());
            const modelParam = encodeURIComponent(alert.product.name);
            viewLink.href = `/?brand=${brandParam}&model=${modelParam}`;
        }
        
        // Add to DOM
        alertsList.appendChild(alertItem);
    } catch (error) {
        logError(error, 'renderAlertItem');
    }
}

async function loadUserAlerts(page = 1) {
    if (!alertsList) {
        alertsList = document.querySelector('.alerts-list');
        if (!alertsList) return;
    }
    
    console.log("Loading user alerts...");
    
    // Show loading state
    alertsList.innerHTML = '<div class="loading">Loading your price alerts...</div>';
    alertsList.setAttribute('aria-busy', 'true');
    
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("Authentication required");
        }
        
        // Get filter and sort options
        const filter = document.getElementById('alertsFilter')?.value || 'all';
        const sort = document.getElementById('alertsSort')?.value || 'newest';
        apiCache.delete(`/api/price-alerts?page=${page}&filter=${filter}&sort=${sort}`);
        const response = await fetchWithRetry(`/api/price-alerts?page=${page}&filter=${filter}&sort=${sort}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(response.status === 401 ? "Authentication required" : "Failed to load alerts");
        }
        
        const data = await response.json();
        
        // Clear aria-busy state
        alertsList.removeAttribute('aria-busy');
        
        // Clear previous alerts
        alertsList.innerHTML = '';
        
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
                    window.location.href = '/';
                });
            }
            
            // Update pagination
            updatePaginationUI(1, 1);
        } else {
            // Render alerts
            data.alerts.forEach(alert => renderAlertItem(alert));
            
            // Update pagination
            updatePaginationUI(data.currentPage || 1, data.totalPages || 1);
        }
    } catch (error) {
        logError(error, 'loadUserAlerts');
        
        if (alertsList) {
            alertsList.innerHTML = `<div class="error-message">
                ${error.message === "Authentication required" 
                    ? "Please login to view your price alerts" 
                    : "Failed to load your price alerts. Please try again later."}
            </div>`;
            alertsList.removeAttribute('aria-busy');
        }
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
    }
}

// Function to reload the alerts list
function refreshAlertsList() {
    console.log("Refreshing alerts list");
    // Only reload if modal is open
    if (trackAlertsModal && !trackAlertsModal.classList.contains('hidden')) {
        loadUserAlerts();
    }
}

// Make functions globally available
window.loadUserAlerts = loadUserAlerts;
window.refreshAlertsList = refreshAlertsList;

// Add this new function to handle returning to track alerts after editing
window.returnToTrackAlertsModal = function() {
    // Check if the modal exists
    if (!trackAlertsModal) return;
    
    // Open the track alerts modal
    window.openTrackAlertsModal();
    
    // Refresh the data
    loadUserAlerts();
};

// Handle delete functionality globally
async function deleteAlert(id) {
    if (confirm('Are you sure you want to delete this price alert?')) {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("User not authenticated");
            }
            
            const response = await fetchWithRetry(`/api/price-alerts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }, 3, false); // Don't use cache for DELETE
            
            if (response.ok) {
                // Clear all alert-related cache entries
                for (const key of apiCache.keys()) {
                    if (key.includes('/api/price-alerts')) {
                        apiCache.delete(key);
                    }
                }
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Alert deleted successfully';
                
                if (alertsList) {
                    alertsList.prepend(successMsg);
                    setTimeout(() => {
                        if (successMsg.parentNode) {
                            successMsg.parentNode.removeChild(successMsg);
                        }
                    }, 3000);
                }
                
                console.log("Alert deleted, refreshing list...");
                // Refresh the alerts list
                loadUserAlerts();
                
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
        }
    }
}

// Also define editAlert globally
function editAlert(id, alertData) {
    // Don't close track alerts modal, just remember it was open
    const trackAlertsWasOpen = trackAlertsModal && !trackAlertsModal.classList.contains('hidden');
    
    if (trackAlertsModal) {
        trackAlertsModal.classList.add('hidden');
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    // Skip trying to fetch from non-existent API endpoint
    // Instead, create a properly formatted product object directly from alertData
    const productData = {
        _id: alertData.product.id,
        brand: alertData.product.brand,
        model: alertData.product.name,
        model_image: alertData.product.image,
        cheapest_price: alertData.currentPrice,
        _existingAlert: {
            id: id,
            targetPrice: alertData.targetPrice,
            email: alertData.email
        }
    };

    // Add flag to remember track alerts was open
    productData._trackAlertsWasOpen = trackAlertsWasOpen;

    console.log("Edit alert with product data:", productData);
    
    // Show price alarm modal with pre-filled data
    if (window.showPriceAlarmModal) {
        window.showPriceAlarmModal(productData);
    }
}

// Main document ready function
document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    trackAlertsModal = document.getElementById('trackAlertsModal');
    alertsList = document.querySelector('.alerts-list');
    alertTemplate = document.querySelector('.alert-item-template');
    
    const closeBtn = trackAlertsModal?.querySelector('.price-alert-close');
    const filterSelect = document.getElementById('alertsFilter');
    const sortSelect = document.getElementById('alertsSort');
    const paginationBtns = document.querySelectorAll('.btn-page');
    
    // Keyboard trap for modal accessibility
    function handleModalKeyboard(e) {
        if (e.key === 'Escape') {
            trackAlertsModal.classList.add('hidden');
            document.removeEventListener('keydown', handleModalKeyboard);
        }
        
        // Keep focus within modal
        if (e.key === 'Tab') {
            // (existing code)
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
        loadUserAlerts();
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
        loadUserAlerts();
    }, 300));
    
    // Sort change with debounce
    sortSelect?.addEventListener('change', debounce(function () {
        loadUserAlerts();
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
});

// Make deleteAlert globally available
window.deleteAlert = deleteAlert;
window.editAlert = editAlert;

// Check for alerts and update the badge
function updateAlertsBadge() {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Don't update too frequently (throttle)
    if (alertsState.lastUpdated && (Date.now() - alertsState.lastUpdated < 60000)) {
        updateBadgeUI(alertsState.triggered);
        return;
    }

    // Fetch alerts count from API
    fetchWithRetry('/api/price-alerts/count', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
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

// Make updateAlertsBadge globally available
window.updateAlertsBadge = updateAlertsBadge;

// Function to reload the alerts list
function refreshAlertsList() {
    // Only reload if modal is open
    const trackAlertsModal = document.getElementById('trackAlertsModal');
    if (trackAlertsModal && !trackAlertsModal.classList.contains('hidden')) {
        // Use window.loadUserAlerts to ensure we're using the exposed function
        if (window.loadUserAlerts) {
            window.loadUserAlerts();
        }
    }
}

// Make refreshAlertsList globally available
window.refreshAlertsList = refreshAlertsList;

// Store the original function
const originalShowPriceAlarmModal = window.showPriceAlarmModal;

// Override with our enhanced version
window.showPriceAlarmModal = function(productData) {
    // Call the original function
    originalShowPriceAlarmModal(productData);
    
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