// header.js
// Import functions from other modules.
import { checkAuthenticated } from "./api-utils.js";
import { showAuthModal } from "./auth.js";
import { loadAndShowFavorites } from "./favorites.js";
import { initSidePanel } from "./side-panel.js";

document.addEventListener("DOMContentLoaded", () => {
  const modelsByBrand = window.modelsByBrand || {}; // Brand-to-model mapping.

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
    url.searchParams.set("query", encodeURIComponent(sanitizedQuery));
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
    const brandModelSelector = document.querySelector(".brand-model-selector");
    if (brandModelSelector) {
      brandModelSelector.style.top = `${headerHeight}px`;
      }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    // ---------------
    // Brands & Models Selector (Main Page)
    // ---------------
    function displayBrands() {
      const container = document.getElementById("selector-container");
      container.querySelectorAll(".selector-button.model").forEach((btn) => btn.remove());
      const existingModelsContainer = container.querySelector(".models-container");
      if (existingModelsContainer) existingModelsContainer.remove();

      if (container.querySelectorAll(".selector-button.brand").length === 0) {
        // Create a wrapper for the brands container and scroll arrows
        const brandsWrapper = document.createElement("div");
        brandsWrapper.classList.add("brands-wrapper");
        
        // Create left arrow
        const leftArrow = document.createElement("button");
        leftArrow.classList.add("brand-scroll-arrow", "left-arrow");
        leftArrow.innerHTML = "&#10094;"; // Using chevron character instead of &lt;
        leftArrow.setAttribute("aria-label", "Scroll brands left");
        
        // Create right arrow
        const rightArrow = document.createElement("button");
        rightArrow.classList.add("brand-scroll-arrow", "right-arrow");
        rightArrow.innerHTML = "&#10095;"; // Using chevron character instead of &gt;
        rightArrow.setAttribute("aria-label", "Scroll brands right");
        
        // Create the brands container
        const brandsContainer = document.createElement("div");
        brandsContainer.classList.add("brands-row", "scrollable-brands");

        const brands = Object.keys(window.modelsByBrand || {});
        // Sort brands by popularity (model count)
        const sortedBrands = [...brands].sort((a, b) => {
          const aModelsCount = window.modelsByBrand[a]?.models?.length || 0;
          const bModelsCount = window.modelsByBrand[b]?.models?.length || 0;
          return bModelsCount - aModelsCount; // Most popular first
        });

        sortedBrands.forEach((brand) => {
          const button = document.createElement("button");
          button.classList.add("selector-button", "brand");
          button.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
          button.setAttribute("data-brand", brand.toLowerCase());
          button.addEventListener("click", (e) => {
            document.querySelectorAll(".selector-button.brand").forEach((btn) => btn.classList.remove("active"));
            e.target.classList.add("active");
            displayModels(brand);
          });
          brandsContainer.appendChild(button);
        });
        
        // Add components to the wrapper
        brandsWrapper.appendChild(leftArrow);
        brandsWrapper.appendChild(brandsContainer);
        brandsWrapper.appendChild(rightArrow);
        container.appendChild(brandsWrapper);
        
        // Add scroll functionality to arrows
        leftArrow.addEventListener('click', () => {
          brandsContainer.scrollBy({ left: -200, behavior: 'smooth' });
        });
        
        rightArrow.addEventListener('click', () => {
          brandsContainer.scrollBy({ left: 200, behavior: 'smooth' });
        });
        
        // Add horizontal scroll behavior for mouse wheel
        brandsContainer.addEventListener('wheel', function(event) {
          if (event.deltaY !== 0) {
            event.preventDefault();
            
            // Scroll horizontally instead of vertically
            // Use a multiplier to control scroll speed
            const scrollMultiplier = 2;
            this.scrollLeft += event.deltaY * scrollMultiplier;
          }
        }, { passive: false });
        
        // Update arrow visibility based on scroll position
        function updateArrowVisibility() {
          // Add larger threshold to create a buffer zone for smoother transitions
          const threshold = 50; // Increased from 10 to 50
          
          // Left arrow visibility
          const showLeftArrow = brandsContainer.scrollLeft > threshold;
          if (showLeftArrow && leftArrow.classList.contains('hidden')) {
            leftArrow.classList.remove('hidden');
          } else if (!showLeftArrow && !leftArrow.classList.contains('hidden')) {
            leftArrow.classList.add('hidden');
          }
          
          // Right arrow visibility
          const scrollableDistance = brandsContainer.scrollWidth - brandsContainer.clientWidth;
          const showRightArrow = brandsContainer.scrollLeft < scrollableDistance - threshold;
          
          if (showRightArrow && rightArrow.classList.contains('hidden')) {
            rightArrow.classList.remove('hidden');
          } else if (!showRightArrow && !rightArrow.classList.contains('hidden')) {
            rightArrow.classList.add('hidden');
          }
        }
        
        // Initial check for arrow visibility
        updateArrowVisibility();
        
        // Update arrow visibility on scroll
        brandsContainer.addEventListener('scroll', updateArrowVisibility);
        
        // Update on window resize as well
        window.addEventListener('resize', updateArrowVisibility);
      }

      // Highlight selected brand from URL parameters.
      const params = new URLSearchParams(window.location.search);
      const selectedBrandParam = params.get("brand");
      if (selectedBrandParam) {
        const brandButton = container.querySelector(
          `.selector-button.brand[data-brand="${selectedBrandParam.toLowerCase()}"]`
        );
        if (brandButton) {
          brandButton.classList.add("active");
          displayModels(selectedBrandParam);
        }
      }
    }

    function displayModels(brand) {
      const container = document.getElementById("selector-container");
      const existingModelsContainer = container.querySelector(".models-container");
      if (existingModelsContainer) existingModelsContainer.remove();

      const modelsContainer = document.createElement("div");
      modelsContainer.classList.add("models-container");

      const brandData = window.modelsByBrand[brand.toLowerCase()];
      if (brandData && brandData.models && brandData.models.length > 0) {
        brandData.models.forEach((modelObj) => {
          const button = document.createElement("button");
          button.classList.add("selector-button", "model");
          button.textContent = modelObj.model;
          button.addEventListener("click", () => selectModel(brand, modelObj.model));
          modelsContainer.appendChild(button);
        });
      } else {
        const noModelsMsg = document.createElement("p");
        noModelsMsg.textContent = "No models available for this brand";
        noModelsMsg.style.textAlign = "center";
        noModelsMsg.style.width = "100%";
        modelsContainer.appendChild(noModelsMsg);
      }
      container.appendChild(modelsContainer);
    }

    function selectModel(brand, model) {
      const url = new URL(window.location);
      url.searchParams.set("brand", brand.toLowerCase());
      url.searchParams.set("model", model.toLowerCase());
      url.searchParams.delete("query");
      window.location = url;
    }

    // Initialize main page brand/model selector.
    displayBrands();
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
