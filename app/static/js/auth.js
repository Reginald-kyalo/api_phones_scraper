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
  // Hide the login button
  if (loginBtn) {
    loginBtn.style.display = "none";
  }
  // Update header to show a welcome button with logout functionality
  const headerRight = document.querySelector(".header__right");
  let welcomeBtn = document.getElementById("welcomeBtn");
  if (!welcomeBtn) {
    welcomeBtn = document.createElement("button");
    welcomeBtn.id = "welcomeBtn";
    welcomeBtn.className = "btn btn-welcome";
    headerRight.appendChild(welcomeBtn);
  }
  welcomeBtn.innerHTML = `Welcome ${username} <i class="fas fa-sign-out-alt" style="margin-left: 8px;"></i>`;

  // Log the user out on click
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

// Function to add product to favorites (triggered by heart icon)
async function addToFavorites(productId, heartIcon) {
  const token = localStorage.getItem("token");
  if (!token) {
    // Not logged in: prompt login modal
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
      body: JSON.stringify({ product_id: productId }),
    });
    const data = await response.json();
    if (response.ok) {
      heartIcon.classList.add("favorited");
      showGlobalMessage("Favorite added!");
    } else {
      showGlobalMessage(
        data.detail || "Item might already be in favorites",
        true
      );
    }
  } catch (err) {
    console.error("An error occurred:", err);
    showGlobalMessage("An error occurred", true);
  }
}

// Favorites view functions

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
    // Create a product card reusing your product template
    const productCard = document.createElement("div");
    productCard.className = "product";
    productCard.dataset.productId = fav._id; // Assuming _id is already a string from backend

    productCard.innerHTML = `
      <div class="product-inner">
        <figure>
          <img src="${fav.model_image}" alt="${fav.brand} ${fav.model}" class="product-image">
          <div class="heart-icon favorited">
            <svg viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
                        2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 
                        14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 
                        11.54L12 21.35z"></path>
            </svg>
          </div>
          <button class="favorite-delete" aria-label="Remove from favorites">
            <i class="fas fa-trash-alt"></i>
          </button>
        </figure>
        <div class="product-description">
          <div class="info">
            <h2 class="brand">${fav.brand}</h2>
            <p class="model">${fav.model}</p>
          </div>
          <div class="price">Ksh ${fav.cheapest_price}</div>
        </div>
      </div>
    `;
    favContainer.appendChild(productCard);

    // Attach delete listener for the trash can button
    const deleteBtn = productCard.querySelector(".favorite-delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFavorite(fav._id, productCard);
    });
  });
}

// Function to delete a favorite via DELETE endpoint
async function deleteFavorite(productId, productCard) {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/favorites/${productId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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
      const productId = productEl.dataset.productId;
      addToFavorites(productId, icon);
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
  // Hide the main view and show the favorites view
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
      signUpError.innerText =
        data.detail || "Sign up failed. Please try again.";
    }
  } catch (err) {
    signUpError.innerText = "An error occurred. Please try again later.";
  }
});
