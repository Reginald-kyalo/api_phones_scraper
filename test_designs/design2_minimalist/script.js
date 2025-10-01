// Minimalist Design JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initializeSearch();
    initializeNavigation();
    initializeProductInteractions();
    initializeCategoryNavigation();
    initializeAnimations();
});

// Search functionality
function initializeSearch() {
    const searchInputs = document.querySelectorAll('.search-input, .hero-input');
    const searchButtons = document.querySelectorAll('.search-submit, .hero-btn');
    const suggestions = document.querySelector('.search-suggestions');
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    const trendingTags = document.querySelectorAll('.tag');
    
    // Handle search input focus and blur
    searchInputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (suggestions) {
                suggestions.style.display = 'block';
            }
        });
        
        input.addEventListener('blur', function() {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
                if (suggestions) {
                    suggestions.style.display = 'none';
                }
            }, 200);
        });
        
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(this.value);
            }
        });
        
        input.addEventListener('input', function() {
            if (this.value.length > 0) {
                this.style.borderColor = 'var(--primary)';
            } else {
                this.style.borderColor = 'var(--gray-200)';
            }
        });
    });
    
    // Handle search button clicks
    searchButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.closest('.search-bar, .hero-search').querySelector('input');
            if (input && input.value.trim()) {
                performSearch(input.value.trim());
            }
        });
    });
    
    // Handle suggestion clicks
    suggestionItems.forEach(item => {
        item.addEventListener('click', function() {
            const searchTerm = this.textContent;
            searchInputs.forEach(input => {
                input.value = searchTerm;
            });
            performSearch(searchTerm);
        });
    });
    
    // Handle trending tag clicks
    trendingTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const searchTerm = this.textContent;
            searchInputs.forEach(input => {
                input.value = searchTerm;
            });
            performSearch(searchTerm);
        });
    });
}

// Navigation functionality
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const mobileToggle = document.querySelector('.mobile-toggle');
    
    // Handle navigation button clicks
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tooltip = this.getAttribute('data-tooltip');
            showNotification(`Opening ${tooltip}...`, 'info');
            
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
    
    // Mobile menu toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            showNotification('Mobile menu toggled', 'info');
        });
    }
    
    // Add tooltips on hover
    navButtons.forEach(button => {
        const tooltip = button.getAttribute('data-tooltip');
        if (tooltip) {
            button.addEventListener('mouseenter', function() {
                showTooltip(this, tooltip);
            });
            
            button.addEventListener('mouseleave', function() {
                hideTooltip();
            });
        }
    });
}

// Product interactions
function initializeProductInteractions() {
    const favoriteButtons = document.querySelectorAll('.favorite-toggle');
    const actionButtons = document.querySelectorAll('.action-btn');
    
    // Handle favorite toggles
    favoriteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const icon = this.querySelector('i');
            const productName = this.closest('.product-card').querySelector('.product-name').textContent;
            
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                icon.classList.remove('fas');
                icon.classList.add('far');
                showNotification(`${productName} removed from favorites`, 'info');
            } else {
                this.classList.add('active');
                icon.classList.remove('far');
                icon.classList.add('fas');
                showNotification(`${productName} added to favorites`, 'success');
            }
            
            // Add bounce animation
            this.style.animation = 'bounce 0.3s ease';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    });
    
    // Handle action buttons
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productName = this.closest('.product-card').querySelector('.product-name').textContent;
            const action = this.textContent;
            
            showNotification(`${action} for ${productName}`, 'success');
            
            // Add click effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// Category navigation
function initializeCategoryNavigation() {
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            const categoryName = this.querySelector('h3').textContent;
            const categorySlug = this.getAttribute('data-category');
            
            showNotification(`Browsing ${categoryName}...`, 'info');
            
            // Add click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
                // Here you would typically navigate to the category page
                console.log(`Navigating to category: ${categorySlug}`);
            }, 200);
        });
        
        // Add hover effect for icon
        item.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.category-icon');
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        });
        
        item.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.category-icon');
            icon.style.transform = '';
        });
    });
}

// Animation and scroll effects
function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.category-item, .product-card, .step, .stat-item');
    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
    
    // Parallax effect for floating elements
    const floatingElements = document.querySelectorAll('.floating-element');
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        floatingElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            element.style.transform = `translateY(${rate * speed}px)`;
        });
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
    
    // Add smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Utility functions
function performSearch(query) {
    if (!query.trim()) return;
    
    showNotification(`Searching for "${query}"...`, 'info');
    
    // Add loading state to search buttons
    const searchButtons = document.querySelectorAll('.search-submit, .hero-btn');
    searchButtons.forEach(btn => {
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            showNotification(`Found results for "${query}"`, 'success');
        }, 1000);
    });
    
    console.log(`Performing search for: ${query}`);
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Style notification
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: colors[type] || colors.info,
        color: 'white',
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: '500',
        fontSize: '14px',
        zIndex: '9999',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    Object.assign(tooltip.style, {
        position: 'absolute',
        background: 'var(--gray-900)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        zIndex: '1000',
        whiteSpace: 'nowrap',
        opacity: '0',
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none'
    });
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 8}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    
    setTimeout(() => {
        tooltip.style.opacity = '1';
    }, 50);
    
    // Store reference for cleanup
    element._tooltip = tooltip;
}

function hideTooltip() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.remove(), 200);
    });
}

// Add custom CSS for animations
const customStyles = document.createElement('style');
customStyles.textContent = `
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
        }
        40% {
            transform: translateY(-10px);
        }
        60% {
            transform: translateY(-5px);
        }
    }
    
    .mobile-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    .search-input:focus {
        transform: scale(1.02);
    }
    
    .hero-input:focus {
        transform: scale(1.01);
    }
    
    .action-btn:active {
        transform: scale(0.95);
    }
    
    .nav-btn:active {
        transform: scale(0.9);
    }
`;

document.head.appendChild(customStyles);
