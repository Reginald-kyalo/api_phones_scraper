/**
 * Category Navigation System
 * Handles 3-level hierarchical category navigation (Main > Sub > Final)
 */

import { getIconByKeywords } from './comprehensive-icon-map.js';

class CategoryNavigator {
  constructor() {
    this.categoriesData = null;
    this.currentLevel = 'main'; // 'main', 'sub', 'final'
    this.selectedMain = null;
    this.selectedSub = null;
    this.init();
  }

  async init() {
    try {
      console.log('🔍 CategoryNavigator initializing...');
      await this.loadCategories();
      console.log('🔍 Categories loaded, rendering...');
      this.renderMainCategories();
      console.log('🔍 Main categories rendered');
      this.setupEventListeners();
      console.log('🔍 Event listeners setup complete');
    } catch (error) {
      console.error('❌ Failed to initialize category navigator:', error);
    }
  }

  async loadCategories() {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (data.success) {
        this.categoriesData = data.categories;
        console.log(`Loaded ${data.count} categories`);
      } else {
        throw new Error('Failed to load categories');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      throw error;
    }
  }

  /**
   * Render main category buttons (Level 1)
   */
  renderMainCategories() {
    const container = document.getElementById('selector-container');
    if (!container) return;

    container.innerHTML = '';

    // Create wrapper for main categories
    const mainWrapper = document.createElement('div');
    mainWrapper.classList.add('categories-wrapper');
    mainWrapper.id = 'main-categories-wrapper';

    // Create left scroll arrow
    const leftArrow = document.createElement('button');
    leftArrow.classList.add('category-scroll-arrow', 'left-arrow', 'hidden');
    leftArrow.innerHTML = '&#10094;';
    leftArrow.setAttribute('aria-label', 'Scroll categories left');

    // Create right scroll arrow
    const rightArrow = document.createElement('button');
    rightArrow.classList.add('category-scroll-arrow', 'right-arrow');
    rightArrow.innerHTML = '&#10095;';
    rightArrow.setAttribute('aria-label', 'Scroll categories right');

    // Create scrollable container for main categories
    const categoriesContainer = document.createElement('div');
    categoriesContainer.classList.add('categories-row', 'scrollable-categories', 'main-categories');
    categoriesContainer.id = 'main-categories-container';

    // Add Home button only on product pages (not on mainpage)
    const isMainPage = document.querySelector('.main-page-container') !== null;
    if (!isMainPage) {
      const homeButton = this.createCategoryButton({
        name: 'Home',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>`,
        onClick: () => {
          window.location.href = '/';
        },
        isHome: true
      });
      categoriesContainer.appendChild(homeButton);
    }

    // Add all main categories
    if (this.categoriesData && this.categoriesData.length > 0) {
      this.categoriesData.forEach(category => {
        const button = this.createCategoryButton({
          name: category.name,
          icon: getIconByKeywords(category.name, true),
          onClick: () => this.handleMainCategoryClick(category),
          data: category
        });
        categoriesContainer.appendChild(button);
      });
    }

    // Assemble the wrapper
    mainWrapper.appendChild(leftArrow);
    mainWrapper.appendChild(categoriesContainer);
    mainWrapper.appendChild(rightArrow);
    container.appendChild(mainWrapper);

    // Setup scroll functionality
    this.setupScrollArrows(categoriesContainer, leftArrow, rightArrow);
  }

  /**
   * Render subcategories (Level 2)
   */
  renderSubCategories(mainCategory) {
    const container = document.getElementById('selector-container');
    if (!container) return;

    // Remove existing sub and final categories
    const existingSub = document.getElementById('sub-categories-wrapper');
    const existingFinal = document.getElementById('final-categories-wrapper');
    if (existingSub) existingSub.remove();
    if (existingFinal) existingFinal.remove();

    if (!mainCategory.subcategories || mainCategory.subcategories.length === 0) {
      return;
    }

    // Create wrapper for subcategories
    const subWrapper = document.createElement('div');
    subWrapper.classList.add('categories-wrapper', 'sub-level');
    subWrapper.id = 'sub-categories-wrapper';

    // Create title (on the left)
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('category-level-header');
    titleDiv.innerHTML = `<span class="category-level-title">${mainCategory.name}</span>`;
    
    // Create close button (on the right)
    const closeBtn = document.createElement('button');
    closeBtn.classList.add('category-close-btn');
    closeBtn.setAttribute('aria-label', 'Close subcategories');
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    
    // Add close functionality
    closeBtn.addEventListener('click', () => {
      subWrapper.remove();
      this.selectedMain = null;
      this.currentLevel = 'main';
      // Deselect main category button
      document.querySelectorAll('.selector-button.main-category.active').forEach(btn => {
        btn.classList.remove('active');
      });
    });

    // Create container for subcategories (grid layout)
    const subContainer = document.createElement('div');
    subContainer.classList.add('categories-row', 'scrollable-categories', 'sub-categories');
    subContainer.id = 'sub-categories-container';

    // Add all subcategories with icons
    mainCategory.subcategories.forEach(subCategory => {
      const icon = getIconByKeywords(subCategory.name);
      const button = this.createCategoryButton({
        name: subCategory.name,
        icon: icon,
        onClick: () => this.handleSubCategoryClick(mainCategory, subCategory),
        data: subCategory,
        level: 'sub',
        badge: subCategory.child_count ? `${subCategory.child_count}` : null
      });
      subContainer.appendChild(button);
    });

    // Assemble the wrapper with new layout
    subWrapper.appendChild(titleDiv);
    subWrapper.appendChild(subContainer);
    subWrapper.appendChild(closeBtn);
    container.appendChild(subWrapper);

    // Scroll into view smoothly
    setTimeout(() => {
      subWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  /**
   * Render final subcategories (Level 3)
   */
  renderFinalSubCategories(mainCategory, subCategory) {
    const container = document.getElementById('selector-container');
    if (!container) return;

    // Remove existing final categories
    const existingFinal = document.getElementById('final-categories-wrapper');
    if (existingFinal) existingFinal.remove();

    if (!subCategory.children || subCategory.children.length === 0) {
      // Navigate to subcategory page if no children
      window.location.href = subCategory.url || '#';
      return;
    }

    // Create wrapper for final subcategories
    const finalWrapper = document.createElement('div');
    finalWrapper.classList.add('categories-wrapper', 'final-level');
    finalWrapper.id = 'final-categories-wrapper';

    // Create title (on the left)
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('category-level-header');
    titleDiv.innerHTML = `<span class="category-level-title">${subCategory.name}</span>`;
    
    // Create close button (on the right)
    const closeBtn = document.createElement('button');
    closeBtn.classList.add('category-close-btn');
    closeBtn.setAttribute('aria-label', 'Close final subcategories');
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    
    // Add close functionality
    closeBtn.addEventListener('click', () => {
      finalWrapper.remove();
      this.selectedSub = null;
      this.currentLevel = 'sub';
      // Deselect sub category button
      document.querySelectorAll('.selector-button.sub-category.active').forEach(btn => {
        btn.classList.remove('active');
      });
    });

    // Create container for final subcategories (grid layout)
    const finalContainer = document.createElement('div');
    finalContainer.classList.add('categories-row', 'scrollable-categories', 'final-categories');
    finalContainer.id = 'final-categories-container';

    // Add all final subcategories
    subCategory.children.forEach(finalSub => {
      const button = this.createCategoryButton({
        name: finalSub.name,
        icon: null,
        onClick: () => this.handleFinalCategoryClick(finalSub),
        data: finalSub,
        level: 'final'
      });
      finalContainer.appendChild(button);
    });

    // Assemble the wrapper with new layout
    finalWrapper.appendChild(titleDiv);
    finalWrapper.appendChild(finalContainer);
    finalWrapper.appendChild(closeBtn);
    container.appendChild(finalWrapper);

    // Scroll into view smoothly
    setTimeout(() => {
      finalWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  /**
   * Create a category button element
   */
  createCategoryButton({ name, icon, onClick, data, isHome = false, level = 'main', badge = null }) {
    const button = document.createElement('button');
    button.classList.add('selector-button', 'category-btn');
    
    if (isHome) {
      button.classList.add('home-button');
      button.innerHTML = icon;
      button.setAttribute('title', 'Home');
    } else {
      button.classList.add(`${level}-category`);
      
      if (icon) {
        button.innerHTML = `
          <span class="category-icon">${icon}</span>
          <span class="category-name">${name}</span>
        `;
      } else {
        button.innerHTML = `<span class="category-name">${name}</span>`;
      }
      
      if (badge) {
        const badgeEl = document.createElement('span');
        badgeEl.classList.add('category-badge');
        badgeEl.textContent = badge;
        button.appendChild(badgeEl);
      }
      
      button.setAttribute('title', name);
    }
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    
    if (data) {
      button.dataset.category = JSON.stringify(data);
    }
    
    return button;
  }

  /**
   * Handle main category click (Level 1)
   */
  handleMainCategoryClick(category) {
    // Mark as selected
    this.selectedMain = category;
    this.selectedSub = null;
    this.currentLevel = 'sub';
    
    // Update active state
    document.querySelectorAll('.selector-button.main-category').forEach(btn => {
      btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Render subcategories
    this.renderSubCategories(category);
  }

  /**
   * Handle subcategory click (Level 2)
   */
  handleSubCategoryClick(mainCategory, subCategory) {
    // Mark as selected
    this.selectedSub = subCategory;
    this.currentLevel = 'final';
    
    // Update active state
    document.querySelectorAll('.selector-button.sub-category').forEach(btn => {
      btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Render final subcategories or navigate
    this.renderFinalSubCategories(mainCategory, subCategory);
  }

  /**
   * Handle final category click (Level 3)
   */
  handleFinalCategoryClick(finalCategory) {
    // Navigate to the final category page
    window.location.href = finalCategory.url || '#';
  }

  /**
   * Setup scroll arrows for a container
   */
  setupScrollArrows(container, leftArrow, rightArrow) {
    leftArrow.addEventListener('click', () => {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    });
    
    rightArrow.addEventListener('click', () => {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    });
    
    // Update arrow visibility based on scroll position
    const updateArrowVisibility = () => {
      const threshold = 50;
      
      const showLeft = container.scrollLeft > threshold;
      leftArrow.classList.toggle('hidden', !showLeft);
      
      const scrollableDistance = container.scrollWidth - container.clientWidth;
      const showRight = container.scrollLeft < scrollableDistance - threshold;
      rightArrow.classList.toggle('hidden', !showRight);
    };
    
    updateArrowVisibility();
    container.addEventListener('scroll', updateArrowVisibility);
    window.addEventListener('resize', updateArrowVisibility);
    
    // Mouse wheel horizontal scroll
    container.addEventListener('wheel', function(event) {
      if (event.deltaY !== 0) {
        event.preventDefault();
        this.scrollLeft += event.deltaY * 2;
      }
    }, { passive: false });
  }

  setupEventListeners() {
    // Add click outside to close functionality
    document.addEventListener('click', (event) => {
      const container = document.getElementById('selector-container');
      if (!container) return;
      
      // Check if click is outside the category navigator
      const isClickInsideNavigator = container.contains(event.target);
      const isHamburgerClick = event.target.closest('.hamburger-menu');
      
      if (!isClickInsideNavigator && !isHamburgerClick) {
        // Close sub and final categories
        const subWrapper = document.getElementById('sub-categories-wrapper');
        const finalWrapper = document.getElementById('final-categories-wrapper');
        
        if (subWrapper) {
          subWrapper.remove();
          this.selectedMain = null;
          this.currentLevel = 'main';
          // Deselect all main category buttons
          document.querySelectorAll('.selector-button.main-category.active').forEach(btn => {
            btn.classList.remove('active');
          });
        }
        
        if (finalWrapper) {
          finalWrapper.remove();
          this.selectedSub = null;
          if (this.currentLevel === 'final') {
            this.currentLevel = 'sub';
          }
          // Deselect all sub category buttons
          document.querySelectorAll('.selector-button.sub-category.active').forEach(btn => {
            btn.classList.remove('active');
          });
        }
      }
    });
  }
}

// Initialize when DOM is ready - On all pages with selector-container
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('selector-container');
  
  if (container) {
    console.log('Initializing category navigator');
    window.categoryNavigator = new CategoryNavigator();
  }
});
