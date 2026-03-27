import { showGlobalMessage } from './auth.js';
import { secureApiCall } from './api-utils.js';

// Export this function so it can be imported in product.js
export async function showPriceAlarmModal(productData) {
  // Check if user can create alerts BEFORE showing the modal
  if (window.PaymentController && typeof window.PaymentController.canCreateAlert === 'function') {
    // If user just logged in, wait a bit for migration to complete
    // Check if migration is in progress by seeing if localStorage still has alerts
    const localAlerts = JSON.parse(localStorage.getItem('localPriceAlerts') || '[]');
    if (localAlerts.length > 0) {
      // Migration might still be in progress, wait a bit
      console.log('[price-alarm] Waiting for migration to complete...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const canCreate = await window.PaymentController.canCreateAlert();
    
    if (!canCreate) {
      // User has reached their limit - show subscription modal instead
      console.log('[price-alarm] User has reached alert limit, showing subscription modal');
      
      if (typeof window.PaymentController.showLimitReachedModal === 'function') {
        window.PaymentController.showLimitReachedModal();
      } else {
        window.PaymentController.showSubscriptionModal();
      }
      return; // Don't show the price alarm modal
    }
  }
  
  // User can create alerts - show the modal
  console.log('calling _displayPriceAlarmModal');
  _displayPriceAlarmModal(productData);
}

// Extract the actual modal display logic to a separate function
function _displayPriceAlarmModal(productData) {  
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  console.log('Price alarm modal:', priceAlarmModal);
  if (!priceAlarmModal) {
    console.error('Price alarm modal element not found!');
    return;
  }
  
  // Populate product information - using correct selectors
  const productTitle = priceAlarmModal.querySelector('.product-title');
  if (productTitle) {
    productTitle.textContent = `${productData.model}`;
  } else {
    console.error('Product title element not found');
  }
  
  // Show product image
  const productImage = priceAlarmModal.querySelector('.product-image img');
  if (productImage && productData.model_image) {
    productImage.src = productData.model_image;
    productImage.alt = `${productData.brand} ${productData.model}`;
  }
  
  // Set brand
  const productBrand = priceAlarmModal.querySelector('.product-brand');
  if (productBrand) {
    productBrand.textContent = productData.brand;
  }
  
  // Show current price - using correct selector
  const priceValue = priceAlarmModal.querySelector('.price-value');
  if (priceValue) {
    // Format price appropriately
    const price = productData.current_price || 0;
    console.log('Price value found:', price);
    
    try {
      const formattedPrice = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(price);
      console.log('Formatted price:', formattedPrice);

      priceValue.textContent = formattedPrice;
      
      // Add this block to calculate percentage discounts
      const numericPrice = parseFloat(price);
      const percentageBtns = priceAlarmModal.querySelectorAll('.percentage-btn');
      
      percentageBtns.forEach(btn => {
        const percent = parseInt(btn.dataset.percent);
        const discountedPrice = Math.round(numericPrice * (1 - percent / 100));
        
        // Format the discounted price without decimals and with space
        const formattedDiscountPrice = new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(discountedPrice).replace(/KES|KSh/g, '').trim();
        
        // Update the calculated price span
        const calculatedPriceSpan = btn.querySelector('.calculated-price');
        if (calculatedPriceSpan) {
          calculatedPriceSpan.textContent = formattedDiscountPrice;
        }
      });
    } catch (err) {
      console.error('Error formatting price:', err);
      // Don't add "Ksh" here either
      priceValue.textContent = price.toString();
    }
  } else {
    console.error('Price value element not found');
  }
  
  // Set product ID on the button instead
  const setPriceAlertBtn = priceAlarmModal.querySelector('#setPriceAlert');
  if (setPriceAlertBtn && productData.product_id) {
    setPriceAlertBtn.dataset.productId = productData.product_id;
    console.log('Product ID set on button:', productData.product_id);
  }
  
  // Populate user email
  const userEmailSpan = priceAlarmModal.querySelector('#userEmail');
  const userEmail = localStorage.getItem("userEmail");
  if (userEmailSpan && userEmail) {
    userEmailSpan.textContent = userEmail;
  } else if (userEmailSpan) {
    userEmailSpan.textContent = "user@example.com"; // fallback
  }
  
  // Show modal
  priceAlarmModal.classList.remove('hidden');
  priceAlarmModal.classList.add('active'); // Add this line
  console.log('Price alarm modal:', priceAlarmModal);
  console.log('Modal should be visible now');
}

// For backward compatibility, also expose it on window
window.showPriceAlarmModal = showPriceAlarmModal;

// Close modal function
export function closePriceAlarmModal() {
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  if (priceAlarmModal) {
    priceAlarmModal.classList.add('hidden');
    priceAlarmModal.classList.remove('active'); // Add this line
  }
}

// Make it globally available
window.closePriceAlarmModal = closePriceAlarmModal;

document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM fully loaded and parsed');
  // DOM Elements
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  const closeBtn = document.querySelector('#priceAlarmModal .modal-close');
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
    changeEmailBtn.addEventListener('click', function () {
      loggedInEmailSection.style.display = 'none';
      alternateEmailSection.style.display = 'block';
    });
  }

  if (useAccountEmailBtn) {
    useAccountEmailBtn.addEventListener('click', function () {
      loggedInEmailSection.style.display = 'block';
      alternateEmailSection.style.display = 'none';
      document.getElementById('alertEmail').value = '';
    });
  }

  // Close modal on button click
  if (closeBtn) {
    closeBtn.addEventListener('click', closePriceAlarmModal);
  }

  // Close modal when clicking outside
  if (priceAlarmModal) {
    window.addEventListener('click', function(event) {
      if (event.target === priceAlarmModal) {
        closePriceAlarmModal();
      }
    });
  }

  // Handle percentage button selection
  percentageBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      percentageBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      customPriceInput.value = '';
    });
  });

  // Handle custom price input
  customPriceInput.addEventListener('focus', function () {
    percentageBtns.forEach(btn => btn.classList.remove('active'));
  });

  // After the existing DOM element references
  const customPercentageInput = document.getElementById('customPercentage');

  // Add event listener for custom percentage input
  if (customPercentageInput) {
    customPercentageInput.addEventListener('input', function() {
      // Deselect percentage buttons
      percentageBtns.forEach(btn => btn.classList.remove('active'));
      
      // Get current price and entered percentage
      const currentPrice = parseFloat(priceAlarmModal.querySelector('.price-value').textContent.replace(/[^0-9]/g, ''));
      const customPercent = parseFloat(this.value);
      
      if (!isNaN(customPercent) && customPercent > 0 && !isNaN(currentPrice)) {
        // Calculate discounted price
        const discountedPrice = Math.round(currentPrice * (1 - customPercent / 100));
        
        // Update custom price input with the calculated value
        customPriceInput.value = discountedPrice;
      }
    });
  }

  // Also update custom price input event to clear custom percentage
  customPriceInput.addEventListener('focus', function() {
    percentageBtns.forEach(btn => btn.classList.remove('active'));
    if (customPercentageInput) {
      customPercentageInput.value = '';
    }
  });

  // Submit price alert
  setPriceAlertBtn.addEventListener('click', async function () {
    const productId = this.dataset.productId;
    const alertId = this.dataset.alertId; // Will exist if editing
    const isEdit = !!alertId;

    let targetPrice;

    const activePercentBtn = document.querySelector('.percentage-btn.active');
    if (activePercentBtn) {
      const percent = parseInt(activePercentBtn.dataset.percent);
      const priceText = priceAlarmModal.querySelector('.price-value').textContent;
      const currentPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      targetPrice = Math.round(currentPrice * (1 - percent / 100));
    } else if (customPriceInput.value) {
      targetPrice = parseFloat(customPriceInput.value);
    }

    if (!targetPrice) {
      showGlobalMessage('Please select a target price', true);
      return;
    }

    // Check if editing with the same price
    if (isEdit && this.dataset.alertId) {
      const existingAlertData = priceAlarmModal.dataset.existingAlertData
        ? JSON.parse(priceAlarmModal.dataset.existingAlertData)
        : null;

      if (existingAlertData && existingAlertData.targetPrice === targetPrice) {
        showGlobalMessage('The price alert is already set to this price.', true);
        return;
      }
    }

    // Determine which email to use
    const userEmail = localStorage.getItem("userEmail");
    let emailToUse = userEmail || '';

    if (alternateEmailSection && alternateEmailSection.style.display !== 'none') {
      const altEmail = document.getElementById('alertEmail').value;
      if (altEmail) {
        emailToUse = altEmail;
      } else if (!userEmail) {
        showGlobalMessage('Please enter an email address', true);
        return;
      }
    }

    try {
      // Show loading state
      this.disabled = true;
      this.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEdit ? 'Updating' : 'Setting'} Alert...`;

      // Check if user is authenticated
      const authCheckResponse = await secureApiCall("verify-session");
      
      if (!authCheckResponse.ok) {
        // User is NOT authenticated - save to localStorage instead
        console.log("User not authenticated, saving price alert to localStorage");
        
        // Get existing alerts from localStorage
        const localAlerts = JSON.parse(localStorage.getItem("localPriceAlerts") || "[]");
        
        // Create alert object
        const alertData = {
          id: Date.now().toString(), // Temporary ID
          product_id: productId,
          target_price: targetPrice,
          email: emailToUse,
          created_at: new Date().toISOString(),
          // Store product details for display
          product_brand: priceAlarmModal.querySelector('.product-brand')?.textContent,
          product_model: priceAlarmModal.querySelector('.product-title')?.textContent,
          product_image: priceAlarmModal.querySelector('.product-image img')?.src,
          current_price: parseFloat(priceAlarmModal.querySelector('.price-value').textContent.replace(/[^0-9.]/g, ''))
        };
        
        // Check if alert already exists for this product
        const existingIndex = localAlerts.findIndex(alert => alert.product_id === productId);
        if (existingIndex !== -1) {
          // Update existing alert
          localAlerts[existingIndex] = alertData;
          showGlobalMessage('Price alert updated locally! Sign in to sync across devices.');
        } else {
          // Add new alert
          localAlerts.push(alertData);
          showGlobalMessage('Price alert saved locally! Sign in to sync across devices.');
        }
        
        localStorage.setItem("localPriceAlerts", JSON.stringify(localAlerts));
        closePriceAlarmModal();
        
        // Notify track-alerts.js that alerts were updated
        document.dispatchEvent(new CustomEvent('priceAlertsUpdated'));
        
        // Reset button
        this.disabled = false;
        this.innerHTML = isEdit ? 'Update Price Alert' : 'Set Price Alert';
        return;
      }

      // User IS authenticated - save to server
      const response = await secureApiCall(
        isEdit ? `price-alerts/${alertId}` : 'price-alerts', 
        {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify({
            product_id: productId,
            target_price: targetPrice,
            alternate_email: userEmail !== emailToUse ? emailToUse : null
          })
        }
      );

      if (!response.ok) {
        // Parse the error response to get the specific message
        const errorData = await response.json();
        const errorMessage = errorData.detail || `Failed to ${isEdit ? 'update' : 'create'} price alert`;
        
        // Handle specific error cases
        if (response.status === 400 && errorMessage.includes("Price alert already exists")) {
          // Show a user-friendly message with options
          showGlobalMessage('You already have a price alert set for this product. Please edit it instead.', true);
          return;
        } else {
          throw new Error(errorMessage);
        }
      }

      const result = await response.json();

      // Update UI and alerts
      showGlobalMessage(`Price alert has been ${isEdit ? 'updated' : 'set'}! We will notify you when the price drops.`);
      closePriceAlarmModal();

      // Refresh alerts badge count and alert list
      setTimeout(() => {
        if (window.updateAlertsBadge) {
          window.updateAlertsBadge();
        }
        if (window.refreshAlertsList) {
          window.refreshAlertsList();
        }
      }, 500);
    } catch (error) {
      console.error('Error setting price alert:', error);
      showGlobalMessage(error.message || 'Failed to set price alert. Please try again.', true);
    } finally {
      // Reset button
      this.disabled = false;
      this.innerHTML = isEdit ? 'Update Price Alert' : 'Set Price Alert';
    }
  });
});