/**
 * Shows a modal with standardized animations
 * @param {string} modalSelector - CSS selector for the modal (e.g., '#auth-modal')
 */
export function showModal(modalSelector) {
  const modal = document.querySelector(modalSelector);
  
  // Reset any previous animations
  modal.style.animation = '';
  
  // Make sure display is set to flex before animation starts
  modal.style.display = 'flex';
  
  // Force a reflow before starting animation
  void modal.offsetWidth;
  
  // Apply animations
  modal.style.animation = 'fadeIn 0.3s forwards';
  
  const content = modal.querySelector('[class$="-content"]');
  if (content) {
    content.style.animation = '';
    void content.offsetWidth;
    content.style.animation = 'slideDown 0.4s forwards';
  }
}

/**
 * Hides a modal with standardized animations
 * @param {string} modalSelector - CSS selector for the modal (e.g., '#auth-modal')
 */
export function hideModal(modalSelector) {
  const modal = document.querySelector(modalSelector);
  modal.style.animation = 'fadeOut 0.3s forwards';
  
  const content = modal.querySelector('[class$="-content"]');
  if (content) {
    content.style.animation = 'slideUp 0.4s forwards';
  }
  
  // Hide after animation completes
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}