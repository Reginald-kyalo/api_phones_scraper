document.addEventListener("DOMContentLoaded", () => {
  const modelsByBrand = window.modelsByBrand || {}; // Object containing brand-to-model mapping

  // Get dropdown elements
  const brandSelector = document.getElementById("brandSelector");
  const brandsDropdown = document.getElementById("brandsDropdown");
  const modelSelector = document.getElementById("modelSelector");
  const modelsDropdown = document.getElementById("modelsDropdown");

  // Read URL parameters for pre-selected values
  const params = new URLSearchParams(window.location.search);
  const selectedBrandParam = params.get("brand");
  const selectedModelParam = params.get("model");

  // Restore selections from URL parameters when the page loads
  if (selectedBrandParam) {
    const brandName = Object.keys(modelsByBrand).find(
      (b) => b.toLowerCase() === selectedBrandParam.toLowerCase()
    );

    if (selectedBrandParam === "all") {
      document.querySelector(".brand-label").textContent = "All Brands";
      document.querySelector(".models").classList.add("disabled");
      modelsDropdown.innerHTML = "<li>Select a brand first</li>";
    } else if (brandName) {
      document.querySelector(".brand-label").textContent =
        brandName.charAt(0).toUpperCase() + brandName.slice(1);

      const brandData = modelsByBrand[brandName.toLowerCase()];
      if (brandData) {
        modelsDropdown.innerHTML = "";
        brandData.models.forEach((modelObj) => {
          const li = document.createElement("li");
          li.setAttribute("role", "menuitem");
          const a = document.createElement("a");
          a.href = "javascript:void(0)";
          a.setAttribute("data-model", modelObj.model.toLowerCase());
          a.textContent = modelObj.model;
          li.appendChild(a);
          modelsDropdown.appendChild(li);
        });
        document.querySelector(".models").classList.remove("disabled");
      }
    }
  }

  if (selectedModelParam) {
    document.querySelector(".model-label").textContent = selectedModelParam;
  }

  // ** Search Form Handler **
  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();

    // Retrieve the search query input
    const searchInput = this.querySelector('input[name="query"]');
    const queryInput = searchInput.value.trim();

    // Prevent search submission if input is empty (do nothing)
    if (!queryInput) {
      return;
    }

    // Clear the search input before redirecting
    searchInput.value = "";

    // Create a URL object based on the current location
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

  // ** Toggle brand dropdown **
  brandSelector.addEventListener("click", (e) => {
    e.preventDefault();
    const brandLi = brandSelector.parentElement;
    const expanded = brandLi.getAttribute("aria-expanded") === "true";
    brandLi.setAttribute("aria-expanded", !expanded);
    brandsDropdown.style.display = !expanded ? "block" : "none";
  });

  // ** Toggle model dropdown **
  modelSelector.addEventListener("click", (e) => {
    e.preventDefault();
    const modelLi = modelSelector.parentElement;
    if (modelLi.classList.contains("disabled")) {
      return;
    }
    const expanded = modelLi.getAttribute("aria-expanded") === "true";
    modelLi.setAttribute("aria-expanded", !expanded);
    modelsDropdown.style.display = !expanded ? "block" : "none";
  });

  // ** Handle brand selection from dropdown **
  brandsDropdown.addEventListener("click", (e) => {
    e.preventDefault();
    const target = e.target;
    if (target.tagName === "A") {
      const selectedBrand = target.getAttribute("data-brand").toLowerCase();

      const url = new URL(window.location);
      url.searchParams.set("brand", selectedBrand);
      url.searchParams.delete("model");
      url.searchParams.delete("query");
      window.location = url;
    }
  });

  // ** Handle model selection from dropdown **
  modelsDropdown.addEventListener("click", (e) => {
    e.preventDefault();
    const target = e.target;
    if (target.tagName === "A") {
      const selectedModel = target.getAttribute("data-model");

      const url = new URL(window.location);
      url.searchParams.set("model", selectedModel);
      url.searchParams.delete("query");
      window.location = url;
    }
  });

  // ** Click outside to close dropdowns **
  document.addEventListener("click", (e) => {
    const isBrandArea =
      brandSelector.contains(e.target) || brandsDropdown.contains(e.target);
    const isModelArea =
      modelSelector.contains(e.target) || modelsDropdown.contains(e.target);

    if (!isBrandArea) {
      brandsDropdown.style.display = "none";
      brandSelector.parentElement.setAttribute("aria-expanded", "false");
    }

    if (!isModelArea) {
      modelsDropdown.style.display = "none";
      modelSelector.parentElement.setAttribute("aria-expanded", "false");
    }
  });

  // ** Sticky Header Functionality **
  let lastScroll = 0;
  const header = document.querySelector(".header");

  window.addEventListener("scroll", () => {
    const currentScroll =
      window.pageYOffset || document.documentElement.scrollTop;

    // Always show header at the very top
    if (currentScroll <= 0) {
      header.classList.remove("header--hidden");
      lastScroll = currentScroll;
      return;
    }

    // If scrolling down and header is visible, hide it
    if (
      currentScroll > lastScroll &&
      !header.classList.contains("header--hidden")
    ) {
      header.classList.add("header--hidden");
    }
    // If scrolling up and header is hidden, show it
    else if (
      currentScroll < lastScroll &&
      header.classList.contains("header--hidden")
    ) {
      header.classList.remove("header--hidden");
    }

    lastScroll = currentScroll;
  });
});
