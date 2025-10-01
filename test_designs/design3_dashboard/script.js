// Dashboard Layout JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard functionality
    initializeSidebar();
    initializeThemeToggle();
    initializeSearch();
    initializeWidgets();
    initializeNotifications();
    initializeAnimations();
});

// Sidebar functionality
function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const navItems = document.querySelectorAll('.nav-item a');
    const profileMenu = document.querySelector('.profile-menu');
    
    // Toggle sidebar collapse
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            
            // Store state in localStorage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            
            // Animate toggle button
            this.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    }
    
    // Restore sidebar state
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
    }
    
    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active from all items
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            
            // Add active to clicked item
            this.closest('.nav-item').classList.add('active');
            
            // Get target from href
            const target = this.getAttribute('href').substring(1);
            showNotification(`Navigating to ${target}...`, 'info');
            
            // Add click animation
            this.style.transform = 'translateX(4px)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
    
    // Profile menu
    if (profileMenu) {
        profileMenu.addEventListener('click', function() {
            showNotification('Profile menu opened', 'info');
        });
    }
    
    // Mobile sidebar toggle
    function createMobileToggle() {
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-sidebar-toggle';
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        mobileToggle.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 200;
            background: var(--primary);
            color: white;
            border: none;
            width: 44px;
            height: 44px;
            border-radius: var(--radius-lg);
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: var(--shadow-lg);
        `;
        
        document.body.appendChild(mobileToggle);
        
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
        
        // Show on mobile
        if (window.innerWidth <= 992) {
            mobileToggle.style.display = 'flex';
        }
        
        window.addEventListener('resize', function() {
            if (window.innerWidth <= 992) {
                mobileToggle.style.display = 'flex';
            } else {
                mobileToggle.style.display = 'none';
                sidebar.classList.remove('open');
            }
        });
    }
    
    createMobileToggle();
}

// Theme toggle functionality
function initializeThemeToggle() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Set initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === currentTheme);
    });
    
    // Handle theme changes
    themeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            
            // Update active state
            themeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Apply theme
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            showNotification(`Switched to ${theme} theme`, 'success');
            
            // Add click animation
            this.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// Search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchFilter = document.querySelector('.search-filter');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value;
            if (query.length > 2) {
                showSearchSuggestions(query);
            } else {
                hideSearchSuggestions();
            }
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
        
        searchInput.addEventListener('focus', function() {
            this.closest('.search-wrapper').style.transform = 'scale(1.02)';
        });
        
        searchInput.addEventListener('blur', function() {
            this.closest('.search-wrapper').style.transform = '';
        });
    }
    
    // Search filter button
    if (searchFilter) {
        searchFilter.addEventListener('click', function() {
            showNotification('Opening search filters...', 'info');
        });
    }
    
    // Filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active from all chips
            filterChips.forEach(c => c.classList.remove('active'));
            // Add active to clicked chip
            this.classList.add('active');
            
            const filter = this.textContent;
            showNotification(`Applied filter: ${filter}`, 'success');
        });
    });
}

// Widget functionality
function initializeWidgets() {
    initializeTrendingWidget();
    initializeAlertsWidget();
    initializeCategoriesWidget();
    initializeRecentWidget();
    initializeChartWidget();
    initializeQuickActions();
    initializeStatsCards();
}

function initializeTrendingWidget() {
    const trendingItems = document.querySelectorAll('.trending-item');
    
    trendingItems.forEach(item => {
        item.addEventListener('click', function() {
            const productName = this.querySelector('h4').textContent;
            showNotification(`Viewing ${productName}...`, 'info');
            
            // Add click animation
            this.style.transform = 'translateX(8px)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });
}

function initializeAlertsWidget() {
    const alertItems = document.querySelectorAll('.alert-item');
    
    alertItems.forEach(item => {
        const actionBtn = item.querySelector('.alert-action');
        
        item.addEventListener('click', function() {
            const productName = this.querySelector('h4').textContent;
            showNotification(`Viewing alert for ${productName}...`, 'info');
        });
        
        if (actionBtn) {
            actionBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const productName = this.closest('.alert-item').querySelector('h4').textContent;
                showNotification(`Opening deal for ${productName}...`, 'success');
            });
        }
    });
}

function initializeCategoriesWidget() {
    const categoryCards = document.querySelectorAll('.category-card');
    const controlBtns = document.querySelectorAll('.control-btn');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const categoryName = this.querySelector('h3').textContent;
            showNotification(`Browsing ${categoryName} category...`, 'info');
            
            // Add pulse animation
            this.style.animation = 'pulse 0.3s ease';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    });
    
    // View controls
    controlBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            controlBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.getAttribute('data-view');
            showNotification(`Switched to ${view} view`, 'info');
        });
    });
}

function initializeRecentWidget() {
    const recentItems = document.querySelectorAll('.recent-item');
    const clearAllBtn = document.querySelector('.clear-all');
    
    recentItems.forEach(item => {
        item.addEventListener('click', function() {
            const searchTerm = this.querySelector('h4').textContent;
            showNotification(`Searching again for "${searchTerm}"...`, 'info');
        });
    });
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            showNotification('Cleared search history', 'success');
            
            // Animate items out
            recentItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.transform = 'translateX(100%)';
                    item.style.opacity = '0';
                }, index * 100);
            });
        });
    }
}

function initializeChartWidget() {
    const chartBtns = document.querySelectorAll('.chart-btn');
    const chartPoints = document.querySelectorAll('.chart-point');
    
    chartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            chartBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const period = this.getAttribute('data-period');
            showNotification(`Showing ${period} price trends`, 'info');
            
            // Animate chart
            animateChart();
        });
    });
    
    chartPoints.forEach(point => {
        point.addEventListener('click', function() {
            chartPoints.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function animateChart() {
    const chartLine = document.querySelector('.chart-line');
    const chartPoints = document.querySelectorAll('.chart-point');
    
    if (chartLine) {
        chartLine.style.transform = 'scaleX(0) rotate(-5deg)';
        setTimeout(() => {
            chartLine.style.transform = 'scaleX(1) rotate(-5deg)';
        }, 200);
    }
    
    chartPoints.forEach((point, index) => {
        point.style.transform = 'scale(0)';
        setTimeout(() => {
            point.style.transform = 'scale(1)';
        }, 300 + (index * 100));
    });
}

function initializeQuickActions() {
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const actionName = this.querySelector('h3').textContent;
            showNotification(`${actionName} feature coming soon!`, 'info');
            
            // Add bounce animation
            this.style.animation = 'bounce 0.5s ease';
            setTimeout(() => {
                this.style.animation = '';
            }, 500);
        });
    });
}

function initializeStatsCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const statName = this.querySelector('p').textContent;
            showNotification(`Viewing detailed ${statName.toLowerCase()}...`, 'info');
        });
    });
    
    // Animate numbers on page load
    setTimeout(() => {
        animateStatNumbers();
    }, 500);
}

function animateStatNumbers() {
    const statNumbers = document.querySelectorAll('.stat-content h3');
    
    statNumbers.forEach(element => {
        const finalValue = element.textContent;
        const numericValue = parseFloat(finalValue.replace(/[^0-9.]/g, ''));
        
        if (!isNaN(numericValue)) {
            let currentValue = 0;
            const increment = numericValue / 30;
            const prefix = finalValue.replace(/[0-9.,]/g, '');
            
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= numericValue) {
                    currentValue = numericValue;
                    clearInterval(timer);
                }
                
                element.textContent = prefix.replace(/[0-9.,]/g, '') + Math.floor(currentValue).toLocaleString();
            }, 50);
        }
    });
}

// Notifications system
function initializeNotifications() {
    const headerBtns = document.querySelectorAll('.header-btn');
    
    headerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tooltip = this.getAttribute('data-tooltip');
            showNotification(`${tooltip} clicked`, 'info');
            
            // Remove notification dot if present
            const notificationDot = this.querySelector('.notification-dot');
            if (notificationDot) {
                notificationDot.style.animation = 'ping 0.3s ease';
                setTimeout(() => {
                    notificationDot.remove();
                }, 300);
            }
        });
    });
}

// Animation system
function initializeAnimations() {
    // Intersection Observer for widget animations
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
    
    // Observe widgets
    const widgets = document.querySelectorAll('.widget, .stat-card, .action-card');
    widgets.forEach((widget, index) => {
        widget.style.opacity = '0';
        widget.style.transform = 'translateY(20px)';
        widget.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        widget.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(widget);
    });
    
    // Parallax effect for stats
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const statCards = document.querySelectorAll('.stat-card');
        
        statCards.forEach((card, index) => {
            const speed = 0.1 + (index * 0.02);
            const yPos = -(scrolled * speed);
            card.style.transform = `translateY(${yPos}px)`;
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
}

// Utility functions
function performSearch(query) {
    if (!query.trim()) return;
    
    showNotification(`Searching for "${query}"...`, 'info');
    
    // Add to recent searches
    addToRecentSearches(query);
    
    console.log(`Performing search for: ${query}`);
}

function showSearchSuggestions(query) {
    // This would typically show a dropdown with suggestions
    console.log(`Showing suggestions for: ${query}`);
}

function hideSearchSuggestions() {
    // Hide suggestions dropdown
    console.log('Hiding search suggestions');
}

function addToRecentSearches(query) {
    const recentList = document.querySelector('.recent-list');
    if (!recentList) return;
    
    // Create new recent item
    const recentItem = document.createElement('div');
    recentItem.className = 'recent-item';
    recentItem.innerHTML = `
        <div class="recent-icon">
            <i class="fas fa-search"></i>
        </div>
        <div class="recent-content">
            <h4>${query}</h4>
            <p>Just searched</p>
        </div>
        <span class="recent-time">now</span>
    `;
    
    // Add to top of list
    recentList.insertBefore(recentItem, recentList.firstChild);
    
    // Remove last item if more than 3
    const items = recentList.querySelectorAll('.recent-item');
    if (items.length > 3) {
        items[items.length - 1].remove();
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.toast-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'toast-notification';
    notification.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${getNotificationIcon(type)}"></i>
        </div>
        <div class="toast-content">
            <p>${message}</p>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
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
        background: 'var(--surface)',
        border: `1px solid ${colors[type] || colors.info}`,
        borderLeft: `4px solid ${colors[type] || colors.info}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        minWidth: '300px',
        maxWidth: '400px',
        zIndex: '9999',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
    });
    
    // Style icon
    const icon = notification.querySelector('.toast-icon');
    icon.style.color = colors[type] || colors.info;
    
    // Style close button
    const closeBtn = notification.querySelector('.toast-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        margin-left: auto;
        padding: var(--space-1);
        border-radius: var(--radius);
        transition: var(--transition);
    `;
    
    closeBtn.addEventListener('click', function() {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    closeBtn.addEventListener('mouseenter', function() {
        this.style.background = 'var(--bg-tertiary)';
        this.style.color = 'var(--text-primary)';
    });
    
    closeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'none';
        this.style.color = 'var(--text-tertiary)';
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Add custom animations
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
    
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
        100% {
            transform: scale(1);
        }
    }
    
    @keyframes ping {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        75%, 100% {
            transform: scale(2);
            opacity: 0;
        }
    }
`;

document.head.appendChild(customStyles);
