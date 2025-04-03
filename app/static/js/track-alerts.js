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

// Main document ready function
document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const trackAlertsModal = document.getElementById('trackAlertsModal');

    // Ensure modal is hidden on page load
    if (trackAlertsModal) {
        trackAlertsModal.classList.add('hidden');
    }

    const closeBtn = trackAlertsModal?.querySelector('.price-alarm-close');
    const filterSelect = document.getElementById('alertsFilter');
    const sortSelect = document.getElementById('alertsSort');
    const noAlertsMessage = document.getElementById('noAlertsMessage');
    const alertsList = document.querySelector('.alerts-list');
    const alertTemplate = document.querySelector('.alert-item-template');
    const paginationBtns = document.querySelectorAll('.btn-page');

    // Alert polling interval
    let alertsUpdateInterval;

    // Keyboard trap for modal accessibility
    function handleModalKeyboard(e) {
        if (e.key === 'Escape') {
            trackAlertsModal.classList.add('hidden');
            return;
        }

        // Keep focus within modal
        if (e.key === 'Tab') {
            const focusableElements = trackAlertsModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    // Open modal function - call this when "My Alerts" is clicked
    window.openTrackAlertsModal = function () {
        if (!trackAlertsModal) return;

        trackAlertsModal.classList.remove('hidden');
        loadUserAlerts(); // Fetch and display alerts

        // Set focus for accessibility
        const firstButton = trackAlertsModal.querySelector('button');
        if (firstButton) setTimeout(() => firstButton.focus(), 100);

        // Add keyboard trap for accessibility
        document.addEventListener('keydown', handleModalKeyboard);
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

    // Load alerts with filtering and pagination
    async function loadUserAlerts(page = 1) {
        if (!alertsList) return;

        try {
            const filter = filterSelect?.value || 'all';
            const sort = sortSelect?.value || 'date-desc';

            // Show loading state
            alertsList.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i></div>';
            alertsList.setAttribute('aria-busy', 'true');

            // Get the auth token
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("User not authenticated");
            }

            // Fetch alerts from API with authentication and retry
            const response = await fetchWithRetry(`/api/price-alerts?filter=${filter}&sort=${sort}&page=${page}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Handle unauthorized or other error responses
                if (response.status === 401) {
                    // Clear invalid token and show auth modal
                    localStorage.removeItem("token");
                    localStorage.removeItem("username");
                    localStorage.removeItem("userEmail");

                    // Close this modal
                    trackAlertsModal.classList.add('hidden');
                    document.removeEventListener('keydown', handleModalKeyboard);

                    // Show auth modal
                    if (window.showAuthModal) {
                        window.showAuthModal();
                    }
                    throw new Error("Authentication required");
                }
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Clear aria-busy state
            alertsList.removeAttribute('aria-busy');

            // Clear previous alerts
            alertsList.innerHTML = '';

            if (!data.alerts || data.alerts.length === 0) {
                // Show empty state
                if (noAlertsMessage) {
                    alertsList.appendChild(noAlertsMessage.cloneNode(true));
                    const emptyState = alertsList.querySelector('.empty-state');
                    if (emptyState) {
                        emptyState.classList.remove('hidden');
                        
                        // Add event listener to close button
                        const browseBtn = emptyState.querySelector('.btn-primary');
                        if (browseBtn) {
                            browseBtn.textContent = "Browse Products";
                            browseBtn.addEventListener('click', function() {
                                trackAlertsModal.classList.add('hidden');
                                document.removeEventListener('keydown', handleModalKeyboard);
                            });
                        }
                    }
                } else {
                    alertsList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-bell-slash"></i>
                            <p>You don't have any price alerts set</p>
                            <button class="btn-primary">Browse Products</button>
                        </div>
                    `;
                    
                    // Add event listener to the newly created button
                    const browseBtn = alertsList.querySelector('.btn-primary');
                    if (browseBtn) {
                        browseBtn.addEventListener('click', function() {
                            trackAlertsModal.classList.add('hidden');
                            document.removeEventListener('keydown', handleModalKeyboard);
                        });
                    }
                }

                // Update pagination
                const currentPageEl = document.getElementById('currentPage');
                const totalPagesEl = document.getElementById('totalPages');

                if (currentPageEl) currentPageEl.textContent = '0';
                if (totalPagesEl) totalPagesEl.textContent = '0';

                if (paginationBtns && paginationBtns.length >= 2) {
                    paginationBtns[0].disabled = true;
                    paginationBtns[1].disabled = true;
                }
            } else {
                // Hide empty state and render alerts
                data.alerts.forEach(alert => renderAlertItem(alert));

                // Update pagination
                const currentPageEl = document.getElementById('currentPage');
                const totalPagesEl = document.getElementById('totalPages');

                if (currentPageEl) currentPageEl.textContent = data.currentPage || 1;
                if (totalPagesEl) totalPagesEl.textContent = data.totalPages || 1;

                if (paginationBtns && paginationBtns.length >= 2) {
                    paginationBtns[0].disabled = (data.currentPage || 1) <= 1;
                    paginationBtns[1].disabled = (data.currentPage || 1) >= (data.totalPages || 1);
                }

                // If there's a "browse products" button in an empty state, add handler
                const browseBtn = alertsList.querySelector('.empty-state .btn-primary');
                if (browseBtn) {
                    browseBtn.addEventListener('click', function () {
                        trackAlertsModal.classList.add('hidden');
                        document.removeEventListener('keydown', handleModalKeyboard);
                        window.location.href = '/products';
                    });
                }
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

    // Render single alert item
    function renderAlertItem(alert) {
        if (!alertTemplate || !alertsList) return;

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
            if (viewLink) viewLink.href = `/product/${alert.product.id}`;

            // Add to DOM
            alertsList.appendChild(alertItem);
        } catch (error) {
            logError(error, 'renderAlertItem');
        }
    }

    // Edit alert
    // Update the editAlert function
    function editAlert(id, alertData) {
        // First fetch the latest product data
        const token = localStorage.getItem("token");
        if (!token) return;

        // Close this modal
        trackAlertsModal.classList.add('hidden');
        document.removeEventListener('keydown', handleModalKeyboard);

        // Fetch the product using the product ID from the alert
        fetch(`/api/products/${alertData.product.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(productData => {
                // Add the existing alert data to be used for pre-filling
                productData._existingAlert = {
                    id: id,
                    targetPrice: alertData.targetPrice,
                    email: alertData.email
                };

                // Show price alarm modal with pre-filled data
                if (window.showPriceAlarmModal) {
                    window.showPriceAlarmModal(productData);
                }
            })
            .catch(err => {
                logError(err, 'editAlert');
                // If failed to get product, try with the data we have
                if (window.showPriceAlarmModal) {
                    const minimalProductData = {
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
                    window.showPriceAlarmModal(minimalProductData);
                }
            });
    }

    // Delete alert with confirmation dialog
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
                    // Clear this alert from cache
                    apiCache.delete(`/api/price-alerts`);

                    // Show success message
                    const successMsg = document.createElement('div');
                    successMsg.className = 'success-message';
                    successMsg.textContent = 'Alert deleted successfully';

                    alertsList.prepend(successMsg);
                    setTimeout(() => {
                        if (successMsg.parentNode) {
                            successMsg.parentNode.removeChild(successMsg);
                        }
                    }, 3000);

                    // Reload alerts
                    loadUserAlerts();

                    // Also update the badge after successful deletion
                    updateAlertsBadge();
                } else {
                    throw new Error('Failed to delete alert');
                }
            } catch (error) {
                logError(error, 'deleteAlert');
                alert('Failed to delete the price alert. Please try again.');
            }
        }
    }

    // Pagination handlers
    if (paginationBtns && paginationBtns.length >= 2) {
        paginationBtns[0].addEventListener('click', function () {
            if (!this.disabled) {
                const currentPageEl = document.getElementById('currentPage');
                if (currentPageEl) {
                    const currentPage = parseInt(currentPageEl.textContent);
                    if (!isNaN(currentPage)) {
                        loadUserAlerts(currentPage - 1);
                    }
                }
            }
        });

        paginationBtns[1].addEventListener('click', function () {
            if (!this.disabled) {
                const currentPageEl = document.getElementById('currentPage');
                if (currentPageEl) {
                    const currentPage = parseInt(currentPageEl.textContent);
                    if (!isNaN(currentPage)) {
                        loadUserAlerts(currentPage + 1);
                    }
                }
            }
        });
    }

    // Start alerts polling for real-time updates
    function startAlertsPolling() {
        // Clear any existing interval
        if (alertsUpdateInterval) clearInterval(alertsUpdateInterval);

        // Check for updates every 5 minutes
        alertsUpdateInterval = setInterval(() => {
            // Only poll if user is authenticated
            if (localStorage.getItem("token")) {
                updateAlertsBadge();

                // If alerts modal is open, refresh its content
                if (trackAlertsModal && !trackAlertsModal.classList.contains('hidden')) {
                    loadUserAlerts();
                }
            } else {
                // Stop polling if user is not authenticated
                clearInterval(alertsUpdateInterval);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Start polling when the page loads
    startAlertsPolling();

    // Add cleanup when page is unloaded
    window.addEventListener('beforeunload', () => {
        if (alertsUpdateInterval) clearInterval(alertsUpdateInterval);
    });

    // Update the alerts badge immediately
    updateAlertsBadge();
});

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