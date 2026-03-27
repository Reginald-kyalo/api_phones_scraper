// side-panel.js - Responsive side panel with mobile and desktop layouts
import { loadAndShowFavorites } from "./favorites.js";
import { getIconByKeywords, getStockImage } from "./comprehensive-icon-map.js";

// DIAGNOSTIC: Log to verify JS is loading with timestamp
console.log("🔍 SIDE-PANEL.JS LOADED at:", new Date().toISOString(), "Version: 1737820000");

// Store categories globally for random selection
let allCategories = [];

/**
 * Toggle the side panel and overlay visibility
 */
const toggleMenu = () => {
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const sidePanel = document.querySelector(".side-panel");
  const overlay = document.querySelector(".side-panel-overlay");
  
  const isExpanded = hamburgerMenu.getAttribute("aria-expanded") === "true";
  const newState = !isExpanded;
  hamburgerMenu.setAttribute("aria-expanded", newState);
  
  if (newState) {
    sidePanel.classList.add("open");
    sidePanel.setAttribute("aria-hidden", "false");
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    // Diagnostic: log positions and sizes to help verify alignment
    setTimeout(() => {
      try {
        const categoriesSection = document.querySelector('.side-panel__categories-section');
        const hamburgerRect = hamburgerMenu ? hamburgerMenu.getBoundingClientRect() : null;
        const headerContainer = document.querySelector('.header__container');
        const headerRect = headerContainer ? headerContainer.getBoundingClientRect() : null;
        const sectionRect = categoriesSection ? categoriesSection.getBoundingClientRect() : null;
        
        console.log('🔍 === ALIGNMENT CHECK ===');
        console.log('🔍 Hamburger left:', hamburgerRect?.left);
        console.log('🔍 Header container left:', headerRect?.left);
        console.log('🔍 Header container right:', headerRect?.right);
        console.log('🔍 Categories section left:', sectionRect?.left);
        console.log('🔍 Categories section right:', sectionRect?.right);
        console.log('🔍 Categories section computed style:', window.getComputedStyle(categoriesSection).padding);
        
        if (hamburgerRect && sectionRect) {
          const leftDiff = Math.abs(hamburgerRect.left - sectionRect.left);
          console.log(`🔍 Left alignment diff: ${leftDiff}px (should be ~0-2px)`);
        }
        
        if (headerRect && sectionRect) {
          const rightDiff = Math.abs(headerRect.right - sectionRect.right);
          console.log(`🔍 Right alignment diff: ${rightDiff}px (should be ~0-2px)`);
        }
      } catch (err) {
        console.warn('Diagnostic log failed:', err);
      }
    }, 100);
  } else {
    sidePanel.classList.remove("open");
    sidePanel.setAttribute("aria-hidden", "true");
    overlay.classList.remove("visible");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

/**
 * Fetch categories from API and render in side panel
 */
async function initializeSidePanelCategories() {
  try {
    const response = await fetch('/api/categories');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    allCategories = data.categories || [];
    renderSidePanelCategories(allCategories);
    
    // On desktop, show a random category by default
    if (window.innerWidth >= 1200 && allCategories.length > 0) {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * allCategories.length);
        const randomCategory = allCategories[randomIndex];
        const categoryElement = document.querySelector(`[data-category-id="${randomCategory.category_id}"]`);
        if (categoryElement) {
          categoryElement.click();
        }
      }, 300);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    const container = document.getElementById('sidePanelCategoriesGrid');
    if (container) {
      container.innerHTML = '<div class="error-message">Failed to load categories</div>';
    }
  }
}

/**
 * Render categories in the side panel with responsive layout
 */
function renderSidePanelCategories(categories) {
  const container = document.getElementById('sidePanelCategoriesGrid');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!categories || categories.length === 0) {
    container.innerHTML = '<div class="error-message">No categories available</div>';
    return;
  }
  
  categories.forEach(category => {
    const categoryItem = document.createElement('div');
    categoryItem.className = 'side-panel__category-item';
    categoryItem.dataset.categoryId = category.category_id;
    categoryItem.dataset.categorySlug = category.see_all_slug;
    
    // Wrap icon and name in a header div for mobile layout
    const headerDiv = document.createElement('div');
    headerDiv.className = 'side-panel__category-header-wrapper';
    
    const icon = document.createElement('span');
    icon.className = 'side-panel__category-icon';
    icon.textContent = getIconByKeywords(category.name, true);
    
    const name = document.createElement('span');
    name.className = 'side-panel__category-name';
    name.textContent = category.name;
    
    headerDiv.appendChild(icon);
    headerDiv.appendChild(name);
    categoryItem.appendChild(headerDiv);
    
    // Click handler
    categoryItem.addEventListener('click', (e) => {
      // Prevent click if clicking on a child element
      if (e.target !== categoryItem && e.target !== headerDiv && !headerDiv.contains(e.target)) {
        return;
      }
      handleCategoryClick(category, categoryItem);
    });
    
    container.appendChild(categoryItem);
  });
}

/**
 * Handle category click - different behavior for mobile vs desktop
 */
function handleCategoryClick(category, categoryElement) {
  const isDesktop = window.innerWidth >= 1200;
  
  if (isDesktop) {
    // Desktop: Show subcategories in right panel
    showSubcategoriesPanel(category);
    
    // Update active state
    document.querySelectorAll('.side-panel__category-item').forEach(item => {
      item.classList.remove('active');
    });
    categoryElement.classList.add('active');
  } else {
    // Mobile: Toggle dropdown accordion behavior
    const isExpanded = categoryElement.classList.contains('expanded');
    
    if (isExpanded) {
      // Collapse this category
      categoryElement.classList.remove('expanded');
      const dropdown = categoryElement.querySelector('.side-panel__mobile-dropdown');
      if (dropdown) {
        dropdown.remove();
      }
    } else {
      // Collapse all other categories first
      document.querySelectorAll('.side-panel__category-item').forEach(item => {
        item.classList.remove('expanded');
        const existingDropdown = item.querySelector('.side-panel__mobile-dropdown');
        if (existingDropdown) {
          existingDropdown.remove();
        }
      });
      
      // Expand this category
      categoryElement.classList.add('expanded');
      showMobileDropdown(category, categoryElement);
    }
  }
}

/**
 * Show mobile dropdown accordion for subcategories
 */
function showMobileDropdown(category, categoryElement) {
  if (!category.subcategories || category.subcategories.length === 0) {
    // If no subcategories, navigate directly
    window.location.href = `/category/${category.see_all_slug}`;
    return;
  }
  
  const dropdown = document.createElement('div');
  dropdown.className = 'side-panel__mobile-dropdown';
  
  category.subcategories.forEach(subcategory => {
    const subItem = document.createElement('div');
    subItem.className = 'side-panel__mobile-subcat';
    
    const subHeader = document.createElement('div');
    subHeader.className = 'side-panel__mobile-subcat-header';
    
    const icon = document.createElement('span');
    icon.className = 'side-panel__mobile-subcat-icon';
    icon.textContent = getIconByKeywords(subcategory.name);
    
    const name = document.createElement('span');
    name.className = 'side-panel__mobile-subcat-name';
    name.textContent = subcategory.name;
    
    subHeader.appendChild(icon);
    subHeader.appendChild(name);
    subItem.appendChild(subHeader);
    
    // Add children if they exist
    if (subcategory.children && subcategory.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'side-panel__mobile-children';
      
      subcategory.children.forEach(child => {
        const childItem = document.createElement('div');
        childItem.className = 'side-panel__mobile-child';
        
        const childIcon = document.createElement('span');
        childIcon.className = 'side-panel__mobile-child-icon';
        childIcon.textContent = getIconByKeywords(child.name);
        
        const childName = document.createElement('span');
        childName.className = 'side-panel__mobile-child-name';
        childName.textContent = child.name;
        
        childItem.appendChild(childIcon);
        childItem.appendChild(childName);
        
        childItem.addEventListener('click', (e) => {
          e.stopPropagation();
          window.location.href = child.url || `/category/${category.see_all_slug}/${subcategory.slug}/${child.slug}`;
        });
        
        childrenContainer.appendChild(childItem);
      });
      
      subItem.appendChild(childrenContainer);
      
      // Make subheader toggle children
      subHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        subItem.classList.toggle('expanded');
      });
    } else {
      // No children, navigate on click
      subHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = subcategory.url || `/category/${category.see_all_slug}/${subcategory.slug}`;
      });
    }
    
    dropdown.appendChild(subItem);
  });
  
  categoryElement.appendChild(dropdown);
}

/**
 * Show subcategories panel on desktop
 */
function showSubcategoriesPanel(category) {
  const panel = document.getElementById('sidePanelSubcategoriesPanel');
  if (!panel) return;
  
  panel.classList.remove('hidden');
  panel.innerHTML = '';
  
  if (!category.subcategories || category.subcategories.length === 0) {
    panel.innerHTML = '<div class="error-message">No subcategories available</div>';
    return;
  }
  
  category.subcategories.forEach(subcategory => {
    const subcatSection = document.createElement('div');
    subcatSection.className = 'side-panel__subcategory-section';
    
    // Add stock image
    const imageContainer = document.createElement('div');
    imageContainer.className = 'side-panel__subcategory-image';
    const img = document.createElement('img');
    img.src = getStockImage(subcategory.name);
    img.alt = subcategory.name;
    img.loading = 'lazy';
    imageContainer.appendChild(img);
    subcatSection.appendChild(imageContainer);
    
    // Subcategory title
    const titleContainer = document.createElement('div');
    titleContainer.className = 'side-panel__subcategory-title-container';
    
    const icon = document.createElement('span');
    icon.className = 'side-panel__subcategory-title-icon';
    icon.textContent = getIconByKeywords(subcategory.name);
    
    const title = document.createElement('div');
    title.className = 'side-panel__subcategory-title';
    title.textContent = subcategory.name;
    
    titleContainer.appendChild(icon);
    titleContainer.appendChild(title);
    subcatSection.appendChild(titleContainer);
    
    // Final subcategories (children) grid
    if (subcategory.children && subcategory.children.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'side-panel__final-subcategories-grid';
      
      subcategory.children.forEach(finalSub => {
        const item = document.createElement('div');
        item.className = 'side-panel__final-subcategory-item';
        
        const finalIcon = document.createElement('span');
        finalIcon.className = 'side-panel__final-subcategory-icon';
        finalIcon.textContent = getIconByKeywords(finalSub.name);
        
        const finalName = document.createElement('span');
        finalName.className = 'side-panel__final-subcategory-name';
        finalName.textContent = finalSub.name;
        
        item.appendChild(finalIcon);
        item.appendChild(finalName);
        
        item.addEventListener('click', () => {
          // Navigate to specific product category
          window.location.href = finalSub.url || `/category/${category.see_all_slug}/${subcategory.slug}/${finalSub.slug}`;
        });
        
        grid.appendChild(item);
      });
      
      subcatSection.appendChild(grid);
    }
    
    panel.appendChild(subcatSection);
  });

  // Diagnostic: report computed widths of the right column after rendering
  setTimeout(() => {
    try {
      const categoriesSection = document.querySelector('.side-panel__categories-section');
      const rightCol = document.getElementById('sidePanelSubcategoriesPanel');
      const leftCol = document.querySelector('.side-panel__categories-grid');
      
      const sectionRect = categoriesSection ? categoriesSection.getBoundingClientRect() : null;
      const leftRect = leftCol ? leftCol.getBoundingClientRect() : null;
      const rightRect = rightCol ? rightCol.getBoundingClientRect() : null;
      
      console.log('🔍 === RIGHT COLUMN WIDTH CHECK ===');
      console.log('🔍 Categories section width:', sectionRect?.width);
      console.log('🔍 Left column width:', leftRect?.width);
      console.log('🔍 Right column width:', rightRect?.width);
      console.log('🔍 Right column padding:', window.getComputedStyle(rightCol).padding);
      
      if (sectionRect && leftRect && rightRect) {
        const expectedWidth = sectionRect.width - leftRect.width;
        const actualWidth = rightRect.width;
        console.log(`🔍 Expected right width: ${Math.round(expectedWidth)}px`);
        console.log(`🔍 Actual right width: ${Math.round(actualWidth)}px`);
        console.log(`🔍 Difference: ${Math.round(Math.abs(expectedWidth - actualWidth))}px`);
      }
    } catch (err) {
      console.warn('Diagnostic widths failed:', err);
    }
  }, 100);
}

/**
 * Initialize the side panel
 */
export function initSidePanel() {
  // Set up hamburger menu toggle
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  if (hamburgerMenu && !hamburgerMenu.hasAttribute("listener-added")) {
    hamburgerMenu.addEventListener("click", toggleMenu);
    hamburgerMenu.setAttribute("listener-added", "true");
  }

  // Add click handler to the overlay
  const overlay = document.querySelector(".side-panel-overlay");
  if (overlay && !overlay.hasAttribute("listener-added")) {
    overlay.addEventListener("click", toggleMenu);
    overlay.setAttribute("listener-added", "true");
  }

  // Initialize categories
  initializeSidePanelCategories();
  
  // Set up the price alerts button
  const sidePanelAlarmBtn = document.getElementById("sidePanelAlarmBtn");
  if (sidePanelAlarmBtn && !sidePanelAlarmBtn.hasAttribute("listener-added")) {
    sidePanelAlarmBtn.addEventListener("click", () => {
      if (window.openTrackAlertsModal) {
        window.openTrackAlertsModal();
      }
      toggleMenu();
    });
    sidePanelAlarmBtn.setAttribute("listener-added", "true");
  }

  // Set up favorites button
  const favBtn = document.getElementById("sidePanelFavBtn");
  if (favBtn && !favBtn.hasAttribute("listener-added")) {
    favBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await loadAndShowFavorites();
      } catch (error) {
        console.error("Error in favorites button handler:", error);
      }
    });
    favBtn.setAttribute("listener-added", "true");
  }
  
  // Handle window resize - clean up mobile dropdowns when switching to desktop
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const isDesktop = window.innerWidth >= 1200;
      
      if (isDesktop) {
        // Clean up mobile dropdowns when switching to desktop
        document.querySelectorAll('.side-panel__mobile-dropdown').forEach(dropdown => {
          dropdown.remove();
        });
        document.querySelectorAll('.side-panel__category-item.expanded').forEach(item => {
          item.classList.remove('expanded');
        });
        
        // Hide subcategories panel and reset active states
        const subPanel = document.getElementById('sidePanelSubcategoriesPanel');
        if (subPanel) {
          subPanel.classList.add('hidden');
          subPanel.innerHTML = '';
        }
        document.querySelectorAll('.side-panel__category-item.active').forEach(item => {
          item.classList.remove('active');
        });
      } else {
        // Clean up desktop subcategories panel when switching to mobile
        const subPanel = document.getElementById('sidePanelSubcategoriesPanel');
        if (subPanel) {
          subPanel.classList.add('hidden');
          subPanel.innerHTML = '';
        }
        document.querySelectorAll('.side-panel__category-item.active').forEach(item => {
          item.classList.remove('active');
        });
      }
    }, 250); // Debounce resize events
  });
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
