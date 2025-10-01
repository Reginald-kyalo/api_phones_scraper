// header.js
// Import functions from other modules.
import { checkAuthenticated } from "./api-utils.js";
import { showAuthModal } from "./auth.js";
import { loadAndShowFavorites } from "./favorites.js";
import { initSidePanel } from "./side-panel.js";

document.addEventListener("DOMContentLoaded", () => {
  const modelsByBrand = window.modelsByBrand || {}; // Brand-to-model mapping for selected category
  const allCategoriesCache = window.allCategoriesCache || {}; // All categories cache
  const selectedCategory = window.selectedCategory; // Current selected category

  // Read URL parameters.
  const favBtn = document.querySelector(".btn-favorites");
  const alertsBtn = document.querySelector(".btn-alarm"); // This is correct, using existing btn-alarm class

  // ---------------
  // Price Alerts Button Handler
  // ---------------
  alertsBtn?.addEventListener("click", async () => {
    console.log("Price alerts button clicked");
    
    // Use the cookie-based authentication check
    const isAuthenticated = await checkAuthenticated();
    
    if (!isAuthenticated) {
      console.log("User not authenticated, showing auth modal");
      // Set flag to show track alerts after login
      localStorage.setItem("pendingTrackAlerts", "true");
      
      // Show auth modal
      showAuthModal();
      return;
    }
    
    console.log("User is authenticated, showing track alerts modal");
    // User is logged in, show the track alerts modal
    if (window.openTrackAlertsModal) {
      window.openTrackAlertsModal();
    }
  });
  
  // ---------------
  // Search Form Handler
  // ---------------
  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const searchInput = this.querySelector('input[name="query"]');
    let queryInput = searchInput.value.trim();

    if (!queryInput) return;

    // Production-ready sanitization
    // 1. Allow alphanumeric, certain special chars relevant to phone models
    // 2. Limit length to prevent abuse
    // 3. Encode to prevent injection
    const sanitizedQuery = queryInput
      .slice(0, 100) // Reasonable length limit
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[^\p{L}\p{N}\s\-+._]/gu, '') // Keep letters, numbers, spaces, hyphens, plus, periods, underscores
      .trim();
    
    if (!sanitizedQuery) return;

    searchInput.value = "";
    const url = new URL(window.location);
    
    // Use encodeURIComponent for additional safety when adding to URL
    url.searchParams.set("query", sanitizedQuery);
    url.searchParams.delete("brand");
    url.searchParams.delete("model");
    
    window.location = url;
  });


  // ---------------
  // Sticky Header Functionality
  // ---------------
  let lastScroll = 0;
  const header = document.querySelector(".header");

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    if (currentScroll <= 0) {
      header.classList.remove("header--hidden");
      lastScroll = currentScroll;
      return;
    }
    if (currentScroll > lastScroll && !header.classList.contains("header--hidden")) {
      header.classList.add("header--hidden");
    } else if (currentScroll < lastScroll && header.classList.contains("header--hidden")) {
      header.classList.remove("header--hidden");
    }
    lastScroll = currentScroll;
  });

  // ---------------
  // Favorites Button Handler
  // ---------------
  favBtn?.addEventListener("click", async () => {    
    // Use the cookie-based authentication check
    const isAuthenticated = await checkAuthenticated();
    
    if (!isAuthenticated) {
      console.log("User not authenticated, showing auth modal");
      //localStorage.setItem("pendingFavorites");
      showAuthModal();
      return;
    }
    loadAndShowFavorites();
  });

  // ---------------
  // Search Icon & Field Enhancements
  // ---------------
  const searchIcon = document.querySelector(".search__icon");
  const searchField = document.querySelector(".search__field");
  const searchWrapper = document.querySelector(".search__wrapper");

  if (searchIcon && searchField) {
    searchIcon.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.innerWidth <= 768) {
        searchWrapper.style.width = "100%";
        setTimeout(() => {
          searchField.focus();
          try {
            searchField.click();
            searchField.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch (err) {
            console.log("Error focusing search field:", err);
          }
        }, 500);
      } else {
        searchField.focus();
      }
    });

    searchField.addEventListener("blur", () => {
      setTimeout(() => {
        if (
          document.activeElement !== searchIcon &&
          document.activeElement !== searchField
        ) {
          searchWrapper.style.width = "";
        }
      }, 200);
    });
  }

  // Update header height on load and resize.
  const updateHeaderHeight = () => {
    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
    const categoryBrandSelector = document.querySelector(".category-brand-selector");
    if (categoryBrandSelector) {
      categoryBrandSelector.style.top = `${headerHeight}px`;
      }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    // ---------------
    // Categories & Brands Selector (Main Page)
    // ---------------
    function displayCategories() {
      const container = document.getElementById("selector-container");
      if (!container) {
        // Container doesn't exist (selector is hidden on some pages)
        return;
      }
      container.innerHTML = ""; // Clear all existing content

      // Create a wrapper for the categories container and scroll arrows
      const categoriesWrapper = document.createElement("div");
      categoriesWrapper.classList.add("categories-wrapper");
      
      // Create left arrow
      const leftArrow = document.createElement("button");
      leftArrow.classList.add("category-scroll-arrow", "left-arrow");
      leftArrow.innerHTML = "&#10094;";
      leftArrow.setAttribute("aria-label", "Scroll categories left");
      
      // Create right arrow
      const rightArrow = document.createElement("button");
      rightArrow.classList.add("category-scroll-arrow", "right-arrow");
      rightArrow.innerHTML = "&#10095;";
      rightArrow.setAttribute("aria-label", "Scroll categories right");
      
      // Create the categories container
      const categoriesContainer = document.createElement("div");  
      categoriesContainer.classList.add("categories-row", "scrollable-categories");

      // Add home button as the first item (only on category pages)
      if (selectedCategory) {
        const homeButton = document.createElement("button");
        homeButton.classList.add("selector-button", "category", "home-button");
        homeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>';
        homeButton.setAttribute("data-category", "home");
        homeButton.setAttribute("title", "Home");
        homeButton.addEventListener("click", (e) => {
          document.querySelectorAll(".selector-button.category").forEach((btn) => btn.classList.remove("active"));
          e.target.classList.add("active");
          
          // Navigate to the main page
          window.location.href = `/`;
        });
        categoriesContainer.appendChild(homeButton);
      }

      const categories = Object.keys(allCategoriesCache);
      // Sort categories with phones first, then alphabetically
      const sortedCategories = categories.sort((a, b) => {
        if (a === "phones") return -1;
        if (b === "phones") return 1;
        return a.localeCompare(b);
      });

      sortedCategories.forEach((category) => {
        const button = document.createElement("button");
        button.classList.add("selector-button", "category");
        button.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
        button.setAttribute("data-category", category.toLowerCase());
        button.addEventListener("click", (e) => {
          document.querySelectorAll(".selector-button.category").forEach((btn) => btn.classList.remove("active"));
          e.target.classList.add("active");
          
          // Navigate to the category page using the new routing
          window.location.href = `/category/${category.toLowerCase()}`;
        });
        categoriesContainer.appendChild(button);
      });
      
      // Add components to the wrapper
      categoriesWrapper.appendChild(leftArrow);
      categoriesWrapper.appendChild(categoriesContainer);
      categoriesWrapper.appendChild(rightArrow);
      container.appendChild(categoriesWrapper);
      
      // Add scroll functionality to arrows
      leftArrow.addEventListener('click', () => {
        categoriesContainer.scrollBy({ left: -200, behavior: 'smooth' });
      });
      
      rightArrow.addEventListener('click', () => {
        categoriesContainer.scrollBy({ left: 200, behavior: 'smooth' });
      });
      
      // Add horizontal scroll behavior for mouse wheel
      categoriesContainer.addEventListener('wheel', function(event) {
        if (event.deltaY !== 0) {
          event.preventDefault();
          const scrollMultiplier = 2;
          this.scrollLeft += event.deltaY * scrollMultiplier;
        }
      }, { passive: false });
      
      // Update arrow visibility based on scroll position
      function updateArrowVisibility() {
        const threshold = 50;
        
        const showLeftArrow = categoriesContainer.scrollLeft > threshold;
        if (showLeftArrow && leftArrow.classList.contains('hidden')) {
          leftArrow.classList.remove('hidden');
        } else if (!showLeftArrow && !leftArrow.classList.contains('hidden')) {
          leftArrow.classList.add('hidden');
        }
        
        const scrollableDistance = categoriesContainer.scrollWidth - categoriesContainer.clientWidth;
        const showRightArrow = categoriesContainer.scrollLeft < scrollableDistance - threshold;
        
        if (showRightArrow && rightArrow.classList.contains('hidden')) {
          rightArrow.classList.remove('hidden');
        } else if (!showRightArrow && !rightArrow.classList.contains('hidden')) {
          rightArrow.classList.add('hidden');
        }
      }
      
      updateArrowVisibility();
      categoriesContainer.addEventListener('scroll', updateArrowVisibility);
      window.addEventListener('resize', updateArrowVisibility);

      // Highlight selected category from URL parameters
      const params = new URLSearchParams(window.location.search);
      const selectedCategoryParam = params.get("category") || selectedCategory;
      if (selectedCategoryParam) {
        const categoryButton = container.querySelector(
          `.selector-button.category[data-category="${selectedCategoryParam.toLowerCase()}"]`
        );
        if (categoryButton) {
          categoryButton.classList.add("active");
          displayBrands(selectedCategoryParam);
        }
      }
    }

    function displayBrands(category) {
      const container = document.getElementById("selector-container");
      if (!container) {
        // Container doesn't exist (e.g., on main page where selector is hidden)
        return;
      }
      const existingBrandsContainer = container.querySelector(".brands-container");
      if (existingBrandsContainer) existingBrandsContainer.remove();

      const brandsContainer = document.createElement("div");
      brandsContainer.classList.add("brands-container");

      const categoryData = allCategoriesCache[category.toLowerCase()];
      if (categoryData && Object.keys(categoryData).length > 0) {
        const brands = Object.keys(categoryData);
        // Sort brands by popularity (model count)
        const sortedBrands = [...brands].sort((a, b) => {
          const aModelsCount = categoryData[a]?.models?.length || 0;
          const bModelsCount = categoryData[b]?.models?.length || 0;
          return bModelsCount - aModelsCount; // Most popular first
        });

        sortedBrands.forEach((brand) => {
          const button = document.createElement("button");
          button.classList.add("selector-button", "brand");
          button.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
          button.addEventListener("click", () => selectBrand(category, brand));
          brandsContainer.appendChild(button);
        });
      } else {
        const noBrandsMsg = document.createElement("p");
        noBrandsMsg.textContent = "No brands available for this category";
        noBrandsMsg.style.textAlign = "center";
        noBrandsMsg.style.width = "100%";
        brandsContainer.appendChild(noBrandsMsg);
      }
      container.appendChild(brandsContainer);
    }

    function selectBrand(category, brand) {
      // Navigate to category page with brand filter using new routing
      window.location.href = `/category/${category.toLowerCase()}?brand=${brand.toLowerCase()}`;
    }

    // Initialize main page category/brand selector (only if container exists).
    if (document.getElementById("selector-container")) {
      displayCategories();
    }
    initSidePanel();

    // ---------------
    // Mobile Search Toggle
    // ---------------
    const mobileSearchIcon = document.querySelector('.mobile-search-icon');
    const searchContainer = document.querySelector('.search__container');
    const searchCloseBtn = document.querySelector('.search-close');
    const searchInput = document.querySelector('#search');

    if (mobileSearchIcon && searchContainer && searchCloseBtn) {
      // Variable to track if we just opened the search
      let justOpened = false;
      
      // Open search on mobile
      mobileSearchIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        searchContainer.classList.add('expanded');
        justOpened = true; // Set flag
        
        setTimeout(() => {
          // Focus the search input after animation
          searchInput.focus();
          // Reset flag after a short delay
          setTimeout(() => {
            justOpened = false;
          }, 100);
        }, 300);
      });

      // Close search on mobile
      searchCloseBtn.addEventListener('click', () => {
        searchContainer.classList.remove('expanded');
      });

      // Close search when pressing Escape
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchContainer.classList.remove('expanded');
        }
      });

      // Submit form when pressing Enter
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          document.getElementById('searchForm').submit();
        }
      });
      
      // Close search when clicking outside
      document.addEventListener('click', (e) => {
        // Don't close if we just opened the search
        if (justOpened) return;
        
        // Check if search is expanded and click is outside search container
        if (
          searchContainer.classList.contains('expanded') && 
          !searchContainer.contains(e.target) && 
          e.target !== mobileSearchIcon
        ) {
          searchContainer.classList.remove('expanded');
        }
      });
    }
  });
