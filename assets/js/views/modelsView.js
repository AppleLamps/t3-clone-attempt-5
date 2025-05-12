import apiService from '../services/apiService.js';

/**
 * Models View for T3 Chat
 * Handles the models panel in settings
 */
class ModelsView {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.loadSavedSettings();
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        this.modelsPanel = document.getElementById('models-panel');
        this.modelButtons = document.querySelectorAll('.model-select-btn');
        this.temperatureSlider = document.getElementById('temperature-slider');
        this.temperatureValue = document.querySelector('.slider-value');
        this.maxTokensInput = document.getElementById('max-tokens-input');
        this.saveButton = document.getElementById('save-model-settings');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Model selection buttons
        this.modelButtons.forEach(button => {
            button.addEventListener('click', () => {
                const provider = button.dataset.provider;
                const model = button.dataset.model;
                this.selectModel(provider, model, button);
            });
        });

        // Temperature slider
        if (this.temperatureSlider && this.temperatureValue) {
            this.temperatureSlider.addEventListener('input', () => {
                const value = this.temperatureSlider.value;
                this.temperatureValue.textContent = value;
            });
        }

        // Save button
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => this.saveSettings());
        }
    }

    /**
     * Load saved model settings
     */
    loadSavedSettings() {
        // Get active model from API service
        const activeModel = apiService.getActiveModel();
        
        // Update UI to reflect active model
        if (activeModel.provider && activeModel.model) {
            this.modelButtons.forEach(button => {
                const isActive = button.dataset.provider === activeModel.provider && 
                                button.dataset.model === activeModel.model;
                
                button.classList.toggle('active', isActive);
                button.textContent = isActive ? 'Selected' : 'Select';
            });
        }

        // Load temperature setting
        const temperature = localStorage.getItem('t3chat_temperature') || 0.7;
        if (this.temperatureSlider && this.temperatureValue) {
            this.temperatureSlider.value = temperature;
            this.temperatureValue.textContent = temperature;
        }

        // Load max tokens setting
        const maxTokens = localStorage.getItem('t3chat_max_tokens') || 2048;
        if (this.maxTokensInput) {
            this.maxTokensInput.value = maxTokens;
        }
    }

    /**
     * Select a model
     * @param {string} provider - The provider name (e.g., 'openai')
     * @param {string} model - The model name (e.g., 'gpt-4.1')
     * @param {HTMLElement} selectedButton - The button that was clicked
     */
    selectModel(provider, model, selectedButton) {
        // Update API service with selected model
        apiService.setActiveModel(provider, model);

        // Update UI
        this.modelButtons.forEach(button => {
            const isSelected = button === selectedButton;
            button.classList.toggle('active', isSelected);
            button.textContent = isSelected ? 'Selected' : 'Select';
        });

        // Show confirmation message
        this.showNotification(`${model} has been selected as your default model.`);
    }

    /**
     * Save model settings
     */
    saveSettings() {
        // Save temperature
        if (this.temperatureSlider) {
            localStorage.setItem('t3chat_temperature', this.temperatureSlider.value);
            apiService.setTemperature(parseFloat(this.temperatureSlider.value));
        }

        // Save max tokens
        if (this.maxTokensInput) {
            localStorage.setItem('t3chat_max_tokens', this.maxTokensInput.value);
            apiService.setMaxTokens(parseInt(this.maxTokensInput.value, 10));
        }

        // Show confirmation message
        this.showNotification('Model settings saved successfully!');
    }

    /**
     * Show a notification message
     * @param {string} message - The message to display
     */
    showNotification(message) {
        alert(message); // Simple notification for now
    }
}

// Export as singleton
const modelsView = new ModelsView();
export default modelsView;
