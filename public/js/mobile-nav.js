/**
 * Mobile Bottom Navigation Manager
 * Handles mobile navigation, gestures, and UI interactions
 */

class MobileNav {
    constructor() {
        this.currentPage = 'home';
        this.lastScrollTop = 0;
        this.scrollThreshold = 50;
        this.init();
    }

    /**
     * Initialize mobile navigation
     */
    init() {
        this.createBottomNav();
        this.setupEventListeners();
        this.setupScrollBehavior();
        console.log('📱 Mobile Navigation initialized');
    }

    /**
     * Create bottom navigation HTML
     */
    createBottomNav() {
        // Check if already exists
        if (document.querySelector('.mobile-bottom-nav')) {
            return;
        }

        const nav = document.createElement('nav');
        nav.className = 'mobile-bottom-nav';
        nav.setAttribute('aria-label', 'Mobile navigation');

        const navItems = [
            { id: 'home', icon: '🏠', label: 'Home', active: true },
            { id: 'favorites', icon: '⭐', label: 'Favorites', badge: null },
            { id: 'search', icon: '🔍', label: 'Search', badge: null },
            { id: 'settings', icon: '⚙️', label: 'Settings', badge: null }
        ];

        navItems.forEach(item => {
            const button = this.createNavItem(item);
            nav.appendChild(button);
        });

        document.body.appendChild(nav);
    }

    /**
     * Create individual nav item
     */
    createNavItem(item) {
        const button = document.createElement('button');
        button.className = 'mobile-nav-item';
        button.dataset.page = item.id;
        
        if (item.active) {
            button.classList.add('active');
        }

        const icon = document.createElement('span');
        icon.className = 'nav-icon';
        icon.textContent = item.icon;

        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = item.label;

        button.appendChild(icon);
        button.appendChild(label);

        if (item.badge) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = item.badge;
            button.appendChild(badge);
        }

        return button;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Nav item clicks
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.mobile-nav-item');
            if (navItem) {
                this.handleNavClick(navItem);
            }
        });

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
    }

    /**
     * Handle navigation item click
     */
    handleNavClick(navItem) {
        const page = navItem.dataset.page;
        
        // Haptic feedback
        this.triggerHaptic();

        // Update active state
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        navItem.classList.add('active');

        this.currentPage = page;

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('navchange', {
            detail: { page }
        }));

        // Handle page navigation
        this.navigateToPage(page);
    }

    /**
     * Navigate to page
     */
    navigateToPage(page) {
        switch(page) {
            case 'home':
                this.scrollToTop();
                break;
            case 'favorites':
                this.showFavorites();
                break;
            case 'search':
                this.showSearch();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    }

    /**
     * Scroll to top smoothly
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * Show favorites
     */
    showFavorites() {
        // Dispatch event for other components to handle
        window.dispatchEvent(new CustomEvent('showfavorites'));
        
        // Example: scroll to favorites section if exists
        const favSection = document.querySelector('#favoritesSection');
        if (favSection) {
            favSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Show search
     */
    showSearch() {
        // Focus search input if exists
        const searchInput = document.querySelector('#countrySearch, #teamQuickFilter');
        if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Show settings
     */
    showSettings() {
        // Open settings modal/sheet
        window.dispatchEvent(new CustomEvent('opensettings'));
    }

    /**
     * Setup scroll behavior (hide/show nav on scroll)
     */
    setupScrollBehavior() {
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
            }, 10);
        }, { passive: true });
    }

    /**
     * Handle scroll event
     */
    handleScroll() {
        const nav = document.querySelector('.mobile-bottom-nav');
        if (!nav) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Hide nav when scrolling down, show when scrolling up
        if (scrollTop > this.lastScrollTop && scrollTop > this.scrollThreshold) {
            // Scrolling down
            nav.classList.add('hidden');
        } else {
            // Scrolling up
            nav.classList.remove('hidden');
        }
        
        this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }

    /**
     * Update badge count
     */
    updateBadge(navId, count) {
        const navItem = document.querySelector(`.mobile-nav-item[data-page="${navId}"]`);
        if (!navItem) return;

        let badge = navItem.querySelector('.nav-badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                navItem.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } else if (badge) {
            badge.remove();
        }
    }

    /**
     * Trigger haptic feedback
     */
    triggerHaptic() {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = window.innerWidth;
        const nav = document.querySelector('.mobile-bottom-nav');
        
        if (!nav) return;

        // Hide on desktop
        if (width >= 768) {
            nav.style.display = 'none';
            document.body.style.paddingBottom = '0';
        } else {
            nav.style.display = 'grid';
            document.body.style.paddingBottom = 'calc(80px + env(safe-area-inset-bottom))';
        }
    }

    /**
     * Set active page
     */
    setActivePage(pageId) {
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        this.currentPage = pageId;
    }

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }
}

// Initialize mobile nav when DOM is ready
let mobileNav;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Only initialize on mobile
        if (window.innerWidth < 768) {
            mobileNav = new MobileNav();
        }
    });
} else {
    if (window.innerWidth < 768) {
        mobileNav = new MobileNav();
    }
}

// Export for use in other scripts
window.mobileNav = mobileNav;

// Reinitialize on resize if needed
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.innerWidth < 768 && !window.mobileNav) {
            window.mobileNav = new MobileNav();
        }
    }, 250);
});
