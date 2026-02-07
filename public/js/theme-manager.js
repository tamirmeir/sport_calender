/**
 * Theme Manager - Dark Mode Controller
 * Auto-switches between light/dark based on time (20:00 - 06:00)
 * Allows manual override with theme toggle button
 */

class ThemeManager {
    constructor() {
        this.storageKey = 'theme-preference';
        this.autoCheckInterval = null;
        this.init();
    }

    /**
     * Initialize theme system
     */
    init() {
        // Load theme from localStorage or auto-detect
        const savedTheme = localStorage.getItem(this.storageKey);
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            this.autoSetTheme();
        }

        // Create theme toggle button
        this.createToggleButton();

        // Auto-check every minute for time-based switching (only if no manual preference)
        this.autoCheckInterval = setInterval(() => {
            if (!localStorage.getItem(this.storageKey)) {
                this.autoSetTheme();
            }
        }, 60000); // Check every minute

        console.log('🎨 Theme Manager initialized');
    }

    /**
     * Auto-set theme based on time of day
     */
    autoSetTheme() {
        const hour = new Date().getHours();
        const isDarkTime = hour >= 20 || hour < 6;
        
        this.setTheme(isDarkTime ? 'dark' : 'light', false);
    }

    /**
     * Set theme
     * @param {string} theme - 'light' or 'dark'
     * @param {boolean} savePreference - Save to localStorage (default: true)
     */
    setTheme(theme, savePreference = true) {
        document.documentElement.setAttribute('data-theme', theme);
        
        if (savePreference) {
            localStorage.setItem(this.storageKey, theme);
        }
        
        // Update meta theme-color for browser UI
        this.updateMetaThemeColor(theme);
        
        // Update toggle button icon
        this.updateToggleIcon(theme);
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme } 
        }));
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }

    /**
     * Toggle between light and dark
     */
    toggleTheme() {
        const current = this.getCurrentTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next, true);
        
        // Add small vibration feedback on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    /**
     * Reset to auto mode (remove manual preference)
     */
    resetToAuto() {
        localStorage.removeItem(this.storageKey);
        this.autoSetTheme();
    }

    /**
     * Update browser UI theme color
     */
    updateMetaThemeColor(theme) {
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        
        metaTheme.content = theme === 'dark' ? '#0f172a' : '#2563eb';
    }

    /**
     * Create floating theme toggle button
     */
    createToggleButton() {
        // Check if button already exists
        if (document.querySelector('.theme-toggle')) {
            return;
        }

        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', 'Toggle theme');
        button.setAttribute('title', 'Switch theme (Dark/Light)');
        
        // Set initial icon
        this.updateToggleIcon(this.getCurrentTheme(), button);
        
        button.addEventListener('click', () => this.toggleTheme());
        
        document.body.appendChild(button);
    }

    /**
     * Update toggle button icon
     */
    updateToggleIcon(theme, button = null) {
        const btn = button || document.querySelector('.theme-toggle');
        if (!btn) return;
        
        // Animated icon transition
        btn.style.transform = 'scale(0.8) rotate(180deg)';
        
        setTimeout(() => {
            btn.innerHTML = theme === 'dark' ? '🌙' : '☀️';
            btn.style.transform = 'scale(1) rotate(0deg)';
        }, 150);
    }

    /**
     * Check if user has manual preference set
     */
    hasManualPreference() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    /**
     * Get time until next auto-switch (in minutes)
     */
    getTimeUntilNextSwitch() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        let targetHour;
        if (hour < 6) {
            targetHour = 6;
        } else if (hour < 20) {
            targetHour = 20;
        } else {
            targetHour = 24 + 6; // Next day 6 AM
        }
        
        const minutesUntil = (targetHour - hour) * 60 - minute;
        return minutesUntil;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.autoCheckInterval) {
            clearInterval(this.autoCheckInterval);
        }
        
        const button = document.querySelector('.theme-toggle');
        if (button) {
            button.remove();
        }
    }
}

// Initialize theme manager when DOM is ready
let themeManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager = new ThemeManager();
    });
} else {
    themeManager = new ThemeManager();
}

// Export for use in other scripts
window.themeManager = themeManager;
