// header.js
// Import functions from other modules.
import { showAuthModal } from "./auth.js";
import { loadFavorites } from "./product.js";
import { initSidePanel } from "./side-panel.js";

document.addEventListener("DOMContentLoaded", () => {
  const modelsByBrand = window.modelsByBrand || {}; // Brand-to-model mapping.

  // Read URL parameters.
  const favBtn = document.querySelector(".btn-favourites");
  const alertsBtn = document.querySelector(".btn-alarm"); // This is correct, using existing btn-alarm class

  // ---------------
  // Price Alerts Button Handler
  // ---------------
  alertsBtn?.addEventListener("click", () => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Set flag to show track alerts after login
      localStorage.setItem("pendingTrackAlerts", "true");
      
      // Show auth modal
      if (window.showAuthModal) {
        window.showAuthModal();
      }
      return;
    }
    
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
    const queryInput = searchInput.value.trim();

    if (!queryInput) return;

    searchInput.value = "";
    const url = new URL(window.location);

    const matchingBrand = Object.keys(modelsByBrand).find(
      (b) => b.toLowerCase() === queryInput.toLowerCase()
    );

    if (matchingBrand) {
      url.searchParams.set("brand", matchingBrand.toLowerCase());
      url.searchParams.delete("model");
      url.searchParams.delete("query");
    } else {
      url.searchParams.set("query", queryInput);
    }
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
  favBtn?.addEventListener("click", () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showAuthModal();
      return;
    }
    document.getElementById("main-view").style.display = "none";
    document.getElementById("favorites-view").style.display = "block";
    loadFavorites();
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
        const brandsContainer = document.createElement("div");
        brandsContainer.classList.add("brands-row");

        const brands = Object.keys(window.modelsByBrand || {});
        // Randomize brand order.
        const randomizedBrands = [...brands];
        for (let i = randomizedBrands.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [randomizedBrands[i], randomizedBrands[j]] = [randomizedBrands[j], randomizedBrands[i]];
        }

        randomizedBrands.forEach((brand) => {
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
        container.appendChild(brandsContainer);
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
  });
