// Import from auth.js, price-alarm.js, and api-utils.js
import { showGlobalMessage, showAuthModal, sanitizeInput } from './auth.js';
import { showPriceAlarmModal } from './price-alarm.js';
import { secureApiCall } from './api-utils.js';

/**
 * Attaches all necessary event listeners to a product card
 * @param {HTMLElement} productCard - The product card element
 * @param {boolean} isFavorite - Whether this is a favorite card (has delete button)
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
    item.addEventListener('click', function () {
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

      // Gather product info safely
      const productId = productEl.dataset.productId;
      const brandEl = productEl.querySelector(".brand");
      const modelEl = productEl.querySelector(".model");
      const priceEl = productEl.querySelector(".price");
      const imageEl = productEl.querySelector(".product-image");

      if (!brandEl || !modelEl || !priceEl || !imageEl) {
        showGlobalMessage('Could not gather product information', true);
        return;
      }

      // Sanitize all inputs
      const productData = {
        _id: sanitizeInput(productId),
        brand: sanitizeInput(brandEl.textContent),
        model: sanitizeInput(modelEl.textContent),
        cheapest_price: sanitizeInput(priceEl.textContent.replace('Ksh ', '')),
        model_image: imageEl.src // URLs should be validated separately
      };

      // Check if user is authenticated - use session verification instead of token
      checkAuthenticated().then(isAuthenticated => {
        if (!isAuthenticated) {
          // Store product data before showing auth modal
          sessionStorage.setItem("pendingPriceAlarmProduct", JSON.stringify(productData));
          sessionStorage.setItem("showPriceAlarmAfterLogin", "true");

          showAuthModal();
          return;
        }
        console.log('calling showpricealarmmodal');
        // Show price alarm modal if authenticated
        showPriceAlarmModal(productData);
      }).catch(err => {
        console.error("Auth check failed:", err);
        showAuthModal();
      });
    });
  }

  // 4. Heart icon (dual functionality - add to favorites OR delete favorite)
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
        const productData = getProductDataFromCard(productEl);
        addToFavorites(productData, heartIcon);
      }
    });
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
export function getProductDataFromCard(productEl) {
  const productId = productEl.dataset.productId;
  const brand = productEl.querySelector(".brand")?.innerText || "";
  const model = productEl.querySelector(".model")?.innerText || "";
  const price = productEl.querySelector(".price")?.innerText || "";
  const image = productEl.querySelector(".product-image")?.src || "";
  return {
    _id: sanitizeInput(productId),
    brand: sanitizeInput(brand),
    model: sanitizeInput(model),
    cheapest_price: sanitizeInput(price.replace('Ksh ', '')),
    model_image: image // URLs should be validated separately
  };
}

/**
 * Add product to favorites.
 */
export async function addToFavorites(productData, heartIcon) {
  try {
    // First check if user is authenticated
    const authCheckResponse = await secureApiCall("verify-session");

    if (!authCheckResponse.ok) {
      // User is not authenticated - store pending favorite and show auth modal
      localStorage.setItem("pendingFavorite", JSON.stringify(productData));
      showAuthModal();
      return;
    }

    // User is authenticated - proceed with adding to favorites
    const response = await secureApiCall("favorites", {
      method: "POST",
      body: JSON.stringify({ product: productData }),
    });

    const data = await response.json();

    if (response.ok) {
      heartIcon.classList.add("favorited");
      showGlobalMessage("Favorite added!");
    } else {
      showGlobalMessage(data.detail || "Item might already be in favorites", true);
    }
  } catch (err) {
    console.error("An error occurred:", err);
    showGlobalMessage("An error occurred", true);
  }
}

/**
 * Load user's favorites from API.
 */
export async function loadFavorites() {
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

    // Show favorites view and reset scroll position
    document.getElementById("main-view").style.display = "none";
    document.getElementById("favorites-view").style.display = "block";
    window.scrollTo(0, 0); // Scroll to top

    const favoritesBackBtn = document.getElementById("favorites-back-btn");
    // Simply ensure the button exists without recreating it
    if (favoritesBackBtn) {
      // Remove any existing event listeners to avoid duplicates
      favoritesBackBtn.replaceWith(favoritesBackBtn.cloneNode(true));
      
      // Get the fresh reference
      const freshBtn = document.getElementById("favorites-back-btn");
      
      // Add the event listener
      freshBtn.addEventListener("click", () => {
        document.getElementById("favorites-view").style.display = "none";
        document.getElementById("main-view").style.display = "block";
        window.scrollTo(0, 0); // Scroll to top when returning to main view
      });
    }

    renderFavorites(favorites);
  } catch (error) {
    console.error("Failed to load favorites:", error);
    showGlobalMessage("Failed to load favorites", true);
  }
}

/**
 * Render favorites in the favorites container.
 */
function renderFavorites(favorites) {
  const favContainer = document.getElementById("favorites-container");
  favContainer.innerHTML = ""; // Clear previous content
  if (!favorites.length) {
    favContainer.innerHTML = `<p class="empty-favorites">You have no favorites yet. Start adding your favorite products!</p>`;
    return;
  }
  favorites.forEach((fav) => {
    const productCard = renderProductCard(fav, true);
    if (productCard) {
      favContainer.appendChild(productCard);
      // Use the common function with isFavorite=true
      attachProductEventListeners(productCard, true);
    }
  });
}

/**
 * Render a product card from template.
 */
function renderProductCard(product, isFavorite = false) {
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
            <span class="merchant-name">${pc.store}</span>
            <span class="merchant-price">Ksh ${pc.price}</span>
          </li>`)
        .join("");
    }
  }

  // Change heart icon to trash icon for favorites
  if (isFavorite) {
    const heartIcon = productEl.querySelector(".heart-icon");
    if (heartIcon) {
      heartIcon.innerHTML = '<i class="fas fa-trash"></i>';
      heartIcon.classList.add("delete-icon");
    }
  }

  // Return the product element instead of the fragment
  return productEl;
}

/**
 * Delete a favorite product.
 */
async function deleteFavorite(productId, productCard) {
  try {
    const response = await secureApiCall(`favorites/${productId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      productCard.remove();
      showGlobalMessage("Favorite removed!");
    } else {
      const data = await response.json();
      showGlobalMessage(data.detail || "Failed to remove favorite", true);
    }
  } catch (error) {
    console.error("Error removing favorite:", error);
    showGlobalMessage("An error occurred", true);
  }
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