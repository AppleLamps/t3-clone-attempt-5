/**
 * Chat View for T3 Chat
 * Manages the chat UI and interaction with chat service
 */

import chatService from '../services/chatService.js';
import apiService from '../services/apiService.js';

class ChatView {
    constructor() {
        // Chat elements
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatLog = document.getElementById('chat-log');
        this.initialScreen = document.getElementById('initial-screen');
        this.promptButtons = document.querySelectorAll('.prompt-btn');
        this.newChatBtn = document.querySelector('.new-chat-btn');
        this.modelSelectorBtn = document.querySelector('.model-selector-btn');
        this.modelDropdown = document.querySelector('.model-dropdown');
        this.sidebar = document.querySelector('.sidebar-nav');
        this.attachBtn = document.querySelector('.attach-btn');
        this.reasoningEffortContainer = document.querySelector('.reasoning-effort-container');
        this.reasoningEffortBtn = document.querySelector('.reasoning-effort-btn');
        this.reasoningEffortDropdown = document.querySelector('.reasoning-effort-dropdown');

        // These elements are inside modelDropdown, so check if it exists
        if (this.modelDropdown) {
            this.chatModelSelectButtons = this.modelDropdown.querySelectorAll('.model-select-btn');
            this.chatReasoningEffortDropdown = this.modelDropdown.querySelector('.reasoning-effort-dropdown');
            this.chatReasoningEffortSelect = this.modelDropdown.querySelector('#reasoning-effort-chat');
        } else {
            this.chatModelSelectButtons = [];
            this.chatReasoningEffortDropdown = null;
            this.chatReasoningEffortSelect = null;
        }

        // Attachment storage
        this.attachments = [];

        // Usage warning displayed
        this.usageWarningDisplayed = false;

        // Initialize UI
        this.init();
    }

    /**
     * Update the model selector button text to reflect the active model
     */
    updateModelSelectorText() {
        if (!this.modelSelectorBtn) return;

        const activeModel = apiService.getActiveModel();
        const availableModels = apiService.getAvailableModels();
        let activeModelName = 'Select Model';

        // Find the active model's name from the available models list
        if (activeModel.provider && activeModel.model) {
            const providerModels = availableModels[activeModel.provider];
            if (providerModels) {
                const modelData = providerModels.find(m => m.id === activeModel.model);
                if (modelData) {
                    activeModelName = modelData.name;
                }
            }
        }

        const icon = this.modelSelectorBtn.querySelector('svg.icon');
        this.modelSelectorBtn.textContent = activeModelName + ' ';
        if (icon) {
            this.modelSelectorBtn.appendChild(icon);
        }

        // Show/hide reasoning effort dropdown based on the active model
        this.updateReasoningEffortVisibility();
    }

    /**
     * Update visibility of reasoning effort dropdown based on active model
     */
    updateReasoningEffortVisibility() {
        // Hide reasoning effort controls since we don't have reasoning models
        if (this.reasoningEffortContainer) {
            this.reasoningEffortContainer.style.display = 'none';
        }
    }

    /**
     * Initialize the chat view
     */
    init() {
        this.renderModelDropdown(); // Dynamically render the model dropdown first

        // Set up event listeners
        this.chatForm?.addEventListener('submit', this.handleSubmit.bind(this));
        this.promptButtons?.forEach(button => {
            button.addEventListener('click', this.handlePromptClick.bind(this));
        });
        this.newChatBtn?.addEventListener('click', this.handleNewChat.bind(this));
        
        if (this.modelSelectorBtn) {
            this.modelSelectorBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent immediate closing from document click
                this.modelDropdown?.classList.toggle('show');
            });
        }

        // No reasoning effort controls since we don't have reasoning models

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            // Close model dropdown
            if (this.modelDropdown && !this.modelDropdown.contains(e.target) && this.modelSelectorBtn && !this.modelSelectorBtn.contains(e.target)) {
                this.modelDropdown.classList.remove('show');
            }
        });

        // Set up file attachment functionality
        if (this.attachBtn) {
            this.setupFileUpload();
        }

        // Set up textarea auto-resize
        if (this.chatInput) {
            this.chatInput.addEventListener('input', this.handleInputResize.bind(this));

            // Add keydown event listener for Enter and Ctrl+Enter handling
            this.chatInput.addEventListener('keydown', this.handleInputKeydown.bind(this));
        }

        // Render initial state
        this.renderConversations();
        this.handleChatSelect(this.getActiveChatId());
        this.updateModelSelectorText();
        this.checkMessageUsage();

        // Set up chat deletion handling
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-chat-btn')) {
                const chatItem = e.target.closest('.chat-item');
                if (chatItem) {
                    const chatId = chatItem.dataset.chatId;
                    this.handleDeleteChat(chatId);
                }
            } else if (e.target.closest('.chat-item')) {
                const chatItem = e.target.closest('.chat-item');
                if (chatItem) {
                    const chatId = chatItem.dataset.chatId;
                    this.handleChatSelect(chatId);
                }
            }
        });
    }

    /**
     * Helper to get the active chat ID
     * @returns {string|null}
     */
    getActiveChatId() {
        return chatService.activeConversationId;
    }

    /**
     * Set up file upload functionality
     */
    setupFileUpload() {
        // Create a hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*,.pdf,application/pdf,.doc,.docx,.txt,.csv,.xlsx,.xls';
        fileInput.style.display = 'none';
        fileInput.id = 'hidden-file-input';
        document.body.appendChild(fileInput);

        // Store reference to file input
        this.fileInput = fileInput;

        // Connect the attach button to the file input
        this.attachBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Handle file selection
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    /**
     * Handle file selection
     * @param {Event} e - Change event from file input
     */
    async handleFileSelect(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Show upload indicator
        const sendButton = this.chatForm?.querySelector('.send-btn');
        if (sendButton) sendButton.disabled = false;

        // Create attachment preview container if it doesn't exist
        let attachmentPreview = document.querySelector('.attachment-preview');
        if (!attachmentPreview) {
            attachmentPreview = document.createElement('div');
            attachmentPreview.className = 'attachment-preview';
            this.chatForm.insertBefore(attachmentPreview, this.chatInput.nextSibling);
        }

        // Process each file
        for (const file of files) {
            try {
                // Check file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`File ${file.name} is too large (max 10MB)`);
                }

                // Create file preview item
                const previewItem = document.createElement('div');
                previewItem.className = 'attachment-item';

                // Add loading indicator
                previewItem.innerHTML = `
                    <div class="attachment-loading">
                        <svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke-width="3"></circle></svg>
                        <div class="attachment-name">${file.name}</div>
                    </div>
                    <button class="remove-attachment" data-filename="${file.name}">×</button>
                `;
                attachmentPreview.appendChild(previewItem);

                // Process the file
                const fileData = await this.processFile(file);

                // Store attachment data
                this.attachments.push({
                    name: file.name,
                    type: file.type,
                    data: fileData,
                    size: file.size
                });

                // Update preview with success state
                previewItem.querySelector('.attachment-loading').innerHTML = `
                    <div class="attachment-icon">${this.getFileIcon(file.type)}</div>
                    <div class="attachment-name">${file.name}</div>
                `;

                // Add event listener to remove button
                previewItem.querySelector('.remove-attachment').addEventListener('click', (e) => {
                    // Remove attachment from array
                    const filename = e.target.dataset.filename;
                    this.attachments = this.attachments.filter(a => a.name !== filename);

                    // Remove preview item
                    previewItem.remove();

                    // If no attachments left, remove the preview container
                    if (this.attachments.length === 0) {
                        attachmentPreview.remove();

                        // Disable send button if no text either
                        if (sendButton && this.chatInput.value.trim() === '') {
                            sendButton.disabled = true;
                        }
                    }
                });

            } catch (error) {
                console.error('Error processing file:', error);
                // Show error in preview
                const previewItem = document.createElement('div');
                previewItem.className = 'attachment-item error';
                previewItem.innerHTML = `
                    <div class="attachment-error">
                        <svg class="error-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12" y2="16"></line></svg>
                        <div>Error: ${error.message}</div>
                    </div>
                    <button class="remove-attachment">×</button>
                `;
                attachmentPreview.appendChild(previewItem);

                // Add event listener to remove button
                previewItem.querySelector('.remove-attachment').addEventListener('click', () => {
                    previewItem.remove();

                    // If no attachments left, remove the preview container
                    if (attachmentPreview.children.length === 0) {
                        attachmentPreview.remove();
                    }
                });
            }
        }

        // Reset file input
        this.fileInput.value = '';
    }

    /**
     * Process a file and convert to appropriate format for sending
     * @param {File} file - The file to process
     * @returns {Promise<string>} - Promise resolving to base64 data
     */
    processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    // Get base64 data - either as data URL or raw base64 string
                    let base64Data = e.target.result;

                    // If already a data URL with the correct format, use it directly
                    if (base64Data.startsWith(`data:${file.type};base64,`)) {
                        console.log(`File ${file.name} already has correct data URL format`);
                        resolve(base64Data);
                    }
                    // If it's a data URL but with wrong mime type, fix it
                    else if (base64Data.startsWith('data:')) {
                        console.log(`File ${file.name} has data URL with wrong mime type, fixing`);
                        const base64Content = base64Data.split('base64,')[1];
                        const result = `data:${file.type};base64,${base64Content}`;
                        resolve(result);
                    }
                    // If it's raw base64, add the proper prefix
                    else {
                        console.log(`File ${file.name} has raw base64 data, adding prefix`);
                        const result = `data:${file.type};base64,${base64Data}`;
                        resolve(result);
                    }
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    reject(error);
                }
            };

            reader.onerror = (error) => {
                console.error(`Failed to read file ${file.name}:`, error);
                reject(new Error(`Failed to read file ${file.name}`));
            };

            // Read as data URL (base64)
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get appropriate icon for file type
     * @param {string} fileType - MIME type of the file
     * @returns {string} - SVG icon markup
     */
    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) {
            return '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>';
        } else if (fileType.includes('pdf')) {
            return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>';
        } else if (fileType.includes('word') || fileType.includes('doc')) {
            return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 15h.01"></path><path d="M12 15h.01"></path><path d="M15 15h.01"></path></svg>';
        } else if (fileType.includes('csv') || fileType.includes('spreadsheet')) {
            return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M8 18v-8"></path><path d="M12 18v-4"></path><path d="M16 18v-6"></path></svg>';
        } else {
            return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>';
        }
    }

    /**
     * Handle form submission
     * @param {Event} e - Submit event or object with preventDefault and retryMessage
     */
    async handleSubmit(e) {
        e.preventDefault();
        // Check if this is a retry with a specific message
        const messageText = e.retryMessage || this.chatInput.value.trim();

        // Don't submit if there's no text and no attachments
        if (!messageText && (!this.attachments || this.attachments.length === 0)) return;

        // Hide initial screen if visible
        if (this.initialScreen && this.chatLog.children.length === 0) {
            this.initialScreen.style.display = 'none';
        }

        // Create a message object for display and processing
        let messageObject = { text: messageText };

        // Format attachments based on OpenAI's expected format
        if (this.attachments.length > 0) {
            // For API compatibility, we'll just pass the attachments directly
            // The OpenAI provider will handle the proper formatting
            messageObject.attachments = [...this.attachments];
        }

        // Create a display message that shows the text and attachment previews
        let displayMessage = messageText;

        // Add file previews to the display message if there are attachments
        if (this.attachments.length > 0) {
            // Clear the attachments preview area
            const attachmentPreview = document.querySelector('.attachment-preview');
            if (attachmentPreview) {
                attachmentPreview.remove();
            }

            // Append a note about attachments to the display message
            displayMessage += displayMessage ? '\n\n' : '';
            displayMessage += `[Attached ${this.attachments.length} file${this.attachments.length > 1 ? 's' : ''}]`;
        }

        // Show sending message with attachments
        this.appendMessage(messageText, 'user-message', this.attachments);
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto'; // Reset height after sending
        this.chatInput.focus();

        // Disable inputs during processing
        this.chatInput.disabled = true;

        // Create a placeholder for the bot message
        const botMessageElement = this.createBotMessageElement();
        this.chatLog.appendChild(botMessageElement);
        this.scrollToBottom();

        try {
            // Clear any loading indicator in the bot message element
            botMessageElement.innerHTML = '';

            console.log('Sending message with attachments:', messageObject);

            // Send message to chat service with streaming callback
            await chatService.sendMessage(messageObject, (chunk) => {
                // Render markdown for streaming bot message
                botMessageElement.innerHTML = this.simpleMarkdownToHtml(chunk);

                // Make sure the markdown-content class is applied
                if (!botMessageElement.classList.contains('markdown-content')) {
                    botMessageElement.classList.add('markdown-content');
                }

                // Attach code block listeners for any code blocks in the message
                this.attachCodeBlockListeners(botMessageElement);

                // Re-add copy button that got removed during innerHTML update
                let copyButton = botMessageElement.querySelector('.copy-message-btn');
                if (!copyButton) {
                    copyButton = document.createElement('button');
                    copyButton.className = 'copy-message-btn';
                    copyButton.style.display = 'none'; // Keep hidden during streaming
                    copyButton.innerHTML = `
                        <svg class="icon" viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    `;

                    // Add event listener to copy button
                    copyButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.copyMessageToClipboard(botMessageElement);
                    });

                    botMessageElement.appendChild(copyButton);
                }

                this.scrollToBottom();
            });

            // Update sidebar with new chat if needed
            this.renderConversations();

            // Show copy button after streaming is complete
            const copyButton = botMessageElement.querySelector('.copy-message-btn');
            if (copyButton) {
                copyButton.style.display = 'flex';
            }

            // Clear the attachments array after sending
            this.attachments = [];

            // Check usage after sending message
            this.checkMessageUsage();

        } catch (error) {
            console.error('Error in chat submission:', error);

            // Instead of removing the bot message, convert it to an error message
            if (botMessageElement.parentNode) {
                botMessageElement.classList.remove('bot-message');
                botMessageElement.classList.add('error-message');

                let errorMessage = error.message || 'Unknown error';

                // Check if it's a usage limit error
                if (errorMessage.includes('message limit')) {
                    // Update usage check flag to show warning next time
                    this.usageWarningDisplayed = false;

                    // Check if we need to disable the input
                    const activeModel = apiService.getActiveModel();
                    const isPremiumModel = activeModel.provider === 'anthropic' ||
                                          activeModel.provider === 'xai' ||
                                          activeModel.model === 'gpt-4';

                    if (isPremiumModel && chatService.isPremiumLimitReached()) {
                        this.disableInput("You've reached your premium message limit. Please try a standard model or wait until your usage resets.");
                    } else if (chatService.isStandardLimitReached()) {
                        this.disableInput("You've reached your message limit for this period. Please wait until your usage resets.");
                    }
                }

                // Handle storage quota errors with a more user-friendly message
                if (errorMessage.includes('quota') ||
                    error.name === 'QuotaExceededError' ||
                    error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    errorMessage = 'Storage limit reached. Please delete some older conversations to continue.';
                }

                // Add error message with retry button
                botMessageElement.innerHTML = `
                    <div>Sorry, there was an error processing your request: ${errorMessage}</div>
                    <button class="retry-btn">Retry</button>
                `;

                // Add event listener to retry button
                const retryBtn = botMessageElement.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', async () => {
                        // Remove the error message
                        botMessageElement.remove();

                        // Try sending the message again
                        this.handleSubmit({
                            preventDefault: () => {},
                            retryMessage: messageText
                        });
                    });
                }
            }
        } finally {
            // Re-enable input unless at limit
            if (!chatService.isStandardLimitReached()) {
                this.chatInput.disabled = false;
            }
        }
    }

    /**
     * Handle prompt button click
     * @param {Event} e - Click event
     */
    handlePromptClick(e) {
        this.chatInput.value = e.target.textContent;
        this.chatInput.focus();
        this.handleInputResize();
    }

    /**
     * Create a bot message element (placeholder for streaming)
     * @returns {HTMLElement} - Bot message element
     */
    createBotMessageElement() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'bot-message', 'markdown-content');
        // Add a loading indicator to show that the message is being processed
        messageElement.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

        // Add copy button (initially hidden while streaming)
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-message-btn';
        copyButton.style.display = 'none'; // Hide during streaming
        copyButton.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
        `;

        // Add event listener to copy button
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent any parent listeners from firing
            this.copyMessageToClipboard(messageElement);
        });

        messageElement.appendChild(copyButton);
        return messageElement;
    }

    /**
     * Copy message text to clipboard
     * @param {HTMLElement} messageElement - The message element to copy text from
     */
    copyMessageToClipboard(messageElement) {
        // Create a temporary clone of the message to extract text properly
        const tempElement = messageElement.cloneNode(true);

        // Remove the copy button from the clone
        const copyBtn = tempElement.querySelector('.copy-message-btn');
        if (copyBtn) {
            copyBtn.remove();
        }

        // Get the text content, preserving formatting
        let messageText = '';

        // Handle code blocks specially to preserve formatting and indentation
        const codeBlocks = tempElement.querySelectorAll('.code-block-container');
        if (codeBlocks.length > 0) {
            // Process each code block
            codeBlocks.forEach(codeBlock => {
                // Get language from header if it exists
                const langElement = codeBlock.querySelector('.code-lang');
                const language = langElement ? langElement.textContent.trim() : '';

                // Get the code content
                const codeElement = codeBlock.querySelector('code');
                if (codeElement) {
                    const code = codeElement.textContent;

                    // Mark the code block position in the text
                    const placeholder = `__CODE_BLOCK_${Math.random().toString(36).substring(2, 9)}__`;
                    codeBlock.replaceWith(placeholder);

                    // Store the formatted code block
                    messageText = messageText.replace(
                        placeholder,
                        `\`\`\`${language}\n${code}\n\`\`\``
                    );
                }
            });
        }

        // Now get the full text content
        if (messageText === '') {
            messageText = tempElement.textContent.trim();
        } else {
            // If we've processed code blocks, update the messageText with the remaining content
            const remainingText = tempElement.textContent.trim();
            messageText = remainingText;
        }

        // Copy to clipboard
        navigator.clipboard.writeText(messageText)
            .then(() => {
                // Show success state on the original button
                const originalBtn = messageElement.querySelector('.copy-message-btn');
                if (originalBtn) {
                    originalBtn.classList.add('copied');
                    originalBtn.innerHTML = `
                        <svg class="icon" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Copied!</span>
                    `;

                    // Reset after 2 seconds
                    setTimeout(() => {
                        originalBtn.classList.remove('copied');
                        originalBtn.innerHTML = `
                            <svg class="icon" viewBox="0 0 24 24">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        `;
                    }, 2000);
                }
            })
            .catch(err => {
                console.error('Failed to copy message:', err);
                alert('Failed to copy message to clipboard');
            });
    }

    /**
     * Handle new chat button click
     */
    handleNewChat() {
        chatService.createConversation();
        this.renderConversations();
        this.clearChatLog();
        if (this.initialScreen) {
            this.initialScreen.style.display = 'block';
        }
        this.chatInput.disabled = false;
        this.chatInput.placeholder = 'Type a message...';
    }

    /**
     * Handle textarea input resize
     */
    handleInputResize() {
        if (!this.chatInput) return;

        this.chatInput.style.height = 'auto'; // Reset height
        this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';

        // Enable/disable send button
        const sendButton = this.chatForm?.querySelector('.send-btn');
        if (sendButton) {
            sendButton.disabled = this.chatInput.value.trim() === '';
        }
    }

    /**
     * Handle keydown events in the chat input
     * @param {KeyboardEvent} e - Keydown event
     */
    handleInputKeydown(e) {
        // Check if Enter key is pressed
        if (e.key === 'Enter') {
            // If Ctrl key or Shift key is pressed with Enter, insert a new line
            if (e.ctrlKey || e.shiftKey) {
                // Allow the default behavior (new line)
                return;
            } else {
                // Prevent the default behavior (new line)
                e.preventDefault();

                // Only submit if there's text in the input
                if (this.chatInput.value.trim()) {
                    // Submit the form
                    this.chatForm.dispatchEvent(new Event('submit'));
                }
            }
        }
    }

    /**
     * Append a message to the chat log
     * @param {string} text - Message text
     * @param {string} className - Message class (user-message or bot-message)
     * @param {Array} attachments - Optional array of attachments to display
     * @returns {HTMLElement} - The created message element
     */
    appendMessage(text, className, attachments = []) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', className);

        // For bot messages, make them markdown enabled
        if (className === 'bot-message') {
            messageElement.classList.add('markdown-content');
            messageElement.innerHTML = this.simpleMarkdownToHtml(text);
            this.attachCodeBlockListeners(messageElement);
        } else {
            // For user messages, handle simple newlines but don't apply markdown
            // First create a text container
            const textContainer = document.createElement('div');
            textContainer.className = 'message-text';
            textContainer.textContent = text;
            textContainer.innerHTML = textContainer.innerHTML.replace(/\n/g, '<br>');
            messageElement.appendChild(textContainer);

            // If there are image attachments, display them
            const imageAttachments = attachments.filter(att => att.type.startsWith('image/'));
            if (imageAttachments.length > 0) {
                const attachmentsContainer = document.createElement('div');
                attachmentsContainer.className = 'message-attachments';

                // Add each image attachment
                imageAttachments.forEach(attachment => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'message-image-container';

                    const img = document.createElement('img');
                    img.src = attachment.data;
                    img.alt = attachment.name;
                    img.className = 'message-image';

                    imgContainer.appendChild(img);
                    attachmentsContainer.appendChild(imgContainer);
                });

                messageElement.appendChild(attachmentsContainer);
            }

            // If there are non-image attachments, add a note about them
            const otherAttachments = attachments.filter(att => !att.type.startsWith('image/'));
            if (otherAttachments.length > 0) {
                const attachmentNote = document.createElement('div');
                attachmentNote.className = 'attachment-note';
                attachmentNote.textContent = `[Attached ${otherAttachments.length} file${otherAttachments.length > 1 ? 's' : ''}]`;
                messageElement.appendChild(attachmentNote);
            }
        }

        this.chatLog.appendChild(messageElement);
        this.scrollToBottom();

        return messageElement;
    }

    /**
     * Attach event listeners to code block copy and collapse buttons
     * @param {HTMLElement} container - Container element with code blocks
     */
    attachCodeBlockListeners(container) {
        setTimeout(() => {
            // Find all copy buttons and add click handlers
            const copyBtns = container.querySelectorAll('.code-control-btn.copy-btn');
            copyBtns.forEach(btn => {
                // Skip if already initialized
                if (btn.dataset.initialized) return;

                btn.dataset.initialized = 'true';
                btn.onclick = function() {
                    const codeElement = btn.closest('.code-block').querySelector('code');
                    // When copying, convert HTML entities back to actual characters
                    const code = codeElement.textContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"');
                    navigator.clipboard.writeText(code);

                    // Show success indicator
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';
                    btn.classList.add('copied');

                    // Reset button after 2 seconds
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.classList.remove('copied');
                    }, 2000);
                };
            });

            // Find all collapse buttons and add click handlers
            const collapseBtns = container.querySelectorAll('.code-control-btn.collapse-btn');
            collapseBtns.forEach(btn => {
                // Skip if already initialized
                if (btn.dataset.initialized) return;

                btn.dataset.initialized = 'true';
                btn.onclick = function() {
                    const preElement = btn.closest('.code-block');
                    preElement.classList.toggle('collapsed');

                    if (preElement.classList.contains('collapsed')) {
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
                        btn.setAttribute('title', 'Expand code');
                    } else {
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
                        btn.setAttribute('title', 'Collapse code');
                    }
                };
            });

            // Apply syntax highlighting to code blocks that haven't been highlighted yet
            const codeBlocks = container.querySelectorAll('code:not(.hljs-highlighted)');
            codeBlocks.forEach(codeBlock => {
                // Mark as processed to avoid re-processing
                codeBlock.classList.add('hljs-highlighted');

                // Add language-specific color classes based on the HTML structure
                const language = codeBlock.className.match(/language-([a-z0-9#+\-]*)/i)?.[1] || '';

                if (language === 'html' ||
                    codeBlock.textContent.includes('&lt;!DOCTYPE') ||
                    codeBlock.textContent.includes('&lt;html')) {
                    // Apply HTML syntax highlighting manually with escaped entities
                    let content = codeBlock.innerHTML;

                    // Highlight HTML tags (working with already escaped entities)
                    content = content.replace(/(&lt;\/?)([\w\d]+)([^&]*?)(&gt;)/g,
                        '$1<span class="hljs-name">$2</span>$3$4');

                    // Highlight attributes
                    content = content.replace(/(\s+)([\w\-:]+)(=)(&quot;.*?&quot;)/g,
                        '$1<span class="hljs-attr">$2</span>$3<span class="hljs-string">$4</span>');

                    // Apply the highlighted HTML
                    codeBlock.innerHTML = content;
                }
            });
        }, 0);
    }

    /**
     * Create a loading message element
     * @returns {HTMLElement} - Loading message element
     */
    createLoadingMessage() {
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('chat-message', 'bot-message', 'loading');
        loadingElement.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        return loadingElement;
    }

    /**
     * Scroll chat log to the bottom
     */
    scrollToBottom() {
        if (this.chatLog) {
            this.chatLog.scrollTop = this.chatLog.scrollHeight;
        }
    }

    /**
     * Clear the chat log
     */
    clearChatLog() {
        if (this.chatLog) {
            while (this.chatLog.firstChild) {
                this.chatLog.removeChild(this.chatLog.firstChild);
            }
        }
    }

    /**
     * Render a conversation in the chat log
     * @param {object} conversation - Conversation to render
     */
    async renderConversation(conversation) {
        if (!conversation || !conversation.messages) return;

        this.clearChatLog();

        // Hide initial screen when showing a conversation
        if (this.initialScreen) {
            this.initialScreen.style.display = 'none';
        }

        // Set the active class on the selected chat
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === conversation.id);
        });

        // Render all messages
        for (const message of conversation.messages) {
            const className = message.role === 'user' ? 'user-message' : 'bot-message';
            const content = typeof message.content === 'object' && message.content.text ?
                message.content.text : message.content;

            // Handle attachments in past messages
            let attachments = [];
            if (typeof message.content === 'object' && message.content.attachmentRefs && message.content.attachmentRefs.length > 0) {
                // Try to load attachments from storage
                for (const attachmentRef of message.content.attachmentRefs) {
                    try {
                        // For now, create placeholder attachments - in a real implementation
                        // you would load these from storage
                        if (attachmentRef.type && attachmentRef.type.startsWith('image/')) {
                            attachments.push({
                                name: attachmentRef.name,
                                type: attachmentRef.type,
                                // Use a placeholder or try to load from storage
                                data: `data:${attachmentRef.type};base64,${attachmentRef.id}` // This is a placeholder
                            });
                        }
                    } catch (error) {
                        console.error('Error loading attachment:', error);
                    }
                }
            }

            const messageElement = this.appendMessage(content, className, attachments);

            // Add copy button for bot messages
            if (className === 'bot-message') {
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-message-btn';
                copyButton.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                `;

                // Add event listener to copy button
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.copyMessageToClipboard(messageElement);
                });

                messageElement.appendChild(copyButton);
            }
        }

        // Update model selector
        this.updateModelSelectorText();
    }

    /**
     * Render the model dropdown menu dynamically
     */
    renderModelDropdown() {
        if (!this.modelDropdown) return;

        const availableModels = apiService.getAvailableModels();
        this.modelDropdown.innerHTML = ''; // Clear existing content

        // Get current active model for highlighting
        const activeModel = apiService.getActiveModel();

        for (const [providerName, models] of Object.entries(availableModels)) {
            // Create provider section
            const providerSection = document.createElement('div');
            providerSection.className = 'model-provider-section';

            // Create provider header
            const providerHeader = document.createElement('div');
            providerHeader.className = 'model-provider-header';
            
            const providerIcon = document.createElement('div');
            providerIcon.className = `provider-icon ${providerName.toLowerCase()}`;
            providerIcon.textContent = providerName.charAt(0).toUpperCase();
            
            providerHeader.appendChild(providerIcon);
            providerHeader.appendChild(document.createTextNode(providerName.toUpperCase()));
            
            providerSection.appendChild(providerHeader);

            models.forEach(model => {
                const button = document.createElement('button');
                button.className = 'model-select-btn';
                button.dataset.provider = providerName;
                button.dataset.model = model.id;

                // Check if this is the active model
                if (activeModel.provider === providerName && activeModel.model === model.id) {
                    button.classList.add('active');
                }

                // Create model info container
                const modelInfo = document.createElement('div');
                modelInfo.className = 'model-info';

                // Model name
                const modelName = document.createElement('div');
                modelName.className = 'model-name';
                modelName.textContent = model.name;
                modelInfo.appendChild(modelName);

                // Model description (if available)
                if (model.description) {
                    const modelDesc = document.createElement('div');
                    modelDesc.className = 'model-description';
                    modelDesc.textContent = model.description;
                    modelInfo.appendChild(modelDesc);
                }

                // Model meta information
                const modelMeta = document.createElement('div');
                modelMeta.className = 'model-meta';

                // Add category badge
                if (model.category) {
                    const categoryBadge = document.createElement('span');
                    categoryBadge.className = `model-badge ${model.category}`;
                    categoryBadge.textContent = model.category;
                    modelMeta.appendChild(categoryBadge);
                }

                // Add reasoning badge for reasoning models
                if (model.isReasoningModel) {
                    const reasoningBadge = document.createElement('span');
                    reasoningBadge.className = 'model-badge reasoning';
                    reasoningBadge.textContent = 'reasoning';
                    modelMeta.appendChild(reasoningBadge);
                }

                // Add token count
                if (model.maxTokens) {
                    const tokenInfo = document.createElement('span');
                    tokenInfo.className = 'model-tokens';
                    tokenInfo.textContent = this.formatTokenCount(model.maxTokens);
                    modelMeta.appendChild(tokenInfo);
                }

                modelInfo.appendChild(modelMeta);
                button.appendChild(modelInfo);

                button.addEventListener('click', (e) => {
                    e.stopPropagation();

                    try {
                        apiService.setActiveModel(providerName, model.id);
                        this.updateModelSelectorText();
                        this.updateReasoningEffortVisibility();
                        this.modelDropdown.classList.remove('show');
                    } catch (error) {
                        console.error("Error setting active model:", error);
                        alert(`Failed to select model: ${error.message}`);
                    }
                });

                providerSection.appendChild(button);
            });

            this.modelDropdown.appendChild(providerSection);
        }

        // No reasoning effort dropdown needed since we don't have reasoning models
    }

    /**
     * Format token count for display
     * @param {number} tokens - Token count
     * @returns {string} - Formatted token count
     */
    formatTokenCount(tokens) {
        if (tokens >= 1000000) {
            return `${(tokens / 1000000).toFixed(1)}M tokens`;
        } else if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(0)}K tokens`;
        } else {
            return `${tokens} tokens`;
        }
    }

    /**
     * Create the reasoning effort dropdown element
     * @returns {HTMLElement}
     */
    createReasoningEffortDropdown() {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'reasoning-effort-dropdown';
        dropdownContainer.style.display = 'none'; // Initially hidden

        const label = document.createElement('label');
        label.htmlFor = 'reasoning-effort-chat';
        label.textContent = 'Reasoning Effort:';

        const select = document.createElement('select');
        select.id = 'reasoning-effort-chat';
        select.innerHTML = `
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
        `;

        select.addEventListener('change', (e) => {
            e.stopPropagation();
            const activeModel = apiService.getActiveModel();
            if (activeModel.model === 'o4-mini') {
                apiService.setActiveModel(activeModel.provider, activeModel.model, select.value);
            }
        });

        dropdownContainer.appendChild(label);
        dropdownContainer.appendChild(select);

        // Update local references
        this.chatReasoningEffortDropdown = dropdownContainer;
        this.chatReasoningEffortSelect = select;

        return dropdownContainer;
    }

    /**
     * Render all conversations in the sidebar
     */
    renderConversations() {
        if (!this.sidebar) return;

        // Clear existing chats
        this.sidebar.innerHTML = '';

        // Get all conversations
        const conversations = chatService.getConversations();
        const activeConversationId = chatService.activeConversationId;

        if (conversations.length === 0) {
            this.sidebar.innerHTML = '<div class="empty-chats">No conversations yet</div>';
            return;
        }

        // Create a chat list element
        const chatList = document.createElement('div');
        chatList.className = 'chat-list';

        // Add each conversation to the list
        conversations.forEach(conversation => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = conversation.id;

            if (conversation.id === activeConversationId) {
                chatItem.classList.add('active');
            }

            chatItem.innerHTML = `
                <div class="chat-item-content">
                    <div class="chat-title">${conversation.title}</div>
                    <div class="chat-date">${this.formatDate(conversation.updatedAt)}</div>
                </div>
                <button class="delete-chat-btn" aria-label="Delete chat">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M19 6h-4V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v1H5a1 1 0 0 0 0 2h1v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8h1a1 1 0 1 0 0-2ZM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V5Zm7 14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8h8v11Z"/></svg>
                </button>
            `;

            chatList.appendChild(chatItem);
        });

        this.sidebar.appendChild(chatList);
    }

    /**
     * Format a date for display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date string
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[date.getDay()];
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Convert markdown to HTML using basic formatting rules
     * @param {string} markdown - Markdown text to convert
     * @returns {string} - HTML output
     */
    simpleMarkdownToHtml(markdown) {
        if (!markdown) return '';

        // Extract code blocks BEFORE sanitization
        const codeBlocks = [];
        // Use a more careful regex that preserves indentation
        let processedMarkdown = markdown.replace(/```([a-zA-Z0-9#+\-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const id = `CODE_BLOCK_${codeBlocks.length}`;
            // Store the code content with indentation preserved
            // If there's a leading newline, trim it, but keep all other whitespace intact
            const processedCode = code.startsWith('\n') ? code.substring(1) : code;
            codeBlocks.push({ lang: lang.trim() || 'text', code: processedCode });
            return id;
        });

        // Basic text sanitization on everything except code blocks
        const sanitized = processedMarkdown
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // Simple markdown parser for common elements
        let html = sanitized
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')

            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')

            // Inline code (only for remaining inline code)
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

            // Lists
            .replace(/^\s*\*\s+(.*)/gm, '<li>$1</li>')

            // Line breaks
            .replace(/\n/g, '<br>');

        // Re-insert code blocks with proper formatting
        codeBlocks.forEach((block, index) => {
            const placeholder = `CODE_BLOCK_${index}`;
            const codeHtml = this.generateCodeBlockHtml(block.lang, block.code);
            html = html.replace(placeholder, codeHtml);
        });

        return html;
    }

    /**
     * Process code blocks in markdown
     * @param {string} html - HTML with code blocks to process
     * @returns {string} - HTML with processed code blocks
     */
    processCodeBlocks(html) {
        // Special case - if the content looks like an HTML example with no code blocks
        // But appears to be code (e.g., contains multiple HTML tags), treat the whole thing as a code block
        if (!html.includes('```') && !html.includes('`') &&
            (html.match(/&lt;[\w\d]+/g)?.length > 3) &&
            html.includes('&lt;html') && html.includes('&lt;/html')) {

            return `
                <pre class="code-block" data-language="html">
                    <div class="code-block-header">
                        <span class="code-lang">HTML</span>
                        <div class="code-controls">
                            <button class="code-control-btn copy-btn" title="Copy code">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </button>
                            <button class="code-control-btn collapse-btn" title="Collapse code">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            </button>
                        </div>
                    </div>
                    <code class="language-html">${html}</code>
                </pre>
            `;
        }

        // Two different regex for different potential markdown code formats
        // This handles both standard markdown triple backticks and cases with or without newlines
        const codeBlockRegex1 = /```([a-zA-Z0-9#+\-]*)?(?:\s*<br>)?([\s\S]*?)```/g;
        const codeBlockRegex2 = /&lt;code(?:\s+class="language-([^"]+)")?&gt;([\s\S]*?)&lt;\/code&gt;/g;

        // First process standard markdown code blocks
        let processedHtml = html.replace(codeBlockRegex1, (match, language, code) => {
            // Smart language detection for HTML code
            let langDisplay = language || 'plaintext';

            // If no language specified but code looks like HTML, use html
            if (!language && (
                code.includes('&lt;html') ||
                code.includes('&lt;!DOCTYPE') ||
                (code.includes('&lt;head') && code.includes('&lt;body'))
            )) {
                langDisplay = 'html';
            }

            // Replace <br> with newlines but keep other HTML entities
            const codeContent = code.replace(/<br>/g, '\n').trim();

            return this.generateCodeBlockHtml(langDisplay, codeContent);
        });

        // Then process HTML code tag blocks
        processedHtml = processedHtml.replace(codeBlockRegex2, (match, language, code) => {
            const langDisplay = language || 'plaintext';

            // Just use the content as is, keeping HTML entities escaped
            const codeContent = code.trim();

            return this.generateCodeBlockHtml(langDisplay, codeContent);
        });

        return processedHtml;
    }

    /**
     * Generate HTML for a code block
     * @param {string} language - The programming language
     * @param {string} code - The code content (raw, unsanitized)
     * @returns {string} - HTML for the code block
     */
    generateCodeBlockHtml(language, code) {
        // First, preserve indentation by replacing spaces and tabs
        let processedCode = code
            // Preserve indentation by replacing leading spaces and tabs
            .replace(/^(\s+)/gm, (match) => {
                return match.replace(/ /g, ' '); // Use non-breaking space for indentation
            });

        // Then sanitize the code content properly for HTML display
        const sanitizedCode = processedCode
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // Format nice display language name with first letter capitalized
        const displayLang = language.charAt(0).toUpperCase() + language.slice(1);

        return `
            <pre class="code-block" data-language="${language}">
                <div class="code-block-header">
                    <span class="code-lang">${displayLang}</span>
                    <div class="code-controls">
                        <button class="code-control-btn copy-btn" title="Copy code">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button class="code-control-btn collapse-btn" title="Collapse code">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </button>
                    </div>
                </div>
                <code class="language-${language}">${sanitizedCode}</code>
            </pre>
        `;
    }

    /**
     * Check message usage and show warnings if approaching limits
     */
    checkMessageUsage() {
        const usage = chatService.getMessageUsage();
        const activeModel = apiService.getActiveModel();

        // Determine if using a premium model
        const isPremiumModel = activeModel.provider === 'anthropic' || // Claude
                               activeModel.provider === 'xai' ||       // Grok
                               activeModel.model === 'gpt-4';          // GPT-4

        // Calculate usage percentages
        const standardPercent = (usage.standard / usage.standardLimit) * 100;
        const premiumPercent = (usage.premium / usage.premiumLimit) * 100;

        // Check if we've already shown a warning this session
        if (this.usageWarningDisplayed) {
            return;
        }

        // Check if we need to show a warning for the current model type
        if (isPremiumModel && premiumPercent >= 90) {
            this.showUsageWarning('premium', usage);
            this.usageWarningDisplayed = true;
        } else if (!isPremiumModel && standardPercent >= 90) {
            this.showUsageWarning('standard', usage);
            this.usageWarningDisplayed = true;
        }

        // Disable input if limit is already reached
        const sendButton = this.chatForm?.querySelector('.send-btn');
        if (isPremiumModel && chatService.isPremiumLimitReached()) {
            this.disableInput("You've reached your premium message limit. Please try a standard model or wait until your usage resets.");
        } else if (chatService.isStandardLimitReached()) {
            this.disableInput("You've reached your message limit for this period. Please wait until your usage resets.");
        }
    }

    /**
     * Show usage warning message
     * @param {string} type - Type of usage warning ('standard' or 'premium')
     * @param {object} usage - Usage data
     */
    showUsageWarning(type, usage) {
        const warningElement = document.createElement('div');
        warningElement.className = 'chat-message warning-message';

        // Format reset time
        const resetTime = chatService.getFormattedResetTime();

        // Create warning message based on type
        if (type === 'premium') {
            warningElement.innerHTML = `
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                    <p><strong>Premium message limit approaching</strong></p>
                    <p>You have used ${usage.premium} of ${usage.premiumLimit} premium messages.</p>
                    <p>Your usage will reset on ${resetTime}.</p>
                </div>
            `;
        } else {
            warningElement.innerHTML = `
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                    <p><strong>Standard message limit approaching</strong></p>
                    <p>You have used ${usage.standard} of ${usage.standardLimit} standard messages.</p>
                    <p>Your usage will reset on ${resetTime}.</p>
                </div>
            `;
        }

        // Add dismiss button
        const dismissButton = document.createElement('button');
        dismissButton.className = 'dismiss-warning-btn';
        dismissButton.textContent = 'Dismiss';
        dismissButton.addEventListener('click', () => {
            warningElement.remove();
        });

        warningElement.appendChild(dismissButton);

        // Add to chat log
        this.chatLog.appendChild(warningElement);
        this.scrollToBottom();
    }

    /**
     * Handle chat selection
     * @param {string} chatId - The ID of the chat to select
     */
    handleChatSelect(chatId) {
        if (!chatId) {
            // If no chat ID provided, show initial screen
            if (this.initialScreen) {
                this.initialScreen.style.display = 'block';
            }
            this.clearChatLog();
            return;
        }

        // Set the active conversation
        chatService.setActiveConversation(chatId);
        
        // Get the conversation and render it
        const conversation = chatService.getConversation(chatId);
        if (conversation) {
            this.renderConversation(conversation);
        }
    }

    /**
     * Handle chat deletion
     * @param {string} chatId - The ID of the chat to delete
     */
    handleDeleteChat(chatId) {
        if (!chatId) return;

        // Delete the conversation directly without confirmation
        chatService.deleteConversation(chatId);
        
        // Re-render the conversations list
        this.renderConversations();
        
        // If the deleted chat was active, clear the chat log and show initial screen
        if (chatService.activeConversationId === chatId || !chatService.activeConversationId) {
            this.clearChatLog();
            if (this.initialScreen) {
                this.initialScreen.style.display = 'block';
            }
        }
    }

    /**
     * Disable chat input with a message
     * @param {string} message - Message explaining why input is disabled
     */
    disableInput(message) {
        if (this.chatInput) {
            this.chatInput.disabled = true;
            this.chatInput.placeholder = message;
        }

        const sendButton = this.chatForm?.querySelector('.send-btn');
        if (sendButton) {
            sendButton.disabled = true;
        }
    }
}

// Create and export a singleton instance
const chatView = new ChatView();
export default chatView;
