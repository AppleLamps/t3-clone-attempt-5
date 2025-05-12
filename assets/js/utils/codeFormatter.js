/**
 * Code Formatter Utility
 * Formats code blocks with syntax highlighting and a language header
 */

class CodeFormatter {
    /**
     * Initialize the code formatter
     */
    constructor() {
        this.init();
    }

    /**
     * Initialize event listeners and prepare code blocks
     */
    init() {
        // Format any existing code blocks when the DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.formatAllCodeBlocks();
        });

        // Listen for new content being added to the DOM (new messages)
        this.setupMutationObserver();
    }

    /**
     * Set up mutation observer to detect new code blocks
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldFormat = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.querySelector('pre code') || 
                                (node.nodeName === 'PRE' && node.querySelector('code'))) {
                                shouldFormat = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldFormat) {
                this.formatAllCodeBlocks();
            }
        });
        
        // Observe chat log area for changes
        const chatLog = document.getElementById('chat-log');
        if (chatLog) {
            observer.observe(chatLog, { childList: true, subtree: true });
        }
    }

    /**
     * Format all code blocks on the page
     */
    formatAllCodeBlocks() {
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach(codeBlock => this.formatCodeBlock(codeBlock));
    }

    /**
     * Format a single code block
     * @param {HTMLElement} codeBlock - The code block to format
     */
    formatCodeBlock(codeBlock) {
        // Skip if already formatted
        if (codeBlock.parentNode.classList.contains('code-block')) {
            return;
        }

        const preElement = codeBlock.parentNode;
        
        // Add the code-block class to the pre element
        preElement.classList.add('code-block');

        // Determine language from class
        let language = 'text';
        const classList = codeBlock.className.split(' ');
        for (const className of classList) {
            if (className.startsWith('language-')) {
                language = className.replace('language-', '');
                break;
            }
        }
        // Format language for display
        const languageMap = {
            js: 'JavaScript',
            javascript: 'JavaScript',
            ts: 'TypeScript',
            typescript: 'TypeScript',
            py: 'Python',
            python: 'Python',
            html: 'HTML',
            css: 'CSS',
            json: 'JSON',
            md: 'Markdown',
            bash: 'Bash',
            sh: 'Shell',
            shell: 'Shell',
            c: 'C',
            cpp: 'C++',
            csharp: 'C#',
            java: 'Java',
            go: 'Go',
            php: 'PHP',
            ruby: 'Ruby',
            swift: 'Swift',
            rust: 'Rust',
            dart: 'Dart',
            kotlin: 'Kotlin',
            sql: 'SQL',
            yaml: 'YAML',
            xml: 'XML',
            txt: 'Text',
            text: 'Text',
        };
        const languageDisplay = languageMap[language.toLowerCase()] || language.charAt(0).toUpperCase() + language.slice(1);

        // Set the data-language attribute for the header
        preElement.setAttribute('data-language', language);

        // Create the header
        let header = preElement.querySelector('.code-block-header');
        if (!header) {
            header = document.createElement('div');
            header.className = 'code-block-header';
            // Language name
            const langSpan = document.createElement('span');
            langSpan.className = 'code-lang';
            langSpan.textContent = languageDisplay;
            header.appendChild(langSpan);
            // Controls
            const controls = this.createControls(preElement);
            header.appendChild(controls);
            // Insert header as first child of <pre>
            preElement.insertBefore(header, preElement.firstChild);
        }

        // Let Prism.js highlight the code if not already highlighted
        if (!codeBlock.classList.contains('prism-highlighted')) {
            if (window.Prism) {
                Prism.highlightElement(codeBlock);
            }
        }
    }

    /**
     * Create control buttons for the code block header
     * @param {HTMLElement} preElement - The pre element containing the code
     * @returns {HTMLElement} controls - The controls container
     */
    createControls(preElement) {
        const controls = document.createElement('div');
        controls.className = 'code-controls';

        // Copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'code-control-btn copy-btn';
        copyButton.setAttribute('title', 'Copy code');
        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        copyButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const code = preElement.querySelector('code').textContent;
            this.copyToClipboard(code, copyButton);
        });

        // Collapse button
        const collapseButton = document.createElement('button');
        collapseButton.className = 'code-control-btn collapse-btn';
        collapseButton.setAttribute('title', 'Collapse code');
        collapseButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
        collapseButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            preElement.classList.toggle('collapsed');
            if (preElement.classList.contains('collapsed')) {
                collapseButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
                collapseButton.setAttribute('title', 'Expand code');
            } else {
                collapseButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
                collapseButton.setAttribute('title', 'Collapse code');
            }
        });

        controls.appendChild(copyButton);
        controls.appendChild(collapseButton);
        return controls;
    }

    /**
     * Copy code to clipboard
     * @param {string} text - The text to copy
     * @param {HTMLElement} button - The button element that triggered the copy
     */
    copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            // Show success indicator
            const originalInnerHTML = button.innerHTML;
            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';
            button.classList.add('copied');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalInnerHTML;
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
}

// Initialize the code formatter
const codeFormatter = new CodeFormatter();

export default codeFormatter; 