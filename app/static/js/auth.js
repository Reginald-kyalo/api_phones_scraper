// Get elements
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const signUpForm = document.getElementById("signUpForm");
const modalClose = document.getElementById("modalClose");
const showSignUpLink = document.getElementById("showSignUp");
const showLoginLink = document.getElementById("showLogin");

const loginFormEl = document.getElementById("loginFormEl");
const signUpFormEl = document.getElementById("signUpFormEl");

const loginError = document.getElementById("loginError");
const signUpError = document.getElementById("signUpError");

// Header buttons
const loginBtn = document.querySelector(".btn-login");
const favBtn = document.querySelector(".btn-favourites"); // Favorites button in header
// Store the original innerHTML of the login button
const originalLoginBtnHTML = loginBtn.innerHTML;

// Function to update UI after login/signup with a welcome button (with logout)
function updateUserUI(username) {
  if (loginBtn) {
    loginBtn.style.display = "none";
  }
  const headerRight = document.querySelector(".header__right");
  let welcomeBtn = document.getElementById("welcomeBtn");
  if (!welcomeBtn) {
    welcomeBtn = document.createElement("button");
    welcomeBtn.id = "welcomeBtn";
    welcomeBtn.className = "btn btn-welcome";
    headerRight.appendChild(welcomeBtn);
  }
  welcomeBtn.innerHTML = `Welcome ${username} <i class="fas fa-sign-out-alt" style="margin-left: 8px;"></i>`;
  welcomeBtn.onclick = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    welcomeBtn.remove();
    if (loginBtn) {
      loginBtn.style.display = "block";
      loginBtn.innerHTML = originalLoginBtnHTML;
    }
  };
}

// Function to show a global message at the top of the page
function showGlobalMessage(message, isError = false) {
  const globalMsgEl = document.getElementById("globalMessage");
  if (!globalMsgEl) return;
  globalMsgEl.innerText = message;
  if (isError) {
    globalMsgEl.classList.add("error");
  } else {
    globalMsgEl.classList.remove("error");
  }
  globalMsgEl.style.display = "block";
  setTimeout(() => {
    globalMsgEl.style.display = "none";
  }, 3000);
}

/**
 * Extract essential product details from a product card.
 * We gather _id, brand, model, and model_image only.
 * The cheapest_price and price_comparison will be populated server-side.
 */
function getProductDataFromCard(productEl) {
  const productId = productEl.dataset.productId;
  const brand = productEl.querySelector(".brand")?.innerText || "";
  const model = productEl.querySelector(".model")?.innerText || "";
  const modelImage = productEl.querySelector(".product-image")?.src || "";
  return {
    _id: productId,
    brand: brand,
    model: model,
    model_image: modelImage
  };
}

/**
 * Clone and populate the product template.
 * This uses the hidden <template id="product-template"> embedded in base.html.
 */
function renderProductCard(product) {
  const template = document.getElementById("product-template");
  if (!template) {
    console.error("Product template not found");
    return null;
  }
  const clone = template.content.cloneNode(true);
  const productEl = clone.querySelector(".product");
  if (productEl) {
    productEl.dataset.productId = product._id;
  }
  const img = clone.querySelector(".product-image");
  if (img) {
    img.src = product.model_image;
    img.alt = `${product.brand} ${product.model}`;
  }
  const brandEl = clone.querySelector(".brand");
  if (brandEl) {
    brandEl.textContent = product.brand;
  }
  const modelEl = clone.querySelector(".model");
  if (modelEl) {
    modelEl.textContent = product.model;
  }
  const priceEl = clone.querySelector(".price");
  if (priceEl) {
    priceEl.textContent = `Ksh ${product.cheapest_price}`;
  }
  
  // Populate the price comparison list if available
  if (product.price_comparison && product.price_comparison.length) {
    const comparisonList = clone.querySelector(".merchant-list");
    if (comparisonList) {
      comparisonList.innerHTML = product.price_comparison
        .map(pc => `
          <li data-url="${pc.url}">
            <span class="merchant-name">${pc.store}</span>
            <span class="merchant-price">Ksh ${pc.price}</span>
          </li>
        `)
        .join("");
    }
  }
  
  return clone;
}


// Function to add product to favorites (sending essential product details)
async function addToFavorites(productData, heartIcon) {
  const token = localStorage.getItem("token");
  if (!token) {
    authModal.classList.remove("hidden");
    loginForm.classList.remove("hidden");
    signUpForm.classList.add("hidden");
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

// Function to load the user's favorites via GET endpoint
async function loadFavorites() {
  const token = localStorage.getItem("token");
  if (!token) {
    showGlobalMessage("Please log in to view favorites", true);
    return;
  }
  try {
    const response = await fetch("http://127.0.0.1:8000/api/favorites", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const favorites = await response.json();
    renderFavorites(favorites);
  } catch (error) {
    console.error("Failed to load favorites:", error);
    showGlobalMessage("Failed to load favorites", true);
  }
}

// Function to render favorites using the product template
function renderFavorites(favorites) {
  const favContainer = document.getElementById("favorites-container");
  favContainer.innerHTML = ""; // Clear previous content
  if (!favorites.length) {
    favContainer.innerHTML = `<p class="empty-favorites">You have no favorites yet. Start adding your favorite products!</p>`;
    return;
  }
  favorites.forEach((fav) => {
    const productCard = renderProductCard(fav);
    if (productCard) {
      favContainer.appendChild(productCard);
      const deleteBtn = productCard.querySelector(".favorite-delete");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteFavorite(fav._id, productCard);
        });
      }
    }
  });
}

// Function to delete a favorite via DELETE endpoint
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

// Attach event listeners on page load
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const storedUsername = localStorage.getItem("username");
  if (token && storedUsername) {
    updateUserUI(storedUsername);
  }
  // Attach event listener for heart icons in the main product view
  document.querySelectorAll(".heart-icon").forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const productEl = e.target.closest(".product");
      if (!productEl) return;
      const productData = getProductDataFromCard(productEl);
      addToFavorites(productData, icon);
    });
  });
});

// Event listener for login button in header
loginBtn.addEventListener("click", () => {
  authModal.classList.remove("hidden");
  loginForm.classList.remove("hidden");
  signUpForm.classList.add("hidden");
});

// Event listener for favorites button in header
favBtn.addEventListener("click", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    authModal.classList.remove("hidden");
    loginForm.classList.remove("hidden");
    signUpForm.classList.add("hidden");
    return;
  }
  document.getElementById("main-view").style.display = "none";
  document.getElementById("favorites-view").style.display = "block";
  loadFavorites();
});

// Back button in favorites view to return to main view
document.getElementById("favorites-back-btn")?.addEventListener("click", () => {
  document.getElementById("favorites-view").style.display = "none";
  document.getElementById("main-view").style.display = "block";
});

// Modal close event listeners
modalClose.addEventListener("click", () => {
  authModal.classList.add("hidden");
});
window.addEventListener("click", (event) => {
  if (event.target === authModal) {
    authModal.classList.add("hidden");
  }
});

// Toggle to show sign up form
showSignUpLink.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.add("hidden");
  signUpForm.classList.remove("hidden");
  loginError.innerText = "";
});

// Toggle to show login form
showLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  signUpForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  signUpError.innerText = "";
});

// Handle login form submission
loginFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  try {
    const response = await fetch("http://127.0.0.1:8000/api/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      const username = email.split("@")[0];
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      authModal.classList.add("hidden");
      updateUserUI(username);
    } else {
      loginError.innerText = data.detail || "Login failed. Please try again.";
    }
  } catch (err) {
    loginError.innerText = "An error occurred. Please try again later.";
  }
});

// Handle sign-up form submission
signUpFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signUpEmail").value;
  const password = document.getElementById("signUpPassword").value;
  const username = email.split("@")[0];
  try {
    const response = await fetch("http://127.0.0.1:8000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      authModal.classList.add("hidden");
      updateUserUI(username);
    } else {
      signUpError.innerText = data.detail || "Sign up failed. Please try again.";
    }
  } catch (err) {
    signUpError.innerText = "An error occurred. Please try again later.";
  }
});
