import { showGlobalMessage, showAuthModal, sanitizeInput } from './auth.js';
import { secureApiCall } from './api-utils.js';
import { attachProductEventListeners } from './product.js';

// DOM Elements
const favoritesModal = document.getElementById('favorites-modal');
const favoritesContainer = document.getElementById('favorites-container');
const favoritesCountEl = document.getElementById('favorites-count');
const closeModalBtn = document.querySelector('.fav-close-modal');

/**
 * Initialize favorites functionality
 */
export function initFavorites() {
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
        if (e.key === 'Escape' && favoritesModal && favoritesModal.style.display === 'block') {
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
    if (favoritesModal) {
        favoritesModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    }
}

/**
 * Hide the favorites modal
 */
function hideFavoritesModal() {
    if (favoritesModal) {
        favoritesModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
}

/**
 * Load favorites and show modal
 */
export async function loadAndShowFavorites() {
    try {
        const response = await secureApiCall("favorites");

        if (!response.ok) {
            // If unauthorized, handle gracefully
            if (response.status === 401) {
                showAuthModal();
                return;
            }
            throw new Error(`Failed to load favorites: ${response.status}`);
        }

        const favorites = await response.json();

        // Update favorites count
        if (favoritesCountEl) {
            favoritesCountEl.textContent = favorites.length;
        }

        // Render favorites and show modal
        renderFavorites(favorites);
        showFavoritesModal();

    } catch (error) {
        console.error("Failed to load favorites:", error);
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
    // Sanitize all product data before rendering
    const sanitizedProduct = {
        _id: sanitizeInput(product._id),
        brand: sanitizeInput(product.brand),
        model: sanitizeInput(product.model),
        cheapest_price: sanitizeInput(String(product.cheapest_price)),
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