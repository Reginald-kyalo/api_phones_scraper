import { showGlobalMessage } from './auth.js';

// Export this function so it can be imported in product.js
export function showPriceAlarmModal(productData) {
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  const percentageBtns = document.querySelectorAll('.percentage-btn');
  const customPriceInput = document.getElementById('customPrice');
  const setPriceAlertBtn = document.getElementById('setPriceAlert');
  
  // Fill product details
  const productImage = priceAlarmModal.querySelector('.product-image img');
  productImage.src = productData.model_image;
  productImage.alt = `${productData.brand} ${productData.model}`;
  
  priceAlarmModal.querySelector('.product-title').textContent = productData.model;
  priceAlarmModal.querySelector('.product-brand').textContent = productData.brand;
  priceAlarmModal.querySelector('.price-value').textContent = `Ksh ${productData.cheapest_price}`;
  
  // Calculate percentage discounts
  const price = parseFloat(productData.cheapest_price);
  percentageBtns.forEach(btn => {
    const percent = parseInt(btn.dataset.percent);
    const discountedPrice = Math.round(price * (1 - percent/100));
    btn.querySelector('.calculated-price').textContent = `Ksh ${discountedPrice}`;
  });
  
  // Set custom price placeholder
  customPriceInput.placeholder = `Less than ${price}`;
  
  // Store product ID for submission
  setPriceAlertBtn.dataset.productId = productData._id;

  // Update user email - retrieve fresh from localStorage
  const userEmail = localStorage.getItem("userEmail");
  const userEmailDisplay = priceAlarmModal.querySelector('#userEmail');
  if (userEmailDisplay) {
    userEmailDisplay.textContent = userEmail || 'your account email';
  }
  
  // Reset the email UI to show account email by default
  const loggedInEmailSection = priceAlarmModal.querySelector('.logged-in-email');
  const alternateEmailSection = priceAlarmModal.querySelector('.alternate-email');
  if (loggedInEmailSection && alternateEmailSection) {
    loggedInEmailSection.style.display = 'block';
    alternateEmailSection.style.display = 'none';
  }
  
  // Show modal
  priceAlarmModal.classList.add('active');
  priceAlarmModal.classList.remove('hidden');
}

// For backward compatibility, also expose it on window
window.showPriceAlarmModal = showPriceAlarmModal;

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  const closeModalBtn = document.querySelector('.price-alarm-close'); // Updated class name
  const percentageBtns = document.querySelectorAll('.percentage-btn');
  const customPriceInput = document.getElementById('customPrice');
  const setPriceAlertBtn = document.getElementById('setPriceAlert');
  
  // Email toggle UI elements
  const changeEmailBtn = document.getElementById('changeEmailBtn');
  const useAccountEmailBtn = document.getElementById('useAccountEmailBtn');
  const loggedInEmailSection = document.querySelector('.logged-in-email');
  const alternateEmailSection = document.querySelector('.alternate-email');

  
  // Toggle between account email and alternative email
  if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', function() {
      loggedInEmailSection.style.display = 'none';
      alternateEmailSection.style.display = 'block';
    });
  }
  
  if (useAccountEmailBtn) {
    useAccountEmailBtn.addEventListener('click', function() {
      loggedInEmailSection.style.display = 'block';
      alternateEmailSection.style.display = 'none';
      document.getElementById('alertEmail').value = '';
    });
  }
  
  // Close modal on button click
  closeModalBtn.addEventListener('click', function() {
    priceAlarmModal.classList.remove('active');
    setTimeout(() => {
      priceAlarmModal.classList.add('hidden');
    }, 300);
  });
  
  // Close modal when clicking outside
  priceAlarmModal.addEventListener('click', function(e) {
    if (e.target === priceAlarmModal) {
      closeModalBtn.click();
    }
  });
  
  // Handle percentage button selection
  percentageBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      percentageBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      customPriceInput.value = '';
    });
  });
  
  // Handle custom price input
  customPriceInput.addEventListener('focus', function() {
    percentageBtns.forEach(btn => btn.classList.remove('active'));
  });
  
  // Submit price alert
  setPriceAlertBtn.addEventListener('click', function() {
    const productId = this.dataset.productId;
    let targetPrice;
    
    const activePercentBtn = document.querySelector('.percentage-btn.active');
    if (activePercentBtn) {
      const percent = parseInt(activePercentBtn.dataset.percent);
      const currentPrice = parseFloat(priceAlarmModal.querySelector('.price-value').textContent.replace('Ksh ', ''));
      targetPrice = Math.round(currentPrice * (1 - percent/100));
    } else if (customPriceInput.value) {
      targetPrice = parseFloat(customPriceInput.value);
    }
    
    if (!targetPrice) {
      showGlobalMessage('Please select a target price', true);
      return;
    }
    
    // Determine which email to use
    let emailToUse = userEmail; // Default to account email
    
    // If alternate email section is visible and has a value, use that instead
    if (alternateEmailSection.style.display !== 'none') {
      const altEmail = document.getElementById('alertEmail').value;
      if (altEmail) {
        emailToUse = altEmail;
      } else {
        showGlobalMessage('Please enter an email address or use your account email', true);
        return;
      }
    }
    
    // Rest of your code...
    console.log("Setting price alert:", { productId, email: emailToUse, targetPrice });
    
    showGlobalMessage('Price alert has been set! We will notify you when the price drops.');
    closeModalBtn.click();
  });
});