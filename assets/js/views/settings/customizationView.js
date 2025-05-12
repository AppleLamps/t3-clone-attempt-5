class CustomizationView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'settings-view customization-view';
    }

    render() {
        this.container.innerHTML = `
            <div class="customization-section">
                <h2>Customize T3 Chat</h2>
                
                <div class="form-group">
                    <label for="botName">What should T3 Chat call you?</label>
                    <input type="text" id="botName" class="customization-input" placeholder="Enter your name">
                </div>

                <div class="form-group">
                    <label for="userRole">What do you do?</label>
                    <input type="text" id="userRole" class="customization-input" placeholder="Engineer, student, etc.">
                </div>

                <div class="form-group">
                    <label for="botTraits">What traits should T3 Chat have?</label>
                    <textarea id="botTraits" class="customization-input" placeholder="Describe the AI's personality and traits"></textarea>
                </div>

                <div class="form-group">
                    <label for="additionalInfo">Anything else T3 Chat should know about you?</label>
                    <textarea id="additionalInfo" class="customization-input" placeholder="Interests, values, or preferences to keep in mind"></textarea>
                </div>

                <button class="save-preferences">Save Preferences</button>
            </div>

            <div class="customization-section">
                <h2>Visual Options</h2>
                
                <div class="checkbox-wrapper">
                    <div class="checkbox-label">
                        <label for="boringTheme">Boring Theme</label>
                        <div class="checkbox-description">If you think the pink is too much, turn this on to tone it down.</div>
                    </div>
                    <input type="checkbox" id="boringTheme">
                </div>

                <div class="checkbox-wrapper">
                    <div class="checkbox-label">
                        <label for="hidePersonalInfo">Hide Personal Information</label>
                        <div class="checkbox-description">Hides your name and email from the UI.</div>
                    </div>
                    <input type="checkbox" id="hidePersonalInfo">
                </div>

                <div class="form-group">
                    <label for="mainFont">Main Text Font</label>
                    <div class="description">Used in general text throughout the app.</div>
                    <select id="mainFont" class="font-select">
                        <option value="proxima">Proxima Vera (default)</option>
                        <option value="inter">Inter</option>
                        <option value="system">System Font</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="codeFont">Code Font</label>
                    <div class="description">Used in code blocks and inline code in chat messages.</div>
                    <select id="codeFont" class="font-select">
                        <option value="berkeley">Berkeley Mono (default)</option>
                        <option value="fira">Fira Code</option>
                        <option value="jetbrains">JetBrains Mono</option>
                    </select>
                </div>

                <div class="fonts-preview">
                    <h3>Fonts Preview</h3>
                    <div class="description">Can you write me a simple hello world program?</div>
                    <div class="preview-code">typescript
function greet(name: string) {
    console.log(\`Hello, \${name}!\`);
    return true;
}</div>
                </div>
            </div>
        `;

        return this.container;
    }

    // Add any event handlers or other methods here
} 