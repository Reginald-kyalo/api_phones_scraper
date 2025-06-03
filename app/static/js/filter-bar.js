document.addEventListener('DOMContentLoaded', function() {
  // Toggle filter sections
  const filterHeaders = document.querySelectorAll('.filter-box__header--clickable');
  
  filterHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const content = this.nextElementSibling;
      const icon = this.querySelector('.filter-box__toggle-icon');
      
      // Toggle content visibility
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.classList.add('filter-box__toggle-icon--expanded');
      } else {
        content.style.display = 'none';
        icon.classList.remove('filter-box__toggle-icon--expanded');
      }
    });
  });
  
  // Mobile filter sidebar toggle
  const filterToggleButton = document.createElement('button');
  filterToggleButton.className = 'filter-toggle-button';
  filterToggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"></path></svg>';
  document.body.appendChild(filterToggleButton);
  
  filterToggleButton.addEventListener('click', function() {
    const sidebar = document.querySelector('.filter-sidebar');
    sidebar.classList.add('filter-sidebar--open');
  });
  
  // Close button for mobile filter sidebar
  const closeFilterButton = document.querySelector('.filter-sidebar__close-button');
  closeFilterButton.addEventListener('click', function() {
    const sidebar = document.querySelector('.filter-sidebar');
    sidebar.classList.remove('filter-sidebar--open');
  });
  
  // Price slider functionality
  const minInput = document.querySelector('.price-range-form__input:first-child input');
  const maxInput = document.querySelector('.price-range-form__input:last-of-type input');
  const leftHandle = document.querySelector('.price-slider__handle--left');
  const rightHandle = document.querySelector('.price-slider__handle--right');
  const selectedRange = document.querySelector('.price-slider__selected-range');
  const rail = document.querySelector('.price-slider__rail');
  
  // Initialize price slider positions
  updatePriceSlider();
  
  // Update slider when inputs change
  minInput.addEventListener('input', updatePriceSlider);
  maxInput.addEventListener('input', updatePriceSlider);
  
  function updatePriceSlider() {
    const min = parseInt(minInput.value) || 0;
    const max = parseInt(maxInput.value) || 200000;
    const maxPossible = 200000; // Maximum possible price
    
    const leftPos = (min / maxPossible) * 100;
    const rightPos = (max / maxPossible) * 100;
    
    leftHandle.style.left = leftPos + '%';
    rightHandle.style.left = rightPos + '%';
    selectedRange.style.left = leftPos + '%';
    selectedRange.style.width = (rightPos - leftPos) + '%';
  }
  
  // Additional functionality for the filter-bar
  // Product finder interaction
  const answerButtons = document.querySelectorAll('.product-finder__answer-button, .product-finder__skip-button');
  
  answerButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Here you would typically implement logic to show the next question
      const conversation = document.querySelector('.product-finder__conversation');
      conversation.innerHTML = '<p class="product-finder__question">What screen size do you prefer?</p>' +
        '<button class="button__default product-finder__answer-button">Small (under 6 inches)</button>' +
        '<button class="button__default product-finder__answer-button">Medium (6-6.5 inches)</button>' +
        '<button class="button__default product-finder__answer-button">Large (over 6.5 inches)</button>' +
        '<button class="button__default product-finder__skip-button">Not important</button>' +
        '<p class="product-finder__explanation">Larger screens are better for media consumption, but smaller phones are more comfortable to hold.</p>';
        
      // Re-attach event listeners to new buttons
      const newButtons = conversation.querySelectorAll('.product-finder__answer-button, .product-finder__skip-button');
      newButtons.forEach(newButton => {
        newButton.addEventListener('click', handleNextProductFinderQuestion);
      });
    });
  });
  
  function handleNextProductFinderQuestion() {
    // This is a simple example - in a real app, you'd implement more sophisticated logic
    const conversation = document.querySelector('.product-finder__conversation');
    conversation.innerHTML = '<p class="product-finder__question">What is your budget range?</p>' +
      '<button class="button__default product-finder__answer-button">Budget (under Ksh 20,000)</button>' +
      '<button class="button__default product-finder__answer-button">Mid-range (Ksh 20,000 - 50,000)</button>' +
      '<button class="button__default product-finder__answer-button">Premium (over Ksh 50,000)</button>' +
      '<button class="button__default product-finder__skip-button">Not important</button>' +
      '<p class="product-finder__explanation">Your budget will determine the features and quality you can expect.</p>';
  }
  
  // Toggle switch for showing used products
  const usedProductsSwitch = document.querySelector('.filter-switch__toggle input');
  if (usedProductsSwitch) {
    usedProductsSwitch.addEventListener('change', function() {
      // Add implementation for showing/hiding used products
      console.log('Used products display toggled:', this.checked);
    });
  }
});