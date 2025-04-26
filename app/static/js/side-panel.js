// side-panel.js
import { loadAndShowFavorites } from "./favorites.js";
import { checkAuthenticated } from "./api-utils.js";
/**
 * Toggle the side panel and overlay visibility
 */
const toggleMenu = () => {
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const sidePanel = document.querySelector(".side-panel");
  const overlay = document.querySelector(".side-panel-overlay");
  
  // Get current state
  const isExpanded = hamburgerMenu.getAttribute("aria-expanded") === "true";
  
  // Toggle state
  const newState = !isExpanded;
  hamburgerMenu.setAttribute("aria-expanded", newState);
  
  if (newState) {
    // Open the panel
    sidePanel.classList.add("open");
    sidePanel.setAttribute("aria-hidden", "false");
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  } else {
    // Close the panel
    sidePanel.classList.remove("open");
    sidePanel.setAttribute("aria-hidden", "true");
    overlay.classList.remove("visible");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

/**
 * Initialize and configure the brands and models in the side panel
 */
function initializeSidePanelBrands() {
  // Since HTML already contains the elements, just get references to them
  const sidePanelBrandSelector = document.getElementById("sidePanelBrandSelector");
  const sidePanelBrandsDropdown = document.getElementById("sidePanelBrandsDropdown");
  const sidePanelModelSelector = document.getElementById("sidePanelModelSelector");
  const sidePanelModelsDropdown = document.getElementById("sidePanelModelsDropdown");
  const modelsDropdownLi = document.querySelector(".models-dropdown-li");

  // Populate brands list
  populateSidePanelBrands();

  // Toggle the brands dropdown when clicked
  sidePanelBrandSelector.addEventListener("click", (e) => {
    e.preventDefault();
    const expanded = sidePanelBrandSelector.getAttribute("aria-expanded") === "true";
    sidePanelBrandSelector.setAttribute("aria-expanded", !expanded);
  });

  // Toggle the models dropdown when clicked
  sidePanelModelSelector.addEventListener("click", (e) => {
    e.preventDefault();
    const expanded = sidePanelModelSelector.getAttribute("aria-expanded") === "true";
    sidePanelModelSelector.setAttribute("aria-expanded", !expanded);
  });

  // Handle brand selection from side panel
  sidePanelBrandsDropdown.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") return;
    e.preventDefault();
    const selectedBrand = e.target.getAttribute("data-brand");

    // Navigate to selected brand page
    const url = new URL(window.location);
    url.searchParams.set("brand", selectedBrand.toLowerCase());
    url.searchParams.delete("model");
    url.searchParams.delete("query");
    window.location = url;

    // The rest of this code won't run because we're navigating away
    sidePanelBrandsDropdown
      .querySelectorAll("a")
      .forEach((a) => a.classList.remove("active"));
    e.target.classList.add("active");

    if (selectedBrand !== "all") {
      populateSidePanelModels(selectedBrand);
      modelsDropdownLi.style.display = "block";
    }
  });

  // Handle model selection from side panel
  sidePanelModelsDropdown.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") return;
    e.preventDefault();
    const selectedModel = e.target.getAttribute("data-model");
    const selectedBrand = e.target.getAttribute("data-brand");
    const url = new URL(window.location);
    url.searchParams.set("brand", selectedBrand);
    url.searchParams.set("model", selectedModel);
    url.searchParams.delete("query");
    window.location = url;
  });

  // Initialize dropdown state based on URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const selectedBrand = urlParams.get("brand");
  if (selectedBrand && selectedBrand !== "all") {
    sidePanelBrandSelector.setAttribute("aria-expanded", "true");
    populateSidePanelModels(selectedBrand);
    modelsDropdownLi.style.display = "block";

    const selectedModel = urlParams.get("model");
    if (selectedModel) {
      sidePanelModelSelector.setAttribute("aria-expanded", "true");
    }
  }
}

/**
 * Populate the brands dropdown in the side panel
 */
function populateSidePanelBrands() {
  const brandsDropdown = document.getElementById("sidePanelBrandsDropdown");
  if (!brandsDropdown) {
    console.error("Brands dropdown element not found");
    return;
  }

  // Clear existing brands
  brandsDropdown.innerHTML = "";

  // Add "All Brands" option
  const allBrandsLi = document.createElement("li");
  const allBrandsA = document.createElement("a");
  allBrandsA.href = "javascript:void(0)";
  allBrandsA.setAttribute("data-brand", "all");
  allBrandsA.textContent = "All Brands";
  allBrandsLi.appendChild(allBrandsA);
  brandsDropdown.appendChild(allBrandsLi);

  // Get brands and add them to the dropdown
  const brands = Object.keys(window.modelsByBrand || {});
  
  if (brands.length === 0) {
    console.warn("No brands found in modelsByBrand");
  } else {
    console.log(`Found ${brands.length} brands to add`);
  }

  // Add individual brands
  brands.forEach((brand) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "javascript:void(0)";
    a.setAttribute("data-brand", brand.toLowerCase());
    a.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
    li.appendChild(a);
    brandsDropdown.appendChild(li);
  });
}

/**
 * Populate the models dropdown for a selected brand
 * @param {string} brand - The selected brand name
 */
function populateSidePanelModels(brand) {
  const modelsDropdown = document.getElementById("sidePanelModelsDropdown");
  const urlParams = new URLSearchParams(window.location.search);
  const selectedModel = urlParams.get("model");

  modelsDropdown.innerHTML = "";
  const brandData = window.modelsByBrand[brand.toLowerCase()];
  
  if (brandData && brandData.models && brandData.models.length > 0) {
    brandData.models.forEach((modelObj) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "javascript:void(0)";
      a.setAttribute("data-model", modelObj.model.toLowerCase());
      a.setAttribute("data-brand", brand.toLowerCase());
      a.textContent = modelObj.model;
      
      if (selectedModel && selectedModel.toLowerCase() === modelObj.model.toLowerCase()) {
        a.classList.add("active");
      }
      
      li.appendChild(a);
      modelsDropdown.appendChild(li);
    });
  } else {
    // If no models are available
    const li = document.createElement("li");
    const noModels = document.createElement("span");
    noModels.classList.add("no-models");
    noModels.textContent = "No models available";
    li.appendChild(noModels);
    modelsDropdown.appendChild(li);
  }
}

/**
 * Initialize the side panel
 * Called from header.js
 */
export function initSidePanel() {
  // Set up hamburger menu toggle without rebuilding it
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  if (hamburgerMenu && !hamburgerMenu.hasAttribute("listener-added")) {
    hamburgerMenu.addEventListener("click", toggleMenu);
    hamburgerMenu.setAttribute("listener-added", "true");
  }

  // Add click handler to the overlay element that already exists in HTML
  const overlay = document.querySelector(".side-panel-overlay");
  if (overlay && !overlay.hasAttribute("listener-added")) {
    overlay.addEventListener("click", toggleMenu);
    overlay.setAttribute("listener-added", "true");
  }

  // Initialize side panel brands/models
  initializeSidePanelBrands();
  
  // Set up the side panel alarm button
  const sidePanelAlarmBtn = document.getElementById("sidePanelAlarmBtn");
  if (sidePanelAlarmBtn && !sidePanelAlarmBtn.hasAttribute("listener-added")) {
    sidePanelAlarmBtn.addEventListener("click", () => {
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.setItem("pendingTrackAlerts", "true");
        if (window.showAuthModal) {
          window.showAuthModal();
        }
        return;
      }
      
      if (window.openTrackAlertsModal) {
        window.openTrackAlertsModal();
      }
      
      toggleMenu();
    });
    sidePanelAlarmBtn.setAttribute("listener-added", "true");
  }

  const favBtn = document.getElementById("sidePanelFavBtn");
  console.log("Favorites button found:", favBtn); // Debug if button exists
  
  if (favBtn && !favBtn.hasAttribute("listener-added")) {
    console.log("Adding click listener to favorites button");
    
    favBtn.addEventListener("click", async (event) => {
      console.log("Favorites button clicked!"); // Debug if click event fires
      event.preventDefault();
      
      try {
        console.log("Checking authentication status...");
        const isAuthenticated = await checkAuthenticated();
        console.log("Authentication status:", isAuthenticated);
        
        if (!isAuthenticated) {
          console.log("User not authenticated, showing auth modal");
          if (window.showAuthModal) {
            window.showAuthModal();
          } else {
            console.error("showAuthModal function is not defined");
          }
          return;
        }
        
        console.log("User authenticated, loading favorites");
        await loadAndShowFavorites();
        console.log("Favorites loaded and displayed");
      } catch (error) {
        console.error("Error in favorites button handler:", error);
      }
    });
    
    favBtn.setAttribute("listener-added", "true");
    console.log("Listener added to favorites button");
  } else {
    console.log("Favorites button not found or already has listener");
  }
}

// Close side panel when clicking outside
document.addEventListener("click", (e) => {
  const sidePanel = document.querySelector(".side-panel");
  const hamburgerMenu = document.querySelector(".hamburger-menu");

  if (sidePanel && sidePanel.classList.contains("open")) {
    if (!sidePanel.contains(e.target) && (!hamburgerMenu || !hamburgerMenu.contains(e.target))) {
      toggleMenu();
    }
  }
});