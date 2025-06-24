/**
 * OpenAI Provider for T3 Chat
 * Handles communication with OpenAI API
 */

class OpenAIProvider {
    constructor() {
        this.name = 'openai';
        this.models = [
            {
                id: 'gpt-4.1',
                name: 'GPT-4.1',
                description: 'Advanced AI assistant with extensive reasoning and knowledge',
                maxTokens: 1000000,
                category: 'premium'
            },
            {
                id: 'gpt-4.1-mini',
                name: 'GPT-4.1 Mini',
                description: 'Lighter version of GPT-4.1 with improved performance over Nano for complex tasks',
                maxTokens: 32000,
                category: 'standard'
            },
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                description: 'Optimized version of GPT-4 with improved performance',
                maxTokens: 128000,
                category: 'premium'
            },
            {
                id: 'o4-mini',
                name: 'o4-Mini',
                description: 'Reasoning model with advanced problem-solving capabilities',
                maxTokens: 32000,
                category: 'premium',
                isReasoningModel: true
            },
            {
                id: 'gpt-4.5-preview',
                name: 'GPT-4.5 Preview',
                description: 'Next-generation GPT model with enhanced capabilities and improved reasoning',
                maxTokens: 200000,
                category: 'premium'
            }
        ];

        // Remove reasoning models as they require session authentication
        this.reasoningModels = [];
    }

    /**
     * Check if the provider supports a specific model
     * @param {string} modelId - The model ID to check
     * @returns {boolean} - Whether the model is supported and not disabled
     */
    supportsModel(modelId) {
        const model = this.models.find(model => model.id === modelId);
        return model && !model.disabled;
    }

    /**
     * Get available models from this provider
     * @returns {array} - Array of model objects (excluding disabled models)
     */
    getAvailableModels() {
        return this.models.filter(model => !model.disabled);
    }

    /**
     * Upload a file to OpenAI API
     * @private
     * @param {string} base64Data - Base64-encoded file data
     * @param {string} fileName - Name of the file
     * @param {string} mimeType - MIME type of the file
     * @returns {Promise<string>} - Promise resolving to file ID
     */
    async _uploadFile(base64Data, fileName, mimeType) {
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) {
                throw new Error('OpenAI API key not found in settings.');
            }
            
            // Convert base64 to binary data
            const binaryData = atob(base64Data);
            const byteArray = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                byteArray[i] = binaryData.charCodeAt(i);
            }
            
            // Create file blob
            const blob = new Blob([byteArray], { type: mimeType });
            
            // Create form data
            const formData = new FormData();
            formData.append('file', blob, fileName);
            formData.append('purpose', 'assistants');
            
            // Upload file
            const response = await fetch('https://api.openai.com/v1/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`File upload failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    /**
     * Generate a completion using OpenAI model
     * @param {string} modelId - The model ID to use
     * @param {string} message - The user's message
     * @param {array} conversation - Previous conversation messages
     * @param {object} options - Additional options
     * @param {function} onStreamUpdate - Callback function for streaming updates
     * @returns {Promise} - Promise resolving when the stream is complete
     */
    async generateCompletion(modelId, message, conversation = [], options = {}, onStreamUpdate) {
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) {
                throw new Error('OpenAI API key not found in settings.');
            }

            const formattingOptions = { ...options, modelId };
            const messages = this._formatMessages(message, conversation, formattingOptions);
            
            // Check for attachments
            const hasAttachments = options.attachments && options.attachments.length > 0;

            // Always use chat completions API
            const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

            let requestBody;

            if (hasAttachments) {
                // Use vision model for handling attachments
                const visionModel = 'gpt-4o';
                
                // Prepare content array with text and files
                const content = [];
                
                // Add text content
                if (message && message.trim()) {
                    content.push({
                        type: 'text',
                        text: message
                    });
                }
                
                // Process each attachment
                for (const attachment of options.attachments) {
                    if (attachment.textContent) {
                        // Add text file, markdown, code, or PDF text
                        content.push({
                            type: 'text',
                            text: `File: ${attachment.name}\n${attachment.textContent}`
                        });
                    } else if (attachment.type && attachment.type.startsWith('image/')) {
                        // Handle images
                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: attachment.data,
                                detail: attachment.type.includes('png') || attachment.type.includes('jpg') 
                                    ? 'high' : 'auto'
                            }
                        });
                    }
                }

                // Build messages array for vision model
                const messagesWithAttachments = [];
                
                // Add system message if present
                if (options.systemMessage) {
                    messagesWithAttachments.push({
                        role: 'system',
                        content: options.systemMessage
                    });
                }
                
                // Add previous conversation messages (excluding attachments for simplicity)
                if (conversation && conversation.length > 0) {
                    for (const msg of conversation.slice(0, -1)) { // Exclude the latest user message which has attachments
                        const role = msg.role === 'user' ? 'user' : 'assistant';
                        const msgContent = typeof msg.content === 'object' && msg.content.text 
                            ? msg.content.text 
                            : msg.content;
                            
                        messagesWithAttachments.push({
                            role,
                            content: msgContent
                        });
                    }
                }
                
                // Add the latest user message with attachments
                messagesWithAttachments.push({
                    role: 'user',
                    content
                });
                
                requestBody = {
                    model: visionModel, // Use vision model when attachments are present
                    messages: messagesWithAttachments,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 4000,
                    stream: true
                };
            } else {
                requestBody = {
                    model: modelId,
                    messages: messages,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 2000,
                    stream: true
                };
            }

            // Sanitize messages before sending to API
            if (requestBody.messages) {
                requestBody.messages = this._sanitizeAndNormalizeMessages(requestBody.messages);
            }
            
            console.log('Sending request to OpenAI:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                let errorMessage = 'Unknown API error';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || 'API error: ' + response.status;
                    console.error('API error details:', errorData);
                } catch (e) {
                    errorMessage = `API error: ${response.status} ${response.statusText}`;
                }
                throw new Error(`OpenAI API error: ${errorMessage}`);
            }

            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let fullContent = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop(); 

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            reader.cancel();
                            const finalFormattedContent = this._formatApiResponse(fullContent);
                            return { message: finalFormattedContent, provider: this.name, model: modelId, usage: null };
                        }
                        try {
                            const json = JSON.parse(data);
                            const content = json.choices[0]?.delta?.content || '';
                            if (content) {
                                fullContent += content;
                                if (onStreamUpdate) {
                                    // Stream formatted content incrementally
                                    onStreamUpdate(this._formatApiResponse(fullContent));
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing stream chunk:', e, 'Chunk:', data);
                        }
                    }
                }
            }
            // Fallback if [DONE] is not received
            const finalFormattedContent = this._formatApiResponse(fullContent);
            return { message: finalFormattedContent, provider: this.name, model: modelId, usage: null };

        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }

    /**
     * Format messages for the OpenAI API
     * @private
     */
    _formatMessages(userMessage, conversation, options) {
        const messages = [];

        if (options.systemMessage) {
            messages.push({ role: 'system', content: options.systemMessage });
        }

        if (conversation && conversation.length > 0) {
            for (const msg of conversation) {
                const content = typeof msg.content === 'object' && msg.content.text 
                    ? msg.content.text 
                    : msg.content;
                messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content });
            }
        }

        // Handle the current user message
        const finalUserMessage = typeof userMessage === 'object' && userMessage.text 
            ? userMessage.text 
            : userMessage;
        messages.push({ role: 'user', content: finalUserMessage });
        
        return messages;
    }

    /**
     * Format the API response text
     * @private
     * @param {string} text - The raw API response text
     * @returns {string} - Formatted text
     */
    _formatApiResponse(text) {
        if (!text) {
            return '';
        }

        let formattedText = text;

        // Normalize newlines to \n first
        formattedText = formattedText.replace(/\r\n|\r/g, '\n');

        // Convert headings (e.g., ### 1. Section) to markdown H3 style
        // Looks for lines starting with one or more #, optionally followed by numbers/dots, then captures the heading text.
        formattedText = formattedText.replace(/^#+\s*(\d*\.?\s*.*?)\s*$/gm, (match, headingContent) => {
            const level = (match.match(/#/g) || []).length;
            // Keep it as markdown, let rendering layer decide HTML tags
            return `${'#'.repeat(level)} ${headingContent.trim()}`; 
        });
        
        // Format bolded items using markdown (**bold**)
        // This regex looks for text surrounded by ** or __ (common markdown bold markers)
        // It ensures that the opening and closing markers are the same.
        formattedText = formattedText.replace(/(\*\*|__)(?=\S)(.+?[*_]*)(?<=\S)\1/g, '**$2**');

        // Paragraphs: Replace two or more newlines with a double newline (for a single blank line between paragraphs)
        formattedText = formattedText.replace(/\n{2,}/g, '\n\n');
        
        // Clean up leading/trailing whitespace on each line
        formattedText = formattedText.split('\n').map(line => line.trim()).join('\n');
        
        // Remove leading/trailing newlines from the whole text again after all transformations
        formattedText = formattedText.trim();

        return formattedText;
    }
    
    /**
     * Check if a model ID is a reasoning model
     * @param {string} modelId
     * @returns {boolean}
     */
    isReasoningModel(modelId) {
        return this.reasoningModels.includes(modelId);
    }

    /**
     * Sanitizes and normalizes an array of messages to ensure roles alternate correctly
     * and content is structured as expected by the OpenAI API.
     * @private
     * @param {Array<Object>} inputMessages - The raw array of message objects.
     * @returns {Array<Object>} - A new array of sanitized message objects.
     */
    _sanitizeAndNormalizeMessages(inputMessages) {
        if (!inputMessages || inputMessages.length === 0) {
            return [];
        }

        const finalApiMessages = [];
        let systemMessage = null;

        // Separate system message and operational messages
        const operationalMessages = [];
        for (const msg of inputMessages) {
            if (msg.role === 'system') {
                if (!systemMessage) { // Keep only the first system message
                    systemMessage = { ...msg }; // Shallow copy
                }
            } else {
                operationalMessages.push({ ...msg }); // Shallow copy
            }
        }

        if (systemMessage) {
            finalApiMessages.push(systemMessage);
        }

        if (operationalMessages.length === 0) {
            return finalApiMessages;
        }

        // Add first operational message
        finalApiMessages.push(operationalMessages[0]);

        for (let i = 1; i < operationalMessages.length; i++) {
            const currentMessage = operationalMessages[i];
            const lastFinalMessage = finalApiMessages[finalApiMessages.length - 1];

            if (lastFinalMessage.role === currentMessage.role) {
                // Roles are the same, attempt to merge content
                if (typeof lastFinalMessage.content === 'string' && typeof currentMessage.content === 'string') {
                    lastFinalMessage.content += '\n' + currentMessage.content;
                } else if (Array.isArray(lastFinalMessage.content) && typeof currentMessage.content === 'string') {
                    // Last message has array content (vision), current is string. Append to text part or add new text part.
                    let textPartFound = false;
                    for (const part of lastFinalMessage.content) {
                        if (part.type === 'text') {
                            part.text += '\n' + currentMessage.content;
                            textPartFound = true;
                            break;
                        }
                    }
                    if (!textPartFound) {
                        lastFinalMessage.content.push({ type: 'text', text: currentMessage.content });
                    }
                } else if (typeof lastFinalMessage.content === 'string' && Array.isArray(currentMessage.content)) {
                    // Last message is string, current has array content. Cannot merge string into array. Add as new.
                    finalApiMessages.push(currentMessage);
                } else if (Array.isArray(lastFinalMessage.content) && Array.isArray(currentMessage.content)) {
                    // Both are arrays (e.g., multiple vision user messages). Concatenate content arrays.
                    lastFinalMessage.content = lastFinalMessage.content.concat(currentMessage.content);
                } else {
                    // Unhandled complex merge case or incompatible types, add current message as new.
                    finalApiMessages.push(currentMessage);
                }
            } else {
                // Roles are different, add current message as new.
                finalApiMessages.push(currentMessage);
            }
        }
        return finalApiMessages;
    }

    /**
     * Format file size for display
     * @private
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    _formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} bytes`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

export default OpenAIProvider;
