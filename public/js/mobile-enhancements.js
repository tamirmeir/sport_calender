/**
 * Mobile Enhancements
 * Additional mobile-specific features and optimizations
 */

class MobileEnhancements {
    constructor() {
        this.isTouch = 'ontouchstart' in window;
        this.init();
    }

    /**
     * Initialize mobile enhancements
     */
    init() {
        this.preventPullToRefresh();
        this.setupFastClick();
        this.setupViewportHeight();
        this.detectStandaloneMode();
        this.setupGestureEnhancements();
        console.log('✨ Mobile Enhancements initialized');
    }

    /**
     * Prevent pull-to-refresh on certain elements (like header)
     */
    preventPullToRefresh() {
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].pageY;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            const y = e.touches[0].pageY;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Prevent pull-to-refresh when at top of page
            if (scrollTop === 0 && y > startY) {
                const header = e.target.closest('.header');
                if (header) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    }

    /**
     * Fast click handling (remove 300ms delay on older devices)
     */
    setupFastClick() {
        if (!this.isTouch) return;

        document.addEventListener('touchend', (e) => {
            const target = e.target.closest('button, a, .card, .btn');
            if (target && !target.disabled) {
                // Add visual feedback
                target.classList.add('haptic-feedback');
                setTimeout(() => {
                    target.classList.remove('haptic-feedback');
                }, 400);
            }
        }, { passive: true });
    }

    /**
     * Fix viewport height on mobile (accounts for browser UI)
     */
    setupViewportHeight() {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });
    }

    /**
     * Detect if app is running as standalone PWA
     */
    detectStandaloneMode() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) {
            document.body.classList.add('standalone-mode');
            console.log('📱 Running in standalone PWA mode');
        }
    }

    /**
     * Setup gesture enhancements
     */
    setupGestureEnhancements() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleGesture();
        }, { passive: true });
    }

    /**
     * Handle swipe gestures
     */
    handleGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const minSwipeDistance = 50;

        // Horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // Swipe right
                this.onSwipeRight();
            } else {
                // Swipe left
                this.onSwipeLeft();
            }
        }
    }

    /**
     * Handle swipe right (usually "back")
     */
    onSwipeRight() {
        const backBtn = document.querySelector('.back-btn, #mainBackBtn');
        if (backBtn && backBtn.style.visibility !== 'hidden' && !backBtn.disabled) {
            // Trigger back button
            backBtn.click();
            
            // Haptic feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }
        }
    }

    /**
     * Handle swipe left
     */
    onSwipeLeft() {
        // Could be used for navigation or other actions
        // Currently not implemented
    }

    /**
     * Show toast notification
     */
    static showToast(message, duration = 3000) {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);

        // Hide and remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Create loading overlay
     */
    static showLoading(message = 'Loading...') {
        const existing = document.querySelector('.loading-overlay');
        if (existing) return;

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 16px; color: var(--color-text-primary); font-size: 0.875rem;">${message}</p>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * Hide loading overlay
     */
    static hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }
    }

    /**
     * Trigger haptic feedback
     */
    static haptic(pattern = 10) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Smooth scroll to element
     */
    static scrollToElement(selector, offset = 0) {
        const element = document.querySelector(selector);
        if (!element) return;

        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
        
        window.scrollTo({
            top,
            behavior: 'smooth'
        });
    }
}

// Initialize mobile enhancements
let mobileEnhancements;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mobileEnhancements = new MobileEnhancements();
    });
} else {
    mobileEnhancements = new MobileEnhancements();
}

// Export utilities
window.MobileEnhancements = MobileEnhancements;
window.mobileEnhancements = mobileEnhancements;

// Expose utility functions globally
window.showToast = MobileEnhancements.showToast;
window.showLoading = MobileEnhancements.showLoading;
window.hideLoading = MobileEnhancements.hideLoading;
window.haptic = MobileEnhancements.haptic;
