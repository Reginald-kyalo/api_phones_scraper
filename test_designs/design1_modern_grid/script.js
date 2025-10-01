// Modern Grid Layout - JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
    }
    
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    const heroSearchInput = document.querySelector('.hero-search-input');
    const searchBtns = document.querySelectorAll('.search-btn, .hero-search-btn');
    
    searchBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const input = this.closest('.search-container, .hero-search').querySelector('input');
            if (input && input.value.trim()) {
                performSearch(input.value.trim());
            }
        });
    });
    
    // Enter key search
    [searchInput, heroSearchInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.value.trim()) {
                        performSearch(this.value.trim());
                    }
                }
            });
        }
    });
    
    // Favorite buttons
    const favoriteBtns = document.querySelectorAll('.favorite-btn');
    favoriteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                this.style.color = '#f56565';
                showNotification('Added to favorites!', 'success');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                this.style.color = '';
                showNotification('Removed from favorites!', 'info');
            }
        });
    });
    
    // Category cards
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const categoryName = this.querySelector('h3').textContent;
            showNotification(`Exploring ${categoryName} category...`, 'info');
            // Here you would typically navigate to the category page
            setTimeout(() => {
                window.location.href = `#category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
            }, 500);
        });
    });
    
    // Product actions
    const compareBtns = document.querySelectorAll('.compare-btn');
    const alertBtns = document.querySelectorAll('.alert-btn');
    
    compareBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const productName = this.closest('.product-card').querySelector('h3').textContent;
            showNotification(`${productName} added to comparison!`, 'success');
        });
    });
    
    alertBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const productName = this.closest('.product-card').querySelector('h3').textContent;
            showNotification(`Price alert set for ${productName}!`, 'success');
        });
    });
    
    // Header actions
    const favoritesHeaderBtn = document.querySelector('.favorites-btn');
    const alertsHeaderBtn = document.querySelector('.alerts-btn');
    const loginBtn = document.querySelector('.login-btn');
    
    if (favoritesHeaderBtn) {
        favoritesHeaderBtn.addEventListener('click', function() {
            showNotification('Opening favorites...', 'info');
        });
    }
    
    if (alertsHeaderBtn) {
        alertsHeaderBtn.addEventListener('click', function() {
            showNotification('Opening price alerts...', 'info');
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            showNotification('Opening login modal...', 'info');
        });
    }
    
    // Newsletter subscription
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        const newsletterBtn = newsletterForm.querySelector('button');
        const newsletterInput = newsletterForm.querySelector('input');
        
        newsletterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (newsletterInput.value.trim() && isValidEmail(newsletterInput.value)) {
                showNotification('Successfully subscribed to newsletter!', 'success');
                newsletterInput.value = '';
            } else {
                showNotification('Please enter a valid email address!', 'error');
            }
        });
    }
    
    // Popular searches
    const popularSearches = document.querySelectorAll('.popular-searches a');
    popularSearches.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const searchTerm = this.textContent;
            performSearch(searchTerm);
        });
    });
    
    // Smooth scrolling for internal links
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.category-card, .product-card, .feature-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });
});

// Utility functions
function performSearch(query) {
    showNotification(`Searching for "${query}"...`, 'info');
    // Here you would typically make an API call or redirect to search results
    console.log('Performing search for:', query);
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 24px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '1000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    });
    
    // Set background color based on type
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        warning: '#ed8936',
        info: '#667eea'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        animation: slideUp 0.6s ease forwards;
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .mobile-menu-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-menu-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    @media (max-width: 768px) {
        .nav-menu.active {
            display: flex;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-top: 1px solid var(--gray-200);
        }
        
        .nav-menu.active a {
            padding: 12px 0;
            border-bottom: 1px solid var(--gray-200);
        }
        
        .nav-menu.active a:last-child {
            border-bottom: none;
        }
    }
`;
document.head.appendChild(style);
