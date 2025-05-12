import '../services/chatService.js';
import chatService from '../services/chatService.js'; // Explicitly import for usage
import customizationView from './customizationView.js';
import modelsView from './modelsView.js';

class SettingsView {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadSavedPreferences();
        this.updateUsageUI();
    }

    initializeElements() {
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.panels = document.querySelectorAll('.settings-panel');
        this.customizeForm = document.querySelector('.customize-form');
        this.saveButton = document.querySelector('.save-preferences-btn');
        this.themeToggle = document.querySelector('#boring-theme');
        this.hidePersonalInfo = document.querySelector('#hide-personal-info');
        this.mainFontSelect = document.querySelector('#main-font');
        this.codeFontSelect = document.querySelector('#code-font');
        this.openaiApiKeyInput = document.querySelector('#openai-api-key');
        this.saveApiKeyButton = document.querySelector('#save-api-key-btn');
        this.themeToggleBtn = document.querySelector('.theme-toggle');
        
        // Usage Elements
        this.standardUsageLabel = document.querySelector('.usage-type:nth-child(1) .usage-label span:nth-child(2)');
        this.standardProgressBar = document.querySelector('.usage-type:nth-child(1) .progress');
        this.standardRemainingText = document.querySelector('.usage-type:nth-child(1) .remaining');
        
        this.premiumUsageLabel = document.querySelector('.usage-type:nth-child(2) .usage-label span:nth-child(2)');
        this.premiumProgressBar = document.querySelector('.usage-type:nth-child(2) .progress');
        this.premiumRemainingText = document.querySelector('.usage-type:nth-child(2) .remaining');
        
        this.resetTimeLabel = document.querySelector('.reset-time');
    }

    bindEvents() {
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button));
        });

        // Form submission
        if (this.customizeForm) {
            this.customizeForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Theme toggle
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Visual options
        if (this.themeToggle) {
            this.themeToggle.addEventListener('change', () => this.toggleBoringTheme());
        }

        if (this.hidePersonalInfo) {
            this.hidePersonalInfo.addEventListener('change', () => this.togglePersonalInfo());
        }

        // Font changes
        if (this.mainFontSelect) {
            this.mainFontSelect.addEventListener('change', () => this.updateMainFont());
        }

        if (this.codeFontSelect) {
            this.codeFontSelect.addEventListener('change', () => this.updateCodeFont());
        }

        // API Key saving
        if (this.saveApiKeyButton) {
            this.saveApiKeyButton.addEventListener('click', () => this.saveOpenAIApiKey());
        }
        
        // Set up a timer to update the usage UI every minute
        setInterval(() => this.updateUsageUI(), 60000);
    }
    
    /**
     * Update the usage UI elements
     */
    updateUsageUI() {
        // Get current usage stats
        const usage = chatService.getMessageUsage();
        const resetTimeFormatted = chatService.getFormattedResetTime();
        
        // Update Standard usage
        if (this.standardUsageLabel) {
            this.standardUsageLabel.textContent = `${usage.standard}/${usage.standardLimit}`;
        }
        
        if (this.standardProgressBar) {
            const standardPercent = Math.min(100, (usage.standard / usage.standardLimit) * 100);
            this.standardProgressBar.style.width = `${standardPercent}%`;
            this.standardProgressBar.setAttribute('aria-valuenow', standardPercent);
            
            // Change color when nearing limit
            if (standardPercent > 90) {
                this.standardProgressBar.style.backgroundColor = 'var(--color-warning)';
            } else if (standardPercent > 75) {
                this.standardProgressBar.style.backgroundColor = 'var(--color-warning-dark)';
            } else {
                this.standardProgressBar.style.backgroundColor = 'var(--color-primary)';
            }
        }
        
        if (this.standardRemainingText) {
            this.standardRemainingText.textContent = `${usage.standardRemaining} messages remaining`;
        }
        
        // Update Premium usage
        if (this.premiumUsageLabel) {
            this.premiumUsageLabel.textContent = `${usage.premium}/${usage.premiumLimit}`;
        }
        
        if (this.premiumProgressBar) {
            const premiumPercent = Math.min(100, (usage.premium / usage.premiumLimit) * 100);
            this.premiumProgressBar.style.width = `${premiumPercent}%`;
            this.premiumProgressBar.setAttribute('aria-valuenow', premiumPercent);
            
            // Change color when nearing limit
            if (premiumPercent > 90) {
                this.premiumProgressBar.style.backgroundColor = 'var(--color-warning)';
            } else if (premiumPercent > 75) {
                this.premiumProgressBar.style.backgroundColor = 'var(--color-warning-dark)';
            } else {
                this.premiumProgressBar.style.backgroundColor = 'var(--color-primary)';
            }
        }
        
        if (this.premiumRemainingText) {
            this.premiumRemainingText.textContent = `${usage.premiumRemaining} messages remaining`;
        }
        
        // Update reset time
        if (this.resetTimeLabel) {
            this.resetTimeLabel.textContent = `Resets ${resetTimeFormatted}`;
        }
    }

    switchTab(selectedButton) {
        // Remove active class from all buttons and panels
        this.tabButtons.forEach(button => button.classList.remove('active'));
        this.panels.forEach(panel => panel.classList.remove('active'));

        // Add active class to selected button and corresponding panel
        selectedButton.classList.add('active');
        
        // Get the index of the selected button to match with the panel
        const index = Array.from(this.tabButtons).indexOf(selectedButton);
        if (index >= 0 && index < this.panels.length) {
            this.panels[index].classList.add('active');
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.customizeForm);
        const preferences = Object.fromEntries(formData);
        
        // Save to localStorage
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
        
        // Show success message
        this.showNotification('Preferences saved successfully!');
    }

    loadSavedPreferences() {
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
            const preferences = JSON.parse(savedPreferences);
            
            // Populate form fields
            Object.entries(preferences).forEach(([key, value]) => {
                const input = this.customizeForm?.querySelector(`[name="${key}"]`);
                if (input) {
                    input.value = value;
                }
            });

            // Apply visual preferences
            if (preferences.boringTheme && this.themeToggle) this.themeToggle.checked = true;
            if (preferences.hidePersonalInfo && this.hidePersonalInfo) this.hidePersonalInfo.checked = true;
            if (preferences.mainFont && this.mainFontSelect) this.mainFontSelect.value = preferences.mainFont;
            if (preferences.codeFont && this.codeFontSelect) this.codeFontSelect.value = preferences.codeFont;
        }

        // Load saved API key
        const savedApiKey = localStorage.getItem('openai_api_key');
        if (savedApiKey && this.openaiApiKeyInput) {
            this.openaiApiKeyInput.value = savedApiKey;
        }
    }

    saveOpenAIApiKey() {
        if (this.openaiApiKeyInput) {
            const apiKey = this.openaiApiKeyInput.value.trim();
            if (apiKey) {
                localStorage.setItem('openai_api_key', apiKey);
                this.showNotification('OpenAI API Key saved successfully!');
            } else {
                localStorage.removeItem('openai_api_key');
                this.showNotification('OpenAI API Key removed.');
            }
        }
    }

    toggleBoringTheme() {
        document.documentElement.classList.toggle('boring', this.themeToggle?.checked);
        this.saveVisualPreferences();
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        document.documentElement.classList.toggle('light', !isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Update icon display if they exist
        const sunIcon = this.themeToggleBtn.querySelector('.icon-sun');
        const moonIcon = this.themeToggleBtn.querySelector('.icon-moon');
        
        if (sunIcon && moonIcon) {
            sunIcon.style.display = isDark ? 'none' : 'block';
            moonIcon.style.display = isDark ? 'block' : 'none';
        }
    }

    togglePersonalInfo() {
        document.body.classList.toggle('hide-personal', this.hidePersonalInfo?.checked);
        this.saveVisualPreferences();
    }

    updateMainFont() {
        document.documentElement.style.setProperty('--font-main', this.mainFontSelect.value);
        this.saveVisualPreferences();
    }

    updateCodeFont() {
        document.documentElement.style.setProperty('--font-code', this.codeFontSelect.value);
        this.saveVisualPreferences();
    }

    saveVisualPreferences() {
        const visualPrefs = {
            boringTheme: this.themeToggle?.checked || false,
            hidePersonalInfo: this.hidePersonalInfo?.checked || false,
            mainFont: this.mainFontSelect?.value,
            codeFont: this.codeFontSelect?.value
        };
        localStorage.setItem('visualPreferences', JSON.stringify(visualPrefs));
    }

    showNotification(message) {
        // You can implement a more sophisticated notification system
        alert(message);
    }
}

// Export as a singleton
const settingsView = new SettingsView();
export default settingsView;
