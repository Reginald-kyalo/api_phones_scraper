import { secureApiCall } from './api-utils.js';

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
// Store original login button HTML to preserve SVG icon
let originalLoginBtnHTML = loginBtn ? loginBtn.innerHTML : '';

export function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Export required functions
export function showAuthModal() {
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
  const headerRight = document.querySelector(".header__right");
  let welcomeBtn = document.getElementById("welcomeBtn");
  
  // User is logged out
  if (!username) {
    // Remove welcome button if it exists
    if (welcomeBtn) {
      welcomeBtn.remove();
    }
    // Show login button and restore its original content with SVG
    if (loginBtn) {
      loginBtn.style.display = "flex";
      // Restore original content including SVG icon
      if (originalLoginBtnHTML) {
        loginBtn.innerHTML = originalLoginBtnHTML;
      }
    }
    return;
  }
  
  // User is logged in - continue with existing logic
  const sanitizedUsername = sanitizeInput(username);

  if (loginBtn) {
    loginBtn.style.display = "none";
  }
  
  if (!welcomeBtn) {
    welcomeBtn = document.createElement("button");
    welcomeBtn.id = "welcomeBtn";
    welcomeBtn.className = "btn btn-welcome";
    headerRight.appendChild(welcomeBtn);
  }

  // Use the sanitized username in HTML content
  welcomeBtn.innerHTML = `Welcome ${sanitizedUsername} <i class="fas fa-sign-out-alt" style="margin-left: 8px;"></i>`;

  welcomeBtn.onclick = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback UI update if API call fails
      localStorage.removeItem("username");
      welcomeBtn.remove();
      loginBtn.style.display = "flex";
    }
  };
}

// Update the handlePendingRequests function
function handlePendingRequests() {
  try {
    // Handle pending price alarms (from both storage mechanisms)
    
    // Check localStorage implementation
    const pendingPriceAlarm = localStorage.getItem("pendingPriceAlarm");
    if (pendingPriceAlarm) {
      try {
        const productData = JSON.parse(pendingPriceAlarm);
        localStorage.removeItem("pendingPriceAlarm");
        
        // Wait a moment before showing the modal to ensure UI is updated
        setTimeout(() => {
          if (window.showPriceAlarmModal) {
            window.showPriceAlarmModal(productData);
          } else {
            console.error("showPriceAlarmModal function not available");
          }
        }, 300);
      } catch (err) {
        console.error("Failed to parse pending price alarm data from localStorage:", err);
        localStorage.removeItem("pendingPriceAlarm");
      }
    }
  
    // Handle other pending actions
    const pendingTrackAlerts = localStorage.getItem("pendingTrackAlerts");
    const pendingFavorite = localStorage.getItem("pendingFavorite");

    // Process pending track alerts
    if (pendingTrackAlerts === "true") {
      localStorage.removeItem("pendingTrackAlerts");
      if (window.openTrackAlertsModal) {
        window.openTrackAlertsModal();
      }
    }
    
    // Process pending favorites
    if (pendingFavorite) {
      const favoriteData = JSON.parse(pendingFavorite);
      localStorage.removeItem("pendingFavorite");
      
      // Use a try-catch block for the fetch call
      try {
        secureApiCall("favorites", {
          method: "POST",
          body: JSON.stringify({ product: favoriteData }),
        })
          .then(response => {
            if (response.ok) {
              return response.json().catch(err => {
                // Handle empty or invalid JSON
                console.warn("Empty or invalid JSON response:", err);
                return {};
              });
            }
            throw new Error("Failed to add favorite");
          })
          .then(data => {
            showGlobalMessage("Item added to favorites", false);
            const heartIcon = document.querySelector(`.heart-icon[data-product-id="${favoriteData._id}"]`);
            if (heartIcon) {
              heartIcon.classList.add("favorited"); // Updated to match other code
            }
          })
          .catch(error => {
            console.error("Error processing pending favorite:", error);
          });
      } catch (error) {
        console.error("Error in handlePendingRequests:", error);
      }
    }
  } catch (error) {
    console.error("Error in handlePendingRequests:", error);
  }
}

// Replace checkSession function
async function checkSession() {
  try {
    // Use the centralized secureApiCall
    const response = await secureApiCall("verify-session");

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("username", data.username || data.email || "User");
      updateUserUI(localStorage.getItem("username"));
      return true;
    } else {
      localStorage.removeItem("username");
      localStorage.removeItem("userEmail");
      return false;
    }
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

// Rest of your auth.js code (not exported)
document.addEventListener("DOMContentLoaded", async () => {
  // Store original login button HTML including SVG on page load
  if (loginBtn) {
    originalLoginBtnHTML = loginBtn.innerHTML;
  }
  
  window.addEventListener("load", checkSession);

  // Attach event listener for heart icons in the main product view
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

// Add this function to validate emails
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Update login form handler
loginFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  // Validate email
  if (!validateEmail(email)) {
    loginError.innerText = "Please enter a valid email address";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerText = "Logging in...";
  
  try {
    // Use the centralized secureApiCall
    const response = await secureApiCall("login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store minimal user info in localStorage for UI only
      localStorage.setItem("username", data.name || data.email);
      localStorage.setItem("userEmail", data.email);
      
      // Update UI to logged in state
      authModal.classList.add("hidden");
      updateUserUI(data.name || data.email);
      
      // Check for any pending actions
      handlePendingRequests();
    } else {
      loginError.innerText = data.detail || "Login failed";
    }
  } catch (error) {
    loginError.innerText = "An error occurred. Please try again.";
    console.error("Login error:", error);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = "Log In";
  }
});

// Update signup form handler
signUpFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signUpEmail").value;
  const password = document.getElementById("signUpPassword").value;
  
  // Clear previous error
  signUpError.innerText = "";
  
  // Validate inputs
  if (!validateEmail(email)) {
    signUpError.innerText = "Please enter a valid email address";
    return;
  }
  
  // Disable button and show loading state
  const signupBtn = signUpFormEl.querySelector("button[type='submit']");
  if (signupBtn) {
    signupBtn.disabled = true;
    signupBtn.innerText = "Signing up...";
  }
  
  try {
    const response = await secureApiCall("signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const username = data.name || email.split("@")[0];
      localStorage.setItem("username", username);  
      localStorage.setItem("userEmail", email);    

      authModal.classList.add("hidden");
      updateUserUI(username);
      handlePendingRequests();
    } else {
      // Display the specific error from the server
      signUpError.innerText = data.detail || "Sign up failed. Please try again.";
      
      // If this is an email already exists error, offer login option
      if (data.detail?.includes("already registered") || data.detail?.includes("existing")) {
        signUpError.innerHTML += ' <a href="#" id="switchToLogin">Login instead?</a>';
        document.getElementById("switchToLogin").addEventListener("click", (e) => {
          e.preventDefault();
          showLoginLink.click();
        });
      }
    }
  } catch (err) {
    console.error("Signup error:", err);
    signUpError.innerText = "An error occurred. Please try again later.";
  } finally {
    // Reset button state
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.innerText = "Sign Up";
    }
  }
});

// Update logout function
async function logout() {
  try {
    // Use the centralized secureApiCall
    const response = await secureApiCall("logout", {
      method: "POST",
    });

    if (response.ok) {
      // Clear local storage data
      localStorage.removeItem("username");
      localStorage.removeItem("userEmail");
      
      // Update UI
      updateUserUI(null);
      
      showGlobalMessage("You have been logged out successfully", false);
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
}

window.showAuthModal = showAuthModal;
window.sanitizeInput = sanitizeInput;