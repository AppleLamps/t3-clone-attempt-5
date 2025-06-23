/**
 * API Service for T3 Chat
 * Provides a modular interface for different AI model providers
 */

class ApiService {
    constructor() {
        this.providers = {};
        this.activeProvider = null;
        this.activeModel = null;
    }

    /**
     * Register a new provider
     * @param {string} providerName - Name of the provider (e.g., 'openai', 'anthropic')
     * @param {object} providerInstance - Instance of the provider class
     */
    registerProvider(providerName, providerInstance) {
        this.providers[providerName] = providerInstance;
    }

    /**
     * Set the active provider and model
     * @param {string} providerName - Name of the provider
     * @param {string} modelName - Name of the model
     * @param {string} [reasoningEffort] - Optional reasoning effort for models like o4-mini
     */
    setActiveModel(providerName, modelName, reasoningEffort = null) {
        if (!this.providers[providerName]) {
            throw new Error(`Provider "${providerName}" is not registered`);
        }

        if (!this.providers[providerName].supportsModel(modelName)) {
            throw new Error(`Model "${modelName}" is not supported by provider "${providerName}"`);
        }

        this.activeProvider = providerName;
        this.activeModel = modelName;

        // Save the active model to local storage
        localStorage.setItem('t3chat_active_provider', providerName);
        localStorage.setItem('t3chat_active_model', modelName);
        if (reasoningEffort) {
            localStorage.setItem('t3chat_reasoning_effort', reasoningEffort);
        } else {
            localStorage.removeItem('t3chat_reasoning_effort');
        }

        return { provider: providerName, model: modelName, reasoningEffort: reasoningEffort };
    }

    /**
     * Get the active provider and model
     * @returns {object} - Active provider, model, and optional reasoning effort
     */
    getActiveModel() {
        const reasoningEffort = localStorage.getItem('t3chat_reasoning_effort');
        return {
            provider: this.activeProvider,
            model: this.activeModel,
            reasoningEffort: reasoningEffort || undefined
        };
    }

    /**
     * Get available models from all providers
     * @returns {object} - Object with provider names as keys and arrays of model objects as values
     */
    getAvailableModels() {
        const availableModels = {};

        for (const [providerName, provider] of Object.entries(this.providers)) {
            availableModels[providerName] = provider.getAvailableModels();
        }

        return availableModels;
    }

    /**
     * Send a message to the active model
     * @param {string} message - User message
     * @param {array} conversation - Conversation history
     * @param {object} options - Additional options (e.g., temperature, system message)
     * @param {function} onStreamUpdate - Callback function for streaming updates
     * @returns {Promise} - Promise that resolves with the AI response
     */
    async sendMessage(message, conversation = [], options = {}, onStreamUpdate) {
        if (!this.activeProvider || !this.activeModel) {
            throw new Error("No active model selected");
        }

        const activeModelDetails = this.getActiveModel();
        const combinedOptions = { ...options };

        if (activeModelDetails.reasoningEffort) {
            combinedOptions.reasoningEffort = activeModelDetails.reasoningEffort;
        }

        return this.providers[this.activeProvider].generateCompletion(
            this.activeModel,
            message,
            conversation,
            combinedOptions,
            onStreamUpdate
        );
    }

    /**
     * Load the previously active model from local storage
     */
    loadSavedModel() {
        const savedProvider = localStorage.getItem('t3chat_active_provider');
        const savedModel = localStorage.getItem('t3chat_active_model');

        if (savedProvider && savedModel && this.providers[savedProvider]) {
            try {
                this.setActiveModel(savedProvider, savedModel);
                return true;
            } catch (error) {
                console.error("Failed to load saved model:", error);
                return false;
            }
        }

        return false;
    }

    /**
     * Set the temperature for AI responses
     * @param {number} value - Temperature value (typically between 0 and 2)
     */
    setTemperature(value) {
        if (typeof value !== 'number' || value < 0 || value > 2) {
            throw new Error("Temperature must be a number between 0 and 2");
        }
        
        localStorage.setItem('t3chat_temperature', value);
        return value;
    }

    /**
     * Get the current temperature setting
     * @returns {number} - Current temperature value
     */
    getTemperature() {
        return parseFloat(localStorage.getItem('t3chat_temperature') || 0.7);
    }

    /**
     * Set the maximum number of tokens for AI responses
     * @param {number} value - Maximum number of tokens
     */
    setMaxTokens(value) {
        if (typeof value !== 'number' || value < 1) {
            throw new Error("Max tokens must be a positive number");
        }
        
        localStorage.setItem('t3chat_max_tokens', value);
        return value;
    }

    /**
     * Get the current max tokens setting
     * @returns {number} - Current max tokens value
     */
    getMaxTokens() {
        return parseInt(localStorage.getItem('t3chat_max_tokens') || 2048, 10);
    }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
