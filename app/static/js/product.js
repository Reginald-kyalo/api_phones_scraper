document.addEventListener("DOMContentLoaded", () => {
  // Handle scales button and comparison panel toggling for each product
  document.querySelectorAll('.product').forEach(product => {
    const scalesButton = product.querySelector('.scales-button');
    const comparisonPanel = product.querySelector('.comparison-panel');
    const closePanel = product.querySelector('.close-panel');

    if (scalesButton && comparisonPanel && closePanel) {
      scalesButton.addEventListener('click', function(event) {
        event.stopPropagation();
        comparisonPanel.classList.toggle('active');
        scalesButton.classList.toggle('active');
      });

      closePanel.addEventListener('click', function(event) {
        event.stopPropagation();
        comparisonPanel.classList.remove('active');
        scalesButton.classList.remove('active');
      });

      document.addEventListener('click', function(event) {
        if (!event.target.closest('.comparison-panel') && !event.target.closest('.scales-button')) {
          comparisonPanel.classList.remove('active');
          scalesButton.classList.remove('active');
        }
      });
    }
  });

  // Alarm button interaction for each product
  document.querySelectorAll('.alarm-button').forEach(button => {
    button.addEventListener('click', function() {
      alert('Price alarm has been set. We will notify you when the price drops!');
    });
  });

  // Merchant list items click handling: open target URL in a new tab
  document.querySelectorAll('.merchant-list li').forEach(item => {
    item.addEventListener('click', function() {
      const merchantURL = this.dataset.url;
      if (merchantURL) {
        window.open(merchantURL, '_blank');
      }
    });
  });
});
