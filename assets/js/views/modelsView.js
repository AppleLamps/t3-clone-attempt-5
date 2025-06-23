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
        this.modelListContainer = document.getElementById('model-list-container'); // New container for dynamic models
        this.temperatureSlider = document.getElementById('temperature-slider');
        this.temperatureValue = document.querySelector('.slider-value');
        this.maxTokensInput = document.getElementById('max-tokens-input');
        this.saveButton = document.getElementById('save-model-settings');
        this.reasoningEffortDropdown = document.querySelector('.reasoning-effort-dropdown');
        this.reasoningEffortSelect = document.getElementById('reasoning-effort');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
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

        // Reasoning effort select
        if (this.reasoningEffortSelect) {
            this.reasoningEffortSelect.addEventListener('change', () => {
                // When reasoning effort changes, re-select the model to apply the new setting
                const activeModel = apiService.getActiveModel();
                if (activeModel.model === 'o4-mini') {
                    this.selectModel(activeModel.provider, activeModel.model, 
                        document.querySelector(`button[data-model='o4-mini'][data-provider='openai']`));
                }
            });
        }
    }

    /**
     * Load saved model settings
     */
    loadSavedSettings() {
        this.renderModels(); // Render models dynamically

        // Load reasoning effort setting
        const reasoningEffort = localStorage.getItem('t3chat_reasoning_effort') || 'medium';
        if (this.reasoningEffortSelect) {
            this.reasoningEffortSelect.value = reasoningEffort;
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
        try {
            // Update API service with selected model
            apiService.setActiveModel(provider, model);

            // Update UI
            document.querySelectorAll('.model-select-btn').forEach(button => {
                const isSelected = button === selectedButton;
                button.classList.toggle('active', isSelected);
                button.textContent = isSelected ? 'Selected' : 'Select';
            });

            // Show confirmation message
            this.showNotification(`${model} has been selected as your default model.`);
        } catch (error) {
            console.error("Error selecting model:", error);
            this.showNotification(`Error: ${error.message}`);
        }
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

    /**
     * Render the list of available models
     */
    renderModels() {
        const availableModels = apiService.getAvailableModels();
        const activeModel = apiService.getActiveModel();
        this.modelListContainer.innerHTML = ''; // Clear existing models

        for (const [providerName, models] of Object.entries(availableModels)) {
            const providerSection = document.createElement('div');
            providerSection.className = 'provider-section';
            
            const providerTitle = document.createElement('h3');
            providerTitle.textContent = providerName.charAt(0).toUpperCase() + providerName.slice(1);
            providerSection.appendChild(providerTitle);

            models.forEach(model => {
                const modelCard = document.createElement('div');
                modelCard.className = 'model-card';

                const modelInfo = document.createElement('div');
                modelInfo.className = 'model-info';
                
                const modelName = document.createElement('h4');
                modelName.textContent = model.name;
                modelInfo.appendChild(modelName);

                const modelDescription = document.createElement('p');
                modelDescription.textContent = model.description;
                modelInfo.appendChild(modelDescription);

                modelCard.appendChild(modelInfo);

                const selectButton = document.createElement('button');
                selectButton.className = 'model-select-btn';
                selectButton.dataset.provider = providerName;
                selectButton.dataset.model = model.id;

                const isActive = activeModel.provider === providerName && activeModel.model === model.id;
                selectButton.classList.toggle('active', isActive);
                selectButton.textContent = isActive ? 'Selected' : 'Select';

                selectButton.addEventListener('click', () => {
                    this.selectModel(providerName, model.id, selectButton);
                });

                modelCard.appendChild(selectButton);
                providerSection.appendChild(modelCard);
            });

            this.modelListContainer.appendChild(providerSection);
        }

        // Show/hide reasoning effort dropdown based on the active model
        if (activeModel.model === 'o4-mini' && this.reasoningEffortDropdown) {
            this.reasoningEffortDropdown.style.display = 'block';
        } else if (this.reasoningEffortDropdown) {
            this.reasoningEffortDropdown.style.display = 'none';
        }
    }
}

// Export as singleton
const modelsView = new ModelsView();
export default modelsView;
