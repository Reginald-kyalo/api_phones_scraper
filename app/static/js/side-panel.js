// side-panel.js

// Helper: Create or return an existing overlay element.
const getOrCreateOverlay = () => {
  let overlay = document.querySelector(".side-panel-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.classList.add("side-panel-overlay");
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    overlay.addEventListener("click", toggleMenu);
  }
  return overlay;
};

// Toggle the side panel and overlay visibility directly
const toggleMenu = () => {
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const sidePanel = document.querySelector(".side-panel");
  const overlay = getOrCreateOverlay();
  
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

  // -------------------------
  // Side Panel Brand/Model Functionality
  // -------------------------
  function initializeSidePanelBrands() {
    const sidePanelUl = document.querySelector(".side-panel__nav > ul");
    // If the dropdown elements haven't been created yet, build them.
    if (!document.getElementById("sidePanelBrandSelector")) {
      // Create Brands Dropdown Element.
      const brandLi = document.createElement("li");

      const brandA = document.createElement("a");
      brandA.href = "javascript:void(0)";
      brandA.classList.add("side-panel__dropdown");
      brandA.id = "sidePanelBrandSelector";
      brandA.setAttribute("aria-expanded", "false");

      const brandChevron = document.createElement("svg");
      brandChevron.classList.add("chevron-icon");
      brandChevron.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      brandChevron.setAttribute("width", "16");
      brandChevron.setAttribute("height", "16");
      brandChevron.setAttribute("viewBox", "0 0 24 24");
      brandChevron.setAttribute("fill", "none");
      brandChevron.setAttribute("stroke", "currentColor");
      brandChevron.setAttribute("stroke-width", "2");
      brandChevron.setAttribute("stroke-linecap", "round");
      brandChevron.setAttribute("stroke-linejoin", "round");
      brandChevron.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';

      brandA.appendChild(brandChevron);
      brandA.appendChild(document.createTextNode("Brands"));

      const brandSubmenu = document.createElement("div");
      brandSubmenu.classList.add("side-panel__submenu");

      const brandsList = document.createElement("ul");
      brandsList.classList.add("submenu-list", "brands-list");
      brandsList.id = "sidePanelBrandsDropdown";

      brandSubmenu.appendChild(brandsList);
      brandLi.appendChild(brandA);
      brandLi.appendChild(brandSubmenu);

      // Create Models Dropdown Element (initially hidden).
      const modelsLi = document.createElement("li");
      modelsLi.classList.add("models-dropdown-li");
      modelsLi.style.display = "none";

      const modelsA = document.createElement("a");
      modelsA.href = "javascript:void(0)";
      modelsA.classList.add("side-panel__dropdown");
      modelsA.id = "sidePanelModelSelector";
      modelsA.setAttribute("aria-expanded", "false");

      const modelsChevron = document.createElement("svg");
      modelsChevron.classList.add("chevron-icon");
      modelsChevron.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      modelsChevron.setAttribute("width", "16");
      modelsChevron.setAttribute("height", "16");
      modelsChevron.setAttribute("viewBox", "0 0 24 24");
      modelsChevron.setAttribute("fill", "none");
      modelsChevron.setAttribute("stroke", "currentColor");
      modelsChevron.setAttribute("stroke-width", "2");
      modelsChevron.setAttribute("stroke-linecap", "round");
      modelsChevron.setAttribute("stroke-linejoin", "round");
      modelsChevron.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';

      modelsA.appendChild(modelsChevron);
      modelsA.appendChild(document.createTextNode("Models"));

      const modelsSubmenu = document.createElement("div");
      modelsSubmenu.classList.add("side-panel__submenu");

      const modelsList = document.createElement("ul");
      modelsList.classList.add("submenu-list", "models-list");
      modelsList.id = "sidePanelModelsDropdown";

      modelsSubmenu.appendChild(modelsList);
      modelsLi.appendChild(modelsA);
      modelsLi.appendChild(modelsSubmenu);

      // Append both dropdowns to the side panel.
      sidePanelUl.appendChild(brandLi);
      sidePanelUl.appendChild(modelsLi);
    }

    // Grab references to the newly created elements.
    const sidePanelBrandSelector = document.getElementById(
      "sidePanelBrandSelector"
    );
    const sidePanelBrandsDropdown = document.getElementById(
      "sidePanelBrandsDropdown"
    );
    const sidePanelModelSelector = document.getElementById(
      "sidePanelModelSelector"
    );
    const sidePanelModelsDropdown = document.getElementById(
      "sidePanelModelsDropdown"
    );
    const modelsDropdownLi = document.querySelector(".models-dropdown-li");

    // Populate brands list.
    populateSidePanelBrands();

    // Toggle the brands dropdown when clicked.
    sidePanelBrandSelector.addEventListener("click", (e) => {
      e.preventDefault();
      const expanded =
        sidePanelBrandSelector.getAttribute("aria-expanded") === "true";
      sidePanelBrandSelector.setAttribute("aria-expanded", !expanded);
    });

    // Toggle the models dropdown when clicked.
    sidePanelModelSelector.addEventListener("click", (e) => {
      e.preventDefault();
      const expanded =
        sidePanelModelSelector.getAttribute("aria-expanded") === "true";
      sidePanelModelSelector.setAttribute("aria-expanded", !expanded);
    });

    // Handle brand selection from side panel.
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

    // Handle model selection from side panel.
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

    // Initialize dropdown state based on URL parameters.
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
    console.log(`Found ${brands.length} brands to add`);

    if (brands.length === 0) {
      console.warn("No brands found in modelsByBrand");
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
        if (
          selectedModel &&
          selectedModel.toLowerCase() === modelObj.model.toLowerCase()
        ) {
          a.classList.add("active");
        }
        li.appendChild(a);
        modelsDropdown.appendChild(li);
      });
    } else {
      // If no models are available.
      const li = document.createElement("li");
      const noModels = document.createElement("span");
      noModels.classList.add("no-models");
      noModels.textContent = "No models available";
      li.appendChild(noModels);
      modelsDropdown.appendChild(li);
    }
  }

  // Export an initializer to be called from header.js.
  export function initSidePanel() {
    // Set up hamburger menu toggle - just once
    const hamburgerMenu = document.querySelector(".hamburger-menu");
    if (hamburgerMenu) {
      // Remove any existing handlers first
      const freshHamburger = hamburgerMenu.cloneNode(true);
      hamburgerMenu.parentNode.replaceChild(freshHamburger, hamburgerMenu);
      
      // Add the direct toggle event
      freshHamburger.addEventListener("click", toggleMenu);
    }

    // Initialize side panel brands/models
    initializeSidePanelBrands();
  }

  // Close side panel when clicking outside
  document.addEventListener("click", (e) => {
    const sidePanel = document.querySelector(".side-panel");
    const hamburgerMenu = document.querySelector(".hamburger-menu");

    // If side panel is open
    if (sidePanel.classList.contains("open")) {
      // If click is outside side panel and not on hamburger menu
      if (!sidePanel.contains(e.target) && !hamburgerMenu.contains(e.target)) {
        // Close the side panel
        toggleMenu();
      }
    }
  });

