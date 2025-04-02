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
let loginBtn = document.querySelector(".btn-login");

// Export required functions
export function showAuthModal() {
  const authModal = document.getElementById("authModal");
  authModal.classList.remove("hidden");
  document.getElementById("loginForm").classList.remove("hidden");
  document.getElementById("signUpForm").classList.add("hidden");
}

export function showGlobalMessage(message, isError = false) {
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

export function updateUserUI(username) {
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
    loginBtn.style.display = "flex"
  };
}

// New helper function to handle showing price alarm after authentication
function handlePendingPriceAlarm() {
  const showPriceAlarm = sessionStorage.getItem("showPriceAlarmAfterLogin");
  if (showPriceAlarm === "true") {
    try {
      const productData = JSON.parse(sessionStorage.getItem("pendingPriceAlarmProduct"));
      if (productData && window.showPriceAlarmModal) {
        // Small delay to allow auth modal to close first
        setTimeout(() => {
          window.showPriceAlarmModal(productData);
        }, 300);
      }
    } catch (err) {
      console.error("Error showing price alarm after login:", err);
    } finally {
      // Always clear the pending data
      sessionStorage.removeItem("showPriceAlarmAfterLogin");
      sessionStorage.removeItem("pendingPriceAlarmProduct");
    }
  }
}

// Rest of your auth.js code (not exported)
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
  showAuthModal();
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
      localStorage.setItem("userEmail", email);  // Store email for price alerts
      
      authModal.classList.add("hidden");
      updateUserUI(username);
      
      // Call the helper function instead of duplicating code
      handlePendingPriceAlarm();
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
      localStorage.setItem("userEmail", email);  // Store email for price alerts
      
      authModal.classList.add("hidden");
      updateUserUI(username);
      
      // Call the helper function instead of duplicating code
      handlePendingPriceAlarm();
    } else {
      signUpError.innerText = data.detail || "Sign up failed. Please try again.";
    }
  } catch (err) {
    signUpError.innerText = "An error occurred. Please try again later.";
  }
});
