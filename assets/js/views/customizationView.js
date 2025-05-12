/**
 * Customization View for T3 Chat
 * Handles the customization panel in settings
 */

import chatService from '../services/chatService.js';

class CustomizationView {
    constructor() {
        // DOM Elements
        this.customizationPanel = document.getElementById('customization-panel');
        this.traitsTextarea = this.customizationPanel?.querySelector('textarea[name="traits"]');
        this.preferencesTextarea = this.customizationPanel?.querySelector('textarea[name="preferences"]');
        this.saveButton = this.customizationPanel?.querySelector('.save-preferences-btn');

        // Theme options
        this.boringThemeToggle = document.getElementById('boring-theme');
        this.hidePersonalInfoToggle = document.getElementById('hide-personal-info');
        this.compactMessagesToggle = document.getElementById('compact-messages');
        this.memoryToggle = document.getElementById('memory-toggle');

        // Font selectors
        this.mainFontSelect = document.getElementById('main-font');
        this.codeFontSelect = document.getElementById('code-font');

        // Preset buttons
        this.presetButtons = this.customizationPanel?.querySelectorAll('.preset-btn');

        // Color theme options
        this.colorThemeRadios = this.customizationPanel?.querySelectorAll('input[name="colorTheme"]');

        // Traits presets
        this.traitsPresets = {
            friendly: "I'm a helpful, friendly AI assistant. I aim to provide warm, supportive guidance and thoughtful responses to your questions. I use a conversational tone and try to be empathetic while providing accurate information. I'll never judge your questions and will always treat you with respect.",
            professional: "I'm a professional assistant focused on delivering clear, concise, and accurate information. I maintain a formal tone and prioritize efficiency and precision in my responses. I avoid unnecessary elaboration while ensuring all critical information is properly communicated.",
            creative: "I'm a creative assistant with an imaginative, expressive communication style. I enjoy exploring novel ideas, making interesting connections, and helping with creative projects. I use colorful language, metaphors, and examples to make my responses engaging and thought-provoking.",
            direct: "I'm a direct, straightforward assistant that cuts to the chase. I don't sugarcoat information or add unnecessary fluff. I give you the facts clearly and honestly, even when they might be uncomfortable. I value clarity and efficiency above all else.",
            custom: this.traitsTextarea?.value || ""
        };

        // Save confirmation element
        this.saveConfirmation = document.getElementById('save-confirmation');

        // Initialize the view
        this.init();
    }

    /**
     * Initialize the customization view
     */
    init() {
        if (!this.customizationPanel) return;

        // Load saved system instructions
        this.loadSavedInstructions();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for the customization view
     */
    setupEventListeners() {
        // Save button click
        this.saveButton?.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveInstructions();
        });

        // Theme toggles
        this.boringThemeToggle?.addEventListener('change', () => {
            this.saveThemePreference();
        });

        this.hidePersonalInfoToggle?.addEventListener('change', () => {
            this.savePersonalInfoPreference();
        });

        this.compactMessagesToggle?.addEventListener('change', () => {
            this.saveCompactMessagesPreference();
        });

        this.memoryToggle?.addEventListener('change', () => {
            this.saveMemoryPreference();
        });

        // Font selectors
        this.mainFontSelect?.addEventListener('change', () => {
            this.saveMainFontPreference();
        });

        this.codeFontSelect?.addEventListener('change', () => {
            this.saveCodeFontPreference();
        });

        // Preset buttons
        this.presetButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyTraitsPreset(preset);
                this.updatePresetButtonsUI(preset);
            });
        });

        // Color theme radios
        this.colorThemeRadios?.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.applyColorTheme(radio.value);
                }
            });
        });
    }

    /**
     * Load saved instructions and preferences from local storage
     */
    loadSavedInstructions() {
        // Load system message from chat service
        const systemMessage = chatService.getSystemMessage();
        if (systemMessage && this.traitsTextarea) {
            this.traitsTextarea.value = systemMessage;

            // Update preset buttons UI
            this.updatePresetButtonsUI('custom');
        }

        // Load user preferences if any
        const preferences = localStorage.getItem('t3chat_user_preferences');
        if (preferences && this.preferencesTextarea) {
            this.preferencesTextarea.value = preferences;
        }

        // Load theme preferences
        if (this.boringThemeToggle) {
            this.boringThemeToggle.checked = localStorage.getItem('t3chat_boring_theme') === 'true';
        }

        if (this.hidePersonalInfoToggle) {
            this.hidePersonalInfoToggle.checked = localStorage.getItem('t3chat_hide_personal_info') === 'true';
        }

        if (this.compactMessagesToggle) {
            this.compactMessagesToggle.checked = localStorage.getItem('t3chat_compact_messages') === 'true';
        }

        if (this.memoryToggle) {
            this.memoryToggle.checked = localStorage.getItem('t3chat_enable_memory') !== 'false'; // Default to true
        }

        // Load font preferences
        if (this.mainFontSelect) {
            const savedMainFont = localStorage.getItem('t3chat_main_font');
            if (savedMainFont) {
                this.mainFontSelect.value = savedMainFont;
                this.applyMainFont(savedMainFont);
            }
        }

        if (this.codeFontSelect) {
            const savedCodeFont = localStorage.getItem('t3chat_code_font');
            if (savedCodeFont) {
                this.codeFontSelect.value = savedCodeFont;
                this.applyCodeFont(savedCodeFont);
            }
        }

        // Load color theme
        const savedColorTheme = localStorage.getItem('t3chat_color_theme') || 'modern-gray';
        this.colorThemeRadios?.forEach(radio => {
            if (radio.value === savedColorTheme) {
                radio.checked = true;
                this.applyColorTheme(savedColorTheme);
            }
        });
    }

    /**
     * Save instructions to local storage and update service
     */
    saveInstructions() {
        const traits = this.traitsTextarea?.value || '';
        const preferences = this.preferencesTextarea?.value || '';

        // Save system message to chat service
        chatService.setSystemMessage(traits);

        // Save user preferences
        localStorage.setItem('t3chat_user_preferences', preferences);

        // Save all other preferences
        this.saveThemePreference();
        this.savePersonalInfoPreference();
        this.saveCompactMessagesPreference();
        this.saveMemoryPreference();
        this.saveMainFontPreference();
        this.saveCodeFontPreference();

        // Save color theme
        this.colorThemeRadios?.forEach(radio => {
            if (radio.checked) {
                localStorage.setItem('t3chat_color_theme', radio.value);
            }
        });

        // Show save confirmation
        this.showSaveConfirmation();
    }

    /**
     * Save theme preference
     */
    saveThemePreference() {
        const isBoringTheme = this.boringThemeToggle?.checked || false;
        localStorage.setItem('t3chat_boring_theme', isBoringTheme);

        // Apply theme changes
        document.documentElement.classList.toggle('boring-theme', isBoringTheme);
    }

    /**
     * Save personal info preference
     */
    savePersonalInfoPreference() {
        const hidePersonalInfo = this.hidePersonalInfoToggle?.checked || false;
        localStorage.setItem('t3chat_hide_personal_info', hidePersonalInfo);

        // Apply personal info hiding
        document.documentElement.classList.toggle('hide-personal-info', hidePersonalInfo);
    }

    /**
     * Save compact messages preference
     */
    saveCompactMessagesPreference() {
        const compactMessages = this.compactMessagesToggle?.checked || false;
        localStorage.setItem('t3chat_compact_messages', compactMessages);

        // Apply compact messages
        document.documentElement.classList.toggle('compact-messages', compactMessages);
    }

    /**
     * Save memory preference
     */
    saveMemoryPreference() {
        const enableMemory = this.memoryToggle?.checked || false;
        localStorage.setItem('t3chat_enable_memory', enableMemory);

        // Apply memory preference to chat service
        chatService.setMemoryEnabled(enableMemory);
    }

    /**
     * Save main font preference
     */
    saveMainFontPreference() {
        const mainFont = this.mainFontSelect?.value || 'proxima-vera';
        localStorage.setItem('t3chat_main_font', mainFont);

        // Apply main font
        this.applyMainFont(mainFont);
    }

    /**
     * Save code font preference
     */
    saveCodeFontPreference() {
        const codeFont = this.codeFontSelect?.value || 'berkeley-mono';
        localStorage.setItem('t3chat_code_font', codeFont);

        // Apply code font
        this.applyCodeFont(codeFont);
    }

    /**
     * Apply main font to document
     */
    applyMainFont(fontName) {
        document.documentElement.style.setProperty('--font-sans', `'${fontName}', 'Inter', sans-serif`);
    }

    /**
     * Apply code font to document
     */
    applyCodeFont(fontName) {
        document.documentElement.style.setProperty('--font-mono', `'${fontName}', 'JetBrains Mono', monospace`);
    }

    /**
     * Apply a traits preset
     */
    applyTraitsPreset(preset) {
        if (this.traitsPresets[preset] && this.traitsTextarea) {
            if (preset === 'custom') {
                // Don't change the text area, just update UI
            } else {
                this.traitsTextarea.value = this.traitsPresets[preset];
                // Save custom preset for future use
                this.traitsPresets.custom = this.traitsTextarea.value;
            }
        }
    }

    /**
     * Update preset buttons UI
     */
    updatePresetButtonsUI(activePreset) {
        this.presetButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === activePreset);
        });
    }

    /**
     * Apply color theme
     */
    applyColorTheme(theme) {
        // Remove any existing theme classes
        document.documentElement.classList.remove('theme-default', 'theme-midnight', 'theme-ocean', 'theme-forest', 'theme-modern-gray');

        // Add the selected theme class
        if (theme !== 'default') {
            document.documentElement.classList.add(`theme-${theme}`);
        }
    }

    /**
     * Show save confirmation message
     */
    showSaveConfirmation() {
        if (!this.saveConfirmation) return;

        // Show the confirmation
        this.saveConfirmation.classList.add('visible');

        // Hide after 3 seconds
        setTimeout(() => {
            this.saveConfirmation.classList.remove('visible');
        }, 3000);
    }
}

// Create and export a singleton instance
const customizationView = new CustomizationView();
export default customizationView;