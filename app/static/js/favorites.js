import { showGlobalMessage, showAuthModal, sanitizeInput } from './auth.js';
import { secureApiCall } from './api-utils.js';
import { attachProductEventListeners } from './product.js';

// DOM Elements
let favoritesModal;
let favoritesContainer;
let favoritesCountEl;
let closeModalBtn;

// Function to get DOM elements (called after DOM is ready)
function getDOMElements() {
  favoritesModal = document.getElementById('favorites-modal');
  favoritesContainer = document.getElementById('favorites-container');
  favoritesCountEl = document.getElementById('favorites-count');
  closeModalBtn = document.querySelector('.fav-close-modal');
  console.log("DOM elements initialized:", {
    modal: !!favoritesModal,
    container: !!favoritesContainer,
    count: !!favoritesCountEl,
    closeBtn: !!closeModalBtn
  });
}

/**
 * Initialize favorites functionality
 */
export function initFavorites() {
    // Get DOM elements first
    getDOMElements();
    
    // Close modal when clicking the X
    closeModalBtn?.addEventListener('click', () => {
        hideFavoritesModal();
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === favoritesModal) {
            hideFavoritesModal();
        }
    });

    // Handle ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && favoritesModal && !favoritesModal.classList.contains('hidden')) {
            hideFavoritesModal();
        }
    });

    // Listen for favorite deletion events
    document.addEventListener('favoriteDeleted', (e) => {
        handleFavoriteDeleted(e.detail.productId);
    });

    // Listen for favorite addition events
    document.addEventListener('favoriteAdded', (e) => {
        // You could update the count or refresh the list if modal is open
    });
}

/**
 * Handle favorite deletion event
 */
function handleFavoriteDeleted(productId) {
    if (favoritesCountEl) {
        const currentCount = parseInt(favoritesCountEl.textContent) || 0;
        favoritesCountEl.textContent = Math.max(0, currentCount - 1);

        // Show empty message if no favorites left
        if (currentCount - 1 <= 0 && favoritesContainer) {
            favoritesContainer.innerHTML = `
              <p class="empty-favorites">
                You don't have any favorites yet. 
                <br>
                Browse products and click the heart icon to add them here!
              </p>`;
        }
    }
}

/**
 * Show the favorites modal
 */
function showFavoritesModal() {
    console.log("showFavoritesModal called, modal:", !!favoritesModal);
    if (favoritesModal) {
        favoritesModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
        console.log("Modal class after remove hidden:", favoritesModal.className);
    }
}

/**
 * Hide the favorites modal
 */
function hideFavoritesModal() {
    console.log("hideFavoritesModal called, modal:", !!favoritesModal);
    if (favoritesModal) {
        favoritesModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

/**
 * Load favorites and show modal
 */
export async function loadAndShowFavorites() {
    try {
        console.log("loadAndShowFavorites called");
        
        // CRITICAL: Always reinitialize DOM elements - they may not exist yet
        getDOMElements();
        console.log("DOM elements after reinit:", {
            modal: !!favoritesModal,
            container: !!favoritesContainer,
            count: !!favoritesCountEl
        });
        
        if (!favoritesModal || !favoritesContainer) {
            console.error("Critical: favorites modal or container not found in DOM");
            return;
        }
        
        // Get localStorage favorites first
        const localFavorites = JSON.parse(localStorage.getItem("localFavorites") || "[]");
        console.log("LocalStorage favorites count:", localFavorites.length);
        
        // Try to get server favorites
        let serverFavorites = [];
        try {
            const response = await secureApiCall("favorites");
            console.log("API response status:", response.status);

            if (response.ok) {
                serverFavorites = await response.json();
                console.log("Server favorites loaded, count:", serverFavorites.length);
            } else if (response.status !== 401) {
                // Only throw if it's not an auth error
                console.warn("Failed to load server favorites:", response.status);
            }
        } catch (error) {
            console.warn("Could not fetch server favorites:", error);
        }
        
        // Merge favorites: server favorites + localStorage favorites (deduplicated)
        const mergedFavorites = [...serverFavorites];
        const serverIds = new Set(serverFavorites.map(f => f.product_id || f._id));
        
        for (const localFav of localFavorites) {
            const favId = localFav.product_id || localFav._id;
            if (!serverIds.has(favId)) {
                mergedFavorites.push({ ...localFav, isLocal: true });
            }
        }
        
        console.log("Merged favorites total:", mergedFavorites.length);

        // Update favorites count
        if (favoritesCountEl) {
            favoritesCountEl.textContent = mergedFavorites.length;
        }

        // Render favorites and show modal
        renderFavorites(mergedFavorites);
        console.log("About to call showFavoritesModal, modal element:", favoritesModal?.id);
        showFavoritesModal();
        console.log("showFavoritesModal completed");

    } catch (error) {
        console.error("Failed to load favorites - Error details:", error);
        showGlobalMessage("Failed to load favorites", true);
    }
}

/**
 * Render favorites in the favorites container
 * @param {Array} favorites - Array of favorite products
 */
function renderFavorites(favorites) {
    console.log("Rendering favorites:", favorites.length);
    if (!favoritesContainer) return;

    favoritesContainer.innerHTML = ""; // Clear previous content

    if (!favorites.length) {
        favoritesContainer.innerHTML = `
      <p class="empty-favorites">
        You don't have any favorites yet. 
        <br>
        Browse products and click the heart icon to add them here!
      </p>`;
        return;
    }

    favorites.forEach((fav) => {
        const productCard = renderProductCard(fav);
        if (productCard) {
            favoritesContainer.appendChild(productCard);
            // Use the common function with isFavorite=true
            attachProductEventListeners(productCard, true);
        }
    });
}

/**
 * Render a product card from template
 * @param {Object} product - Product data
 * @returns {HTMLElement} The created product card
 */
function renderProductCard(product) {
    // Get price from either cheapest_price (server) or current_price (localStorage)
    const price = product.cheapest_price || product.current_price || 0;
    
    // Sanitize all product data before rendering
    const sanitizedProduct = {
        _id: sanitizeInput(product._id || product.product_id),
        brand: sanitizeInput(product.brand),
        model: sanitizeInput(product.model),
        cheapest_price: sanitizeInput(String(price)),
        model_image: product.model_image // URLs handled separately
    };

    const template = document.getElementById("product-template");
    if (!template) {
        console.error("Product template not found");
        return null;
    }

    // Clone the template
    const clone = template.content.cloneNode(true);

    // Get the actual product element from the clone
    const productEl = clone.querySelector(".product");
    if (!productEl) {
        console.error("No product element found in template");
        return null;
    }

    // Update product data
    productEl.dataset.productId = sanitizedProduct._id;

    const img = productEl.querySelector(".product-image");
    if (img) {
        img.src = sanitizedProduct.model_image;
        img.alt = `${sanitizedProduct.brand} ${sanitizedProduct.model}`;
    }

    const brandEl = productEl.querySelector(".brand");
    if (brandEl) brandEl.textContent = sanitizedProduct.brand;

    const modelEl = productEl.querySelector(".model");
    if (modelEl) modelEl.textContent = sanitizedProduct.model;

    const priceEl = productEl.querySelector(".price");
    if (priceEl) priceEl.textContent = `Ksh ${sanitizedProduct.cheapest_price}`;

    // Populate comparison list
    if (product.price_comparison?.length) {
        const comparisonList = productEl.querySelector(".merchant-list");
        if (comparisonList) {
            comparisonList.innerHTML = product.price_comparison
                .map(pc => `<li data-url="${pc.product_url}">
            <span class="merchant-name">${sanitizeInput(pc.store)}</span>
            <span class="merchant-price">Ksh ${sanitizeInput(pc.price)}</span>
          </li>`)
                .join("");
        }
    }

    // Change heart icon to trash icon for favorites
    const heartIcon = productEl.querySelector(".heart-icon");
    if (heartIcon) {
        heartIcon.innerHTML = '<i class="fas fa-trash"></i>';
        heartIcon.classList.add("delete-icon");
        heartIcon.title = "Remove from favorites";
    }

    return productEl;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initFavorites);