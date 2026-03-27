// Import from auth.js, price-alarm.js, and api-utils.js
import { showGlobalMessage, showAuthModal, sanitizeInput } from './auth.js';
import { showPriceAlarmModal } from './price-alarm.js';
import { secureApiCall } from './api-utils.js';

/**
 * Attaches all necessary event listeners to a product card
 * @param {HTMLElement} productCard - The product card element
 * @param {HTMLElement} heartIcon - The heart icon element
 */
export function attachProductEventListeners(productCard, isFavorite = false) {
  // 1. Compare button functionality
  const compareBtn = productCard.querySelector('.scales-button');
  const comparisonPanel = productCard.querySelector('.comparison-panel');
  const closePanel = productCard.querySelector('.close-panel');

  if (compareBtn && comparisonPanel && closePanel) {
    compareBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      comparisonPanel.style.display = "block";
      comparisonPanel.classList.add('active');
      compareBtn.classList.add('active');
    });

    closePanel.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      comparisonPanel.classList.remove('active');
      compareBtn.classList.remove('active');
    });
  }

  // 2. Merchant list items click handling - Add URL sanitization
  const merchantItems = productCard.querySelectorAll('.merchant-list li');
  merchantItems.forEach(item => {
    item.addEventListener('click', function (e) {
      // Don't handle click if it's on the external link icon
      if (e.target.closest('.external-link-icon')) {
        return; // Let the link handle its own click
      }
      
      const url = this.dataset.url;
      if (url) {
        // Validate URL to prevent malicious redirects
        if (isValidUrl(url)) {
          window.open(url, '_blank', 'noopener,noreferrer'); // Add security attributes
        } else {
          console.error("Invalid URL detected:", url);
        }
      }
    });
  });

  // 3. Alarm button interaction
  const alarmBtn = productCard.querySelector('.alarm-button');
  if (alarmBtn) {
    alarmBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const productEl = e.target.closest('.product');
      if (!productEl) return;

      const productData = getProductDataFromCard(productEl);
      if (!productData) {
        console.error("Product data not found");
        return;
      }

      // Show price alarm modal directly without authentication check
      showPriceAlarmModal(productData);
    });
  }

  // 4. Heart icon (add to favorites) functionality
  const heartIcon = productCard.querySelector('.heart-icon');
  if (heartIcon) {
    heartIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const productEl = e.target.closest('.product');
      if (!productEl) return;

      if (isFavorite) {
        // In favorites view - delete functionality
        const productId = productEl.dataset.productId;
        deleteFavorite(productId, productEl);
      } else {
        // In main view - add to favorites functionality
        const productData = getProductDataFromCard(productEl, true);
        addToFavorites(productData, heartIcon);
      }
    });
  }
}

/**
 * Add product to favorites.
 */
export async function addToFavorites(productData, heartIcon) {
  try {
    // Check if user is authenticated
    const authCheckResponse = await secureApiCall("verify-session");

    if (!authCheckResponse.ok) {
      // User is NOT authenticated - save to localStorage instead
      console.log("User not authenticated, saving to localStorage");
      
      // Get existing favorites from localStorage
      const localFavorites = JSON.parse(localStorage.getItem("localFavorites") || "[]");
      
      // Check if already exists
      const alreadyExists = localFavorites.some(fav => fav.product_id === productData.product_id);
      if (alreadyExists) {
        showGlobalMessage("Already in your favorites!", true);
        return;
      }
      
      // Add to localStorage
      localFavorites.push(productData);
      localStorage.setItem("localFavorites", JSON.stringify(localFavorites));
      
      if (heartIcon) {
        heartIcon.classList.add("favorited");
      }
      showGlobalMessage("Favorite saved locally! Sign in to sync across devices.");
      
      // Notify favorites.js that a new favorite was added
      document.dispatchEvent(new CustomEvent('favoriteAdded', {
        detail: { product: productData }
      }));
      return;
    }

    // User IS authenticated - save to server
    const response = await secureApiCall("favorites", {
      method: "POST",
      body: JSON.stringify({ product: productData }),
    });

    const data = await response.json();

    if (response.ok) {
      if (heartIcon) {
        heartIcon.classList.add("favorited");
      }
      showGlobalMessage("Favorite added!");
      
      // Notify favorites.js that a new favorite was added (using custom event)
      document.dispatchEvent(new CustomEvent('favoriteAdded', {
        detail: { product: productData }
      }));
    } else {
      showGlobalMessage(data.detail || "Item might already be in favorites", true);
    }
  } catch (err) {
    console.error("An error occurred:", err);
    showGlobalMessage("An error occurred", true);
  }
}

/**
 * Delete a favorite product.
 */
export async function deleteFavorite(productId, productCard) {
  try {
    // Check if this is a localStorage-only favorite
    const localFavorites = JSON.parse(localStorage.getItem("localFavorites") || "[]");
    const localIndex = localFavorites.findIndex(fav => (fav.product_id || fav._id) === productId);
    
    let isLocalOnly = localIndex !== -1;
    
    // Try to delete from server
    try {
      const response = await secureApiCall(`favorites/${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        isLocalOnly = false; // Successfully deleted from server
      } else if (response.status === 401) {
        // Not authenticated, must be localStorage only
        isLocalOnly = true;
      }
    } catch (error) {
      console.warn("Could not delete from server:", error);
      // Assume localStorage only
    }
    
    // Remove from localStorage if present
    if (localIndex !== -1) {
      localFavorites.splice(localIndex, 1);
      localStorage.setItem("localFavorites", JSON.stringify(localFavorites));
    }
    
    // Remove the card with animation
    productCard.classList.add('fade-out');
    
    // Wait for animation to complete before removing
    setTimeout(() => {
      productCard.remove();
      
      // Notify favorites.js that an item was deleted (using custom event)
      document.dispatchEvent(new CustomEvent('favoriteDeleted', {
        detail: { productId }
      }));
    }, 300);
    
    // Update heart icons for this product in all other views
    document.querySelectorAll(`.product[data-product-id="${productId}"] .heart-icon`)
      .forEach(heartIcon => {
        heartIcon.classList.remove('favorited');
      });
    
    showGlobalMessage("Favorite removed!");
    
  } catch (error) {
    console.error("Error removing favorite:", error);
    showGlobalMessage("An error occurred", true);
  }
}

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

/**
 * Validate URL to prevent malicious redirects
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is valid
 */
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    // Allow only http and https protocols
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * Extract essential product details from a product card.
 */
export function getProductDataFromCard(productEl, isFavorite = false) {
  const productId = productEl.dataset.productId;
  const brand = productEl.querySelector(".brand")?.innerText || "";
  const model = productEl.querySelector(".model")?.innerText || "";
  const price = productEl.querySelector(".price")?.innerText || "";
  const image = productEl.querySelector(".product-image")?.src || "";
  
  console.log("getProductDataFromCard - raw price:", price);
  
  // Initialize price_comparison outside the if block
  let price_comparison = [];
  
  if (isFavorite) {
    const merchantListEl = productEl.querySelector(".merchant-list");

    if (merchantListEl) {
      const merchantItems = merchantListEl.querySelectorAll("li");
      merchantItems.forEach(item => {
        price_comparison.push({
          store: (item.querySelector(".merchant-name")?.innerText || "").trim(),
          price: (item.querySelector(".merchant-price")?.innerText || "").replace('Ksh ', '').trim(),
          product_url: item.dataset.url || ""
        });
      });
    }
  }
  
  // Parse price: extract numeric value, removing currency and commas
  const cleanedPrice = price.replace(/[^\d.,]/g, '').replace(',', '');
  const parsedPrice = parseFloat(cleanedPrice) || 0;
  console.log("Price parsing:", { raw: price, cleaned: cleanedPrice, parsed: parsedPrice });
  
  return {
    product_id: sanitizeInput(productId),
    brand: sanitizeInput(brand),
    model: sanitizeInput(model),
    current_price: parsedPrice,
    model_image: image, // URLs should be validated separately
    price_comparison: price_comparison
  };
}

// Document ready functionality remains the same
document.addEventListener("DOMContentLoaded", () => {
  // Attach listeners to all initial products
  document.querySelectorAll('.product').forEach(product => {
    attachProductEventListeners(product);
  });

  // Add click handler to document to close active comparison panels when clicking outside
  document.addEventListener('click', (event) => {
    // Find any active comparison panels
    const activePanel = document.querySelector('.comparison-panel.active');
    const activeButton = document.querySelector('.scales-button.active');

    // If there's an active panel and the click was outside of it
    if (activePanel && !activePanel.contains(event.target)) {
      // Also make sure the click wasn't on the scales button itself
      if (!activeButton || !activeButton.contains(event.target)) {
        activePanel.classList.remove('active');
        if (activeButton) {
          activeButton.classList.remove('active');
        }
      }
    }
  });
});

window.getProductDataFromCard = getProductDataFromCard;