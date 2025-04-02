// Import from auth.js and price-alarm.js
import { showGlobalMessage, showAuthModal } from './auth.js';
import { showPriceAlarmModal } from './price-alarm.js';

/**
 * Attaches all necessary event listeners to a product card
 * @param {HTMLElement} productCard - The product card element
 * @param {boolean} isFavorite - Whether this is a favorite card (has delete button)
 */
function attachProductEventListeners(productCard, isFavorite = false) {  
  // 1. Compare button functionality
  const compareBtn = productCard.querySelector('.scales-button');
  const comparisonPanel = productCard.querySelector('.comparison-panel');
  const closePanel = productCard.querySelector('.close-panel');
  // Check if elements exist before adding event listeners  
  if (compareBtn && comparisonPanel && closePanel) {
    // Make the event listener more robust
    compareBtn.addEventListener('click', (event) => {
      console.log("Compare button clicked");
      event.preventDefault();
      event.stopPropagation();

      // Force the panel to be visible
      comparisonPanel.style.display = "block"; 
      comparisonPanel.classList.add('active');
      compareBtn.classList.add('active');
    });

    closePanel.addEventListener('click', (event) => {
      console.log("Close button clicked");
      event.preventDefault();
      event.stopPropagation();
      comparisonPanel.classList.remove('active');
      compareBtn.classList.remove('active');
    });
  }

  // 2. Merchant list items click handling
  const merchantItems = productCard.querySelectorAll('.merchant-list li');
  merchantItems.forEach(item => {
    item.addEventListener('click', function() {
      const url = this.dataset.url;
      if (url) {
        console.log("Opening URL:", url);
        window.open(url, '_blank');
      }
    });
  });

  // 3. Alarm button interaction
  const alarmBtn = productCard.querySelector('.alarm-button');
  if (alarmBtn) {
    alarmBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Get product data
      const productEl = e.target.closest('.product');
      if (!productEl) return;
      
      // Gather all product info needed for the modal
      const productId = productEl.dataset.productId;
      const brandEl = productEl.querySelector(".brand");
      const modelEl = productEl.querySelector(".model");
      const priceEl = productEl.querySelector(".price");
      const imageEl = productEl.querySelector(".product-image");
      
      if (!brandEl || !modelEl || !priceEl || !imageEl) {
        if (window.showGlobalMessage) {
          window.showGlobalMessage('Could not gather product information', true);
        }
        return;
      }
      
      // Prepare product data object
      const productData = {
        _id: productId,
        brand: brandEl.textContent,
        model: modelEl.textContent,
        cheapest_price: priceEl.textContent.replace('Ksh ', ''),
        model_image: imageEl.src
      };
      
      // Check if user is authenticated
      const token = localStorage.getItem("token");
      if (!token) {
        // Store product data before showing auth modal
        sessionStorage.setItem("pendingPriceAlarmProduct", JSON.stringify(productData));
        sessionStorage.setItem("showPriceAlarmAfterLogin", "true");

        if (window.showAuthModal) {
          window.showAuthModal();
        } else {
          console.error("Auth modal function not available");
        }
        return;
      }
    
      
      // Call the showPriceAlarmModal function
      if (window.showPriceAlarmModal) {
        window.showPriceAlarmModal(productData);
      } else {
        console.error("Price alarm modal function not available");
      }
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

document.addEventListener("DOMContentLoaded", () => {
  // Attach listeners to all initial products
  document.querySelectorAll('.product').forEach(product => {
    attachProductEventListeners(product);
  });

  // Back button in favorites view
  document.getElementById("favorites-back-btn")?.addEventListener("click", () => {
    document.getElementById("favorites-view").style.display = "none";
    document.getElementById("main-view").style.display = "block";
    window.scrollTo(0, 0); // Scroll to top when returning to main view
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

/**
 * Extract essential product details from a product card.
 */
function getProductDataFromCard(productEl) {
  const productId = productEl.dataset.productId;
  const brand = productEl.querySelector(".brand")?.innerText || "";
  const model = productEl.querySelector(".model")?.innerText || "";
  return {
    _id: productId,
    brand: brand,
    model: model,
  };
}

/**
 * Add product to favorites.
 */
async function addToFavorites(productData, heartIcon) {
  const token = localStorage.getItem("token");
  if (!token) {
    // We'll call a function from auth.js
    showAuthModal();
    return;
  }
  try {
    const response = await fetch("http://127.0.0.1:8000/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
  const token = localStorage.getItem("token");
  if (!token) return;
  
  try {
    const response = await fetch("http://127.0.0.1:8000/api/favorites", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const favorites = await response.json();
    
    // Show favorites view and reset scroll position
    document.getElementById("main-view").style.display = "none";
    document.getElementById("favorites-view").style.display = "block";
    window.scrollTo(0, 0); // Scroll to top
    
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
  productEl.dataset.productId = product._id;
  
  const img = productEl.querySelector(".product-image");
  if (img) {
    img.src = product.model_image;
    img.alt = `${product.brand} ${product.model}`;
  }
  
  const brandEl = productEl.querySelector(".brand");
  if (brandEl) brandEl.textContent = product.brand;
  
  const modelEl = productEl.querySelector(".model");
  if (modelEl) modelEl.textContent = product.model;
  
  const priceEl = productEl.querySelector(".price");
  if (priceEl) priceEl.textContent = `Ksh ${product.cheapest_price}`;
  
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
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/favorites/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
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

