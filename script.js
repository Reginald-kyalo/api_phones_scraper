document.addEventListener("DOMContentLoaded", () => {
  const modelsByBrand = window.modelsByBrand || {};

  // Get dropdown elements
  const brandSelector = document.getElementById("brandSelector");
  const brandsDropdown = document.getElementById("brandsDropdown");
  const modelSelector = document.getElementById("modelSelector");
  const modelsDropdown = document.getElementById("modelsDropdown");

  const params = new URLSearchParams(window.location.search);
  const selectedBrandParam = params.get("brand");
  const selectedModelParam = params.get("model");

  // Restore selections from URL params on page load
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

      // Populate model dropdown
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

  // Combined Search Form Handler
  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const searchInput = this.querySelector('input[name="query"]');
    const queryInput = searchInput.value.trim();
    if (!queryInput) {
      searchInput.removeAttribute("name");
      return; // Do nothing if empty
    }
    const url = new URL(window.location);
    url.searchParams.set("brand", queryInput.toLowerCase());
    url.searchParams.delete("query");
    url.searchParams.delete("model");
    window.location = url;
  });

  // Toggle brand dropdown (toggling on parent <li>)
  brandSelector.addEventListener("click", (e) => {
    e.preventDefault();
    const brandLi = brandSelector.parentElement; // Parent <li>
    const expanded = brandLi.getAttribute("aria-expanded") === "true";
    brandLi.setAttribute("aria-expanded", !expanded);
    brandsDropdown.style.display = !expanded ? "block" : "none";
  });

  // Toggle models dropdown (toggling on parent <li>)
  modelSelector.addEventListener("click", (e) => {
    e.preventDefault();
    const modelLi = modelSelector.parentElement; // Parent <li>
    if (modelLi.classList.contains("disabled")) {
      return;
    }
    const expanded = modelLi.getAttribute("aria-expanded") === "true";
    modelLi.setAttribute("aria-expanded", !expanded);
    modelsDropdown.style.display = !expanded ? "block" : "none";
  });

  // Handle brand selection
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

  // Handle model selection
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

  // Click outside to close dropdowns
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

  const heartIcon = document.getElementById('heartIcon');
  if (heartIcon) {
    heartIcon.addEventListener('click', function() {
      this.classList.toggle('active');
    });
  }
  
  const scalesButton = document.getElementById('scalesButton');
  const comparisonPanel = document.getElementById('comparisonPanel');
  const closePanel = document.getElementById('closePanel');
  
  if (scalesButton && comparisonPanel && closePanel) {
    scalesButton.addEventListener('click', function(event) {
      event.stopPropagation();
      comparisonPanel.classList.toggle('active');
      this.classList.toggle('active');
    });
    
    closePanel.addEventListener('click', function(event) {
      event.stopPropagation();
      comparisonPanel.classList.remove('active');
      scalesButton.classList.remove('active');
    });
    
    document.addEventListener('click', function(event) {
      if (!event.target.closest('#comparisonPanel') && !event.target.closest('#scalesButton')) {
        comparisonPanel.classList.remove('active');
        scalesButton.classList.remove('active');
      }
    });
  }
  
  const alarmButton = document.getElementById('alarmButton');
  if (alarmButton) {
    alarmButton.addEventListener('click', function() {
      alert('Price alarm has been set. We will notify you when the price drops!');
    });
  }
  
  const merchantItems = document.querySelectorAll('.merchant-list li');
  merchantItems.forEach(item => {
    item.addEventListener('click', function() {
      const merchantName = this.querySelector('.merchant-name').textContent;
      alert(`Redirecting to ${merchantName} product page...`);
    });
  });
});
