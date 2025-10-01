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
 * Initialize and configure the categories and brands in the side panel
 */
function initializeSidePanelCategories() {
  // Since HTML already contains the elements, just get references to them
  const sidePanelCategorySelector = document.getElementById("sidePanelCategorySelector");
  const sidePanelCategoriesDropdown = document.getElementById("sidePanelCategoriesDropdown");
  const sidePanelBrandSelector = document.getElementById("sidePanelBrandSelector");
  const sidePanelBrandsDropdown = document.getElementById("sidePanelBrandsDropdown");
  const brandsDropdownLi = document.querySelector(".brands-dropdown-li");

  // Populate categories list
  populateSidePanelCategories();

  // Toggle the categories dropdown when clicked
  sidePanelCategorySelector.addEventListener("click", (e) => {
    e.preventDefault();
    const expanded = sidePanelCategorySelector.getAttribute("aria-expanded") === "true";
    sidePanelCategorySelector.setAttribute("aria-expanded", !expanded);
  });

  // Toggle the brands dropdown when clicked
  sidePanelBrandSelector.addEventListener("click", (e) => {
    e.preventDefault();
    const expanded = sidePanelBrandSelector.getAttribute("aria-expanded") === "true";
    sidePanelBrandSelector.setAttribute("aria-expanded", !expanded);
  });

  // Handle category selection from side panel
  sidePanelCategoriesDropdown.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") return;
    e.preventDefault();
    const selectedCategory = e.target.getAttribute("data-category");

    // Navigate to selected category page using new routing
    window.location.href = `/category/${selectedCategory.toLowerCase()}`;

    // The rest of this code won't run because we're navigating away
    sidePanelCategoriesDropdown
      .querySelectorAll("a")
      .forEach((a) => a.classList.remove("active"));
    e.target.classList.add("active");

    if (selectedCategory !== "all") {
      populateSidePanelBrands(selectedCategory);
      brandsDropdownLi.style.display = "block";
    }
  });

  // Handle brand selection from side panel
  sidePanelBrandsDropdown.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") return;
    e.preventDefault();
    const selectedBrand = e.target.getAttribute("data-brand");
    const selectedCategory = e.target.getAttribute("data-category");
    
    // Navigate to category page with brand filter using new routing
    window.location.href = `/category/${selectedCategory.toLowerCase()}?brand=${selectedBrand.toLowerCase()}`;
  });

  // Initialize dropdown state based on URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Extract category from path (e.g., /category/phones -> phones)
  const pathSegments = window.location.pathname.split('/');
  const selectedCategory = (pathSegments[1] === 'category' && pathSegments[2]) 
    ? pathSegments[2] 
    : (window.selectedCategory || "phones");
  if (selectedCategory && selectedCategory !== "all") {
    sidePanelCategorySelector.setAttribute("aria-expanded", "true");
    populateSidePanelBrands(selectedCategory);
    brandsDropdownLi.style.display = "block";

    const selectedBrand = urlParams.get("brand");
    if (selectedBrand) {
      sidePanelBrandSelector.setAttribute("aria-expanded", "true");
    }
  }
}

/**
 * Populate the categories dropdown in the side panel
 */
function populateSidePanelCategories() {
  const categoriesDropdown = document.getElementById("sidePanelCategoriesDropdown");
  if (!categoriesDropdown) {
    console.error("Categories dropdown element not found");
    return;
  }

  // Clear existing categories
  categoriesDropdown.innerHTML = "";

  // Get categories and add them to the dropdown
  const categories = window.categories || Object.keys(window.allCategoriesCache || {});
  
  if (categories.length === 0) {
    console.warn("No categories found");
  } else {
    console.log(`Found ${categories.length} categories to add`);
  }

  // Sort categories with phones first, then alphabetically
  const sortedCategories = categories.sort((a, b) => {
    if (a === "phones") return -1;
    if (b === "phones") return 1;
    return a.localeCompare(b);
  });

  // Add individual categories
  sortedCategories.forEach((category) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "javascript:void(0)";
    a.setAttribute("data-category", category.toLowerCase());
    a.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
    li.appendChild(a);
    categoriesDropdown.appendChild(li);
  });
}

/**
 * Populate the brands dropdown for a selected category
 * @param {string} category - The selected category name
 */
function populateSidePanelBrands(category) {
  const brandsDropdown = document.getElementById("sidePanelBrandsDropdown");
  const urlParams = new URLSearchParams(window.location.search);
  const selectedBrand = urlParams.get("brand");

  brandsDropdown.innerHTML = "";
  const categoryData = window.allCategoriesCache[category.toLowerCase()];
  
  if (categoryData && Object.keys(categoryData).length > 0) {
    const brands = Object.keys(categoryData);
    // Sort brands by popularity (model count)
    const sortedBrands = brands.sort((a, b) => {
      const aModelsCount = categoryData[a]?.models?.length || 0;
      const bModelsCount = categoryData[b]?.models?.length || 0;
      return bModelsCount - aModelsCount; // Most popular first
    });

    sortedBrands.forEach((brand) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "javascript:void(0)";
      a.setAttribute("data-brand", brand.toLowerCase());
      a.setAttribute("data-category", category.toLowerCase());
      a.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
      
      if (selectedBrand && selectedBrand.toLowerCase() === brand.toLowerCase()) {
        a.classList.add("active");
      }
      
      li.appendChild(a);
      brandsDropdown.appendChild(li);
    });
  } else {
    // If no brands are available
    const li = document.createElement("li");
    const noBrands = document.createElement("span");
    noBrands.classList.add("no-brands");
    noBrands.textContent = "No brands available";
    li.appendChild(noBrands);
    brandsDropdown.appendChild(li);
  }
}

// Note: Models functionality removed as per new hierarchy (Categories -> Brands)

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

  // Initialize side panel categories/brands
  initializeSidePanelCategories();
  
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