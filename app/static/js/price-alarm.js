import { showGlobalMessage } from './auth.js';

// Export this function so it can be imported in product.js
export function showPriceAlarmModal(productData) {
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  const percentageBtns = document.querySelectorAll('.percentage-btn');
  const customPriceInput = document.getElementById('customPrice');
  const setPriceAlertBtn = document.getElementById('setPriceAlert');

  if (productData._existingAlert) {
    priceAlarmModal.dataset.existingAlertData = JSON.stringify(productData._existingAlert);
  } else {
    delete priceAlarmModal.dataset.existingAlertData;
  }

  // Check if this is an edit operation
  const isEdit = productData._existingAlert !== undefined;
  const existingAlertData = productData._existingAlert || {};

  // Update button text for edit mode
  if (isEdit) {
    setPriceAlertBtn.innerHTML = 'Update Price Alert';
    setPriceAlertBtn.dataset.alertId = existingAlertData.id;
    
    // Also update the modal heading
    const modalHeading = priceAlarmModal.querySelector('.price-alarm-header h2');
    if (modalHeading) {
      modalHeading.textContent = 'Update Price Alert';
    }
  } else {
    setPriceAlertBtn.innerHTML = 'Set Price Alert';
    delete setPriceAlertBtn.dataset.alertId;
    
    // Reset the modal heading for new alerts
    const modalHeading = priceAlarmModal.querySelector('.price-alarm-header h2');
    if (modalHeading) {
      modalHeading.textContent = 'Set Price Alert';
    }
  }

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
    const discountedPrice = Math.round(price * (1 - percent / 100));
    btn.querySelector('.calculated-price').textContent = `Ksh ${discountedPrice}`;

    // If editing, check if this percentage matches the target price
    if (isEdit) {
      const targetPrice = existingAlertData.targetPrice;
      // Remove active from all buttons first
      btn.classList.remove('active');

      // If this percentage button matches the target price within a small margin
      if (Math.abs(discountedPrice - targetPrice) < 1) {
        btn.classList.add('active');
        customPriceInput.value = '';
      }
    }
  });

  // Set custom price placeholder
  customPriceInput.placeholder = `Less than ${price}`;

  // If we're editing and no percentage button was selected, use custom input
  if (isEdit && !document.querySelector('.percentage-btn.active')) {
    customPriceInput.value = existingAlertData.targetPrice;
  }

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
    // If editing with a different email
    if (isEdit && existingAlertData.email !== userEmail) {
      loggedInEmailSection.style.display = 'none';
      alternateEmailSection.style.display = 'block';
      const altEmailInput = document.getElementById('alertEmail');
      if (altEmailInput) {
        altEmailInput.value = existingAlertData.email;
      }
    } else {
      loggedInEmailSection.style.display = 'block';
      alternateEmailSection.style.display = 'none';
    }
  }

  // Show modal
  priceAlarmModal.classList.add('active');
  priceAlarmModal.classList.remove('hidden');
}

// For backward compatibility, also expose it on window
window.showPriceAlarmModal = showPriceAlarmModal;

// Add this function after the showPriceAlarmModal function
function closeModal() {
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  if (priceAlarmModal) {
    priceAlarmModal.classList.remove('active');
    setTimeout(() => {
      priceAlarmModal.classList.add('hidden');
    }, 300);
  }
}

// Make it globally available
window.closePriceAlarmModal = closeModal;

document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const priceAlarmModal = document.getElementById('priceAlarmModal');
  const closeModalBtn = document.querySelector('.price-alarm-close'); // Updated to use the global var
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
  closeModalBtn.addEventListener('click', function () {
    closeModal(); // Use the shared close function
  });

  // Close modal when clicking outside
  priceAlarmModal.addEventListener('click', function (e) {
    if (e.target === priceAlarmModal) {
      closeModal();
    }
  });

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

  // Submit price alert
  setPriceAlertBtn.addEventListener('click', async function () {
    const productId = this.dataset.productId;
    const alertId = this.dataset.alertId; // Will exist if editing
    const isEdit = !!alertId;

    let targetPrice;

    const activePercentBtn = document.querySelector('.percentage-btn.active');
    if (activePercentBtn) {
      const percent = parseInt(activePercentBtn.dataset.percent);
      const currentPrice = parseFloat(priceAlarmModal.querySelector('.price-value').textContent.replace('Ksh ', ''));
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
    let emailToUse = userEmail; // Default to account email

    // If alternate email section is visible and has a value, use that instead
    if (alternateEmailSection && alternateEmailSection.style.display !== 'none') {
      const altEmail = document.getElementById('alertEmail').value;
      if (altEmail) {
        emailToUse = altEmail;
      } else {
        showGlobalMessage('Please enter an email address or use your account email', true);
        return;
      }
    }

    // Get auth token
    const token = localStorage.getItem("token");
    if (!token) {
      showGlobalMessage('Please log in to set a price alert', true);
      closeModal();
      if (window.showAuthModal) {
        localStorage.setItem("pendingPriceAlarm", productId);
        window.showAuthModal();
      }
      return;
    }

    // API endpoint and method change based on whether this is an edit or create
    const endpoint = isEdit ? `/api/price-alerts/${alertId}` : '/api/price-alerts';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      // Show loading state
      this.disabled = true;
      this.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEdit ? 'Updating' : 'Setting'} Alert...`;

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: productId,
          target_price: targetPrice,
          alternate_email: userEmail !== emailToUse ? emailToUse : null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} price alert`);
      }

      const result = await response.json();

      // Update UI and alerts
      showGlobalMessage(`Price alert has been ${isEdit ? 'updated' : 'set'}! We will notify you when the price drops.`);
      closeModal();

      // Refresh alerts badge count and alert list
      setTimeout(() => {
        if (window.updateAlertsBadge) {
          window.updateAlertsBadge();
        }

        // Also refresh the alerts list if modal is open
        if (window.refreshAlertsList) {
          window.refreshAlertsList();
        }
      }, 500);
    } catch (error) {
      console.error('Error setting price alert:', error);
      showGlobalMessage('Failed to set price alert. Please try again.', true);
    } finally {
      // Reset button
      this.disabled = false;
      this.innerHTML = isEdit ? 'Update Price Alert' : 'Set Price Alert';
    }
  });
});