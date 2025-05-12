/**
 * Chat Service for T3 Chat
 * Manages conversations and chat history
 */

import apiService from './apiService.js';

// Constants for localStorage keys
const LS_CONVERSATIONS_KEY = 't3chat_conversations';
const LS_ACTIVE_CONVERSATION_KEY = 't3chat_active_conversation';
const LS_SYSTEM_MESSAGE_KEY = 't3chat_system_message';
const LS_MEMORY_ENABLED_KEY = 't3chat_enable_memory';
const LS_MESSAGE_USAGE_KEY = 't3chat_message_usage';
const LS_USAGE_RESET_TIME_KEY = 't3chat_usage_reset_time';

class ChatService {
    constructor() {
        this.conversations = [];
        this.activeConversationId = null;
        this.systemMessage = '';
        this.memoryEnabled = true; // Default to true
        this.messageUsage = {
            standard: 0,
            premium: 0,
            standardLimit: 1500,
            premiumLimit: 100,
            resetTime: null
        };
        this.loadChats();
        this.loadMemoryEnabled();
        this.loadMessageUsage();
        
        // Initialize the attachments store
        this.initAttachmentsStore();
    }

    /**
     * Initialize IndexedDB for storing file attachments
     */
    async initAttachmentsStore() {
        try {
            // Check for IndexedDB support
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported, attachments will not persist');
                return;
            }
            
            // Open the database
            const request = indexedDB.open('t3chatAttachments', 1);
            
            // Handle database upgrade (first time creation)
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for attachments
                if (!db.objectStoreNames.contains('attachments')) {
                    db.createObjectStore('attachments', { keyPath: 'id' });
                }
            };
            
            // Store database reference
            request.onsuccess = (event) => {
                this.db = event.target.result;
            };
            
            request.onerror = (event) => {
                console.error('Error opening IndexedDB:', event.target.error);
            };
        } catch (error) {
            console.error('Error initializing attachments store:', error);
        }
    }
    
    /**
     * Store an attachment in IndexedDB
     * @param {string} attachmentId - Unique ID for the attachment
     * @param {object} attachment - Attachment data
     * @returns {Promise} - Promise that resolves when storage is complete
     */
    async storeAttachment(attachmentId, attachment) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.warn('IndexedDB not initialized, attachment will not persist');
                resolve(attachmentId);
                return;
            }
            
            try {
                // Start a transaction
                const transaction = this.db.transaction(['attachments'], 'readwrite');
                const store = transaction.objectStore('attachments');
                
                // Store attachment with ID
                const request = store.put({
                    id: attachmentId,
                    ...attachment
                });
                
                request.onsuccess = () => resolve(attachmentId);
                request.onerror = (e) => reject(e.target.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Retrieve an attachment from IndexedDB
     * @param {string} attachmentId - ID of attachment to retrieve
     * @returns {Promise<object>} - Promise resolving to attachment data
     */
    async getAttachment(attachmentId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not initialized'));
                return;
            }
            
            try {
                // Start a transaction
                const transaction = this.db.transaction(['attachments'], 'readonly');
                const store = transaction.objectStore('attachments');
                
                // Retrieve attachment by ID
                const request = store.get(attachmentId);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Delete an attachment from IndexedDB
     * @param {string} attachmentId - ID of attachment to delete
     * @returns {Promise} - Promise that resolves when deletion is complete
     */
    async deleteAttachment(attachmentId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(); // No DB, nothing to delete
                return;
            }
            
            try {
                // Start a transaction
                const transaction = this.db.transaction(['attachments'], 'readwrite');
                const store = transaction.objectStore('attachments');
                
                // Delete attachment by ID
                const request = store.delete(attachmentId);
                
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Create a new conversation
     * @returns {string} - ID of the new conversation
     */
    createConversation() {
        // Using Date.now() for client-side uniqueness
        // Note: For future scaling or backend sync, consider using UUIDs instead
        const conversationId = 'chat_' + Date.now();
        const newConversation = {
            id: conversationId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            model: apiService.getActiveModel(),
        };

        this.conversations.push(newConversation);
        this.activeConversationId = conversationId;
        this.saveChats();

        return conversationId;
    }

    /**
     * Get a conversation by ID
     * @param {string} conversationId - ID of the conversation to get
     * @returns {object|null} - Conversation object or null if not found
     */
    getConversation(conversationId) {
        return this.conversations.find(conv => conv.id === conversationId) || null;
    }

    /**
     * Get active conversation
     * @returns {object|null} - Active conversation object or null if none is active
     */
    getActiveConversation() {
        if (!this.activeConversationId) return null;
        return this.getConversation(this.activeConversationId);
    }

    /**
     * Set active conversation
     * @param {string} conversationId - ID of the conversation to set as active
     * @returns {object|null} - Activated conversation object or null if not found
     */
    setActiveConversation(conversationId) {
        const conversation = this.getConversation(conversationId);
        if (conversation) {
            this.activeConversationId = conversationId;
            return conversation;
        }
        return null;
    }

    /**
     * Add a message to a conversation
     * @param {string} conversationId - ID of the conversation to add to
     * @param {string|object} content - Message content (text or object with text and attachments)
     * @param {string} role - Message role ('user' or 'assistant')
     * @returns {Promise<object|null>} - Promise resolving to updated conversation or null
     */
    async addMessage(conversationId, content, role = 'user') {
        const conversation = this.getConversation(conversationId);
        if (!conversation) return null;

        // Using Date.now() for client-side uniqueness
        const msgId = 'msg_' + Date.now();
        let messageContent = content;
        
        // Handle message object with attachments
        if (typeof content === 'object' && content !== null && content.attachments && content.attachments.length > 0) {
            // Create a copy of content object without the actual attachment data
            const messageWithAttachmentRefs = {
                text: content.text,
                attachmentRefs: []
            };
            
            // Store each attachment separately in IndexedDB
            for (const attachment of content.attachments) {
                try {
                    // Generate unique ID for attachment
                    const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                    
                    // Store attachment data in IndexedDB
                    await this.storeAttachment(attachmentId, {
                        name: attachment.name,
                        type: attachment.type,
                        size: attachment.size,
                        data: attachment.data
                    });
                    
                    // Add reference to attachment (without the actual data)
                    messageWithAttachmentRefs.attachmentRefs.push({
                        id: attachmentId,
                        name: attachment.name,
                        type: attachment.type,
                        size: attachment.size
                    });
                } catch (error) {
                    console.error('Error storing attachment:', error);
                }
            }
            
            // Replace full attachment data with references
            messageContent = messageWithAttachmentRefs;
        }
        
        const message = {
            id: msgId,
            content: messageContent,
            role,
            timestamp: new Date().toISOString()
        };

        conversation.messages.push(message);
        conversation.updatedAt = new Date().toISOString();

        // Update title if this is the first user message
        if (conversation.messages.length === 1 && role === 'user') {
            // Use the first 30 chars of the first message text as the title
            const titleText = typeof messageContent === 'object' && messageContent.text
                ? messageContent.text
                : String(messageContent);
                
            conversation.title = titleText.slice(0, 30) + (titleText.length > 30 ? '...' : '');
        }

        try {
            await this.saveChats();
            return conversation;
        } catch (error) {
            console.error('Error saving message:', error);
            
            // Remove the message if we couldn't save it
            conversation.messages.pop();
            
            throw error;
        }
    }

    /**
     * Get all conversations
     * @returns {array} - Array of conversation objects
     */
    getConversations() {
        return [...this.conversations].sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    /**
     * Delete a conversation and its attachments
     * @param {string} conversationId - ID of the conversation to delete
     * @returns {Promise<boolean>} - Whether the deletion was successful
     */
    async deleteConversation(conversationId) {
        const initialLength = this.conversations.length;
        const conversation = this.getConversation(conversationId);
        
        if (conversation) {
            // Delete all attachments for this conversation
            try {
                for (const message of conversation.messages) {
                    // Check if message has attachment references
                    if (message.content && typeof message.content === 'object' && message.content.attachmentRefs) {
                        for (const attachmentRef of message.content.attachmentRefs) {
                            await this.deleteAttachment(attachmentRef.id);
                        }
                    }
                }
            } catch (error) {
                console.error('Error deleting attachments:', error);
                // Continue with conversation deletion even if attachment deletion fails
            }
        }
        
        this.conversations = this.conversations.filter(conv => conv.id !== conversationId);

        if (this.conversations.length < initialLength) {
            // If we deleted the active conversation, set the most recent one as active
            if (this.activeConversationId === conversationId) {
                this.activeConversationId = this.conversations.length > 0 ?
                    this.conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0].id :
                    null;
            }

            try {
                await this.saveChats();
                return true;
            } catch (error) {
                console.error('Error saving after conversation deletion:', error);
                return false;
            }
        }

        return false;
    }

    /**
     * Save chats to local storage
     * @returns {Promise} - Promise that resolves when saving is complete
     */
    async saveChats() {
        try {
            // Create a clean copy of conversations for storage
            // This ensures cyclic references don't break JSON.stringify
            const conversationsForStorage = this.conversations.map(conversation => ({
                id: conversation.id,
                title: conversation.title,
                messages: conversation.messages,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
                model: conversation.model
            }));
            
            // Save to localStorage
            localStorage.setItem(LS_CONVERSATIONS_KEY, JSON.stringify(conversationsForStorage));
            localStorage.setItem(LS_ACTIVE_CONVERSATION_KEY, this.activeConversationId);
        } catch (error) {
            // Try to handle quota exceeded error by cleaning up old conversations
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn('Storage quota exceeded, cleaning old data...');
                
                // Sort conversations by date and keep only the 5 most recent
                if (this.conversations.length > 5) {
                    const sortedConversations = [...this.conversations].sort(
                        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                    );
                    
                    // Keep only the 5 most recent conversations
                    const conversationsToKeep = sortedConversations.slice(0, 5);
                    const conversationsToDelete = sortedConversations.slice(5);
                    
                    // Delete the old conversations and their attachments
                    for (const conv of conversationsToDelete) {
                        await this.deleteConversation(conv.id);
                    }
                    
                    this.conversations = conversationsToKeep;
                    
                    // Try saving again
                    try {
                        await this.saveChats();
                    } catch (retryError) {
                        console.error('Failed to save chats after cleanup:', retryError);
                        throw retryError;
                    }
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Load chats from local storage
     */
    loadChats() {
        try {
            const savedConversations = localStorage.getItem(LS_CONVERSATIONS_KEY);
            if (savedConversations) {
                this.conversations = JSON.parse(savedConversations);
            }

            this.activeConversationId = localStorage.getItem(LS_ACTIVE_CONVERSATION_KEY);

            // If there are no conversations or the active one doesn't exist, create a new one
            if (this.conversations.length === 0 ||
                (this.activeConversationId && !this.getConversation(this.activeConversationId))) {
                this.createConversation();
            }
        } catch (error) {
            console.error('Error loading chats:', error);
            this.conversations = [];
            this.createConversation();
        }
    }

    /**
     * Set the system message for AI instructions
     * @param {string} message - System message to set
     */
    setSystemMessage(message) {
        this.systemMessage = message;
        localStorage.setItem(LS_SYSTEM_MESSAGE_KEY, message);
    }

    /**
     * Get the system message
     * @returns {string} - Current system message
     */
    getSystemMessage() {
        // Always read from localStorage to ensure it's the latest
        this.systemMessage = localStorage.getItem(LS_SYSTEM_MESSAGE_KEY) || '';
        return this.systemMessage;
    }

    /**
     * Load memory enabled setting from localStorage
     */
    loadMemoryEnabled() {
        const savedMemorySetting = localStorage.getItem(LS_MEMORY_ENABLED_KEY);
        this.memoryEnabled = savedMemorySetting !== 'false'; // Default to true if not set
    }

    /**
     * Set whether conversation memory is enabled
     * @param {boolean} enabled - Whether to enable memory
     */
    setMemoryEnabled(enabled) {
        this.memoryEnabled = enabled;
        localStorage.setItem(LS_MEMORY_ENABLED_KEY, enabled.toString());
    }

    /**
     * Check if memory is enabled
     * @returns {boolean} - Whether memory is enabled
     */
    isMemoryEnabled() {
        return this.memoryEnabled;
    }

    /**
     * Load message usage from localStorage
     */
    loadMessageUsage() {
        const savedUsage = localStorage.getItem(LS_MESSAGE_USAGE_KEY);
        const savedResetTime = localStorage.getItem(LS_USAGE_RESET_TIME_KEY);
        
        if (savedUsage) {
            try {
                this.messageUsage = { ...this.messageUsage, ...JSON.parse(savedUsage) };
            } catch (error) {
                console.error('Error parsing message usage:', error);
            }
        }
        
        if (savedResetTime) {
            this.messageUsage.resetTime = new Date(savedResetTime);
            
            // Check if usage needs to be reset based on reset time
            const now = new Date();
            if (this.messageUsage.resetTime && now > this.messageUsage.resetTime) {
                this.resetMessageUsage();
            }
        } else {
            // If no reset time is set, initialize it to next Wednesday at 4:39 PM
            this.setNextResetTime();
        }
    }
    
    /**
     * Set the next reset time to Wednesday at 4:39 PM
     */
    setNextResetTime() {
        const now = new Date();
        const nextWednesday = new Date(now);
        const dayOfWeek = now.getDay(); // 0 is Sunday, 3 is Wednesday
        
        // Calculate days until next Wednesday
        const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
        
        // If it's Wednesday but before 4:39 PM, use today
        if (dayOfWeek === 3 && 
            (now.getHours() < 16 || (now.getHours() === 16 && now.getMinutes() < 39))) {
            nextWednesday.setHours(16, 39, 0, 0);
        } 
        // Otherwise use next Wednesday
        else {
            nextWednesday.setDate(now.getDate() + daysUntilWednesday);
            nextWednesday.setHours(16, 39, 0, 0);
        }
        
        this.messageUsage.resetTime = nextWednesday;
        localStorage.setItem(LS_USAGE_RESET_TIME_KEY, nextWednesday.toISOString());
    }
    
    /**
     * Reset message usage counts
     */
    resetMessageUsage() {
        this.messageUsage.standard = 0;
        this.messageUsage.premium = 0;
        
        // Set the next reset time
        this.setNextResetTime();
        
        // Save to localStorage
        this.saveMessageUsage();
    }
    
    /**
     * Save message usage to localStorage
     */
    saveMessageUsage() {
        localStorage.setItem(LS_MESSAGE_USAGE_KEY, JSON.stringify({
            standard: this.messageUsage.standard,
            premium: this.messageUsage.premium,
            standardLimit: this.messageUsage.standardLimit,
            premiumLimit: this.messageUsage.premiumLimit
        }));
    }
    
    /**
     * Check if standard message limit is reached
     * @returns {boolean} - Whether the limit is reached
     */
    isStandardLimitReached() {
        return this.messageUsage.standard >= this.messageUsage.standardLimit;
    }
    
    /**
     * Check if premium message limit is reached
     * @returns {boolean} - Whether the limit is reached
     */
    isPremiumLimitReached() {
        return this.messageUsage.premium >= this.messageUsage.premiumLimit;
    }
    
    /**
     * Get current message usage stats
     * @returns {object} - Message usage stats
     */
    getMessageUsage() {
        return { 
            ...this.messageUsage,
            standardRemaining: Math.max(0, this.messageUsage.standardLimit - this.messageUsage.standard),
            premiumRemaining: Math.max(0, this.messageUsage.premiumLimit - this.messageUsage.premium)
        };
    }
    
    /**
     * Format reset time as string
     * @returns {string} - Formatted reset time
     */
    getFormattedResetTime() {
        if (!this.messageUsage.resetTime) return '';
        
        const resetTime = new Date(this.messageUsage.resetTime);
        const now = new Date();
        
        // If it's today
        if (resetTime.toDateString() === now.toDateString()) {
            return `Today at ${resetTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`;
        }
        
        // Get day of week
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[resetTime.getDay()];
        
        return `${dayName} at ${resetTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`;
    }

    /**
     * Send a message to the AI and add the response to the conversation
     * @param {string|object} message - User message to send (text or object with text and attachments)
     * @param {function} onStreamUpdate - Callback function for streaming updates
     * @returns {Promise} - Promise that resolves when the stream is complete
     */
    async sendMessage(message, onStreamUpdate) {
        // Check if usage limits are reached
        if (this.isStandardLimitReached()) {
            throw new Error("You've reached your standard message limit for this period. Please try again after your usage resets.");
        }
        
        // Check premium limit for specific model types
        const activeModel = apiService.getActiveModel();
        const isPremiumModel = activeModel.provider === 'anthropic' || // Claude
                               activeModel.provider === 'xai' ||      // Grok
                               activeModel.model === 'gpt-4';          // GPT-4
        
        if (isPremiumModel && this.isPremiumLimitReached()) {
            throw new Error("You've reached your premium message limit for this period. Please try again after your usage resets or switch to a standard model.");
        }
        
        // Ensure we have an active conversation
        if (!this.activeConversationId) {
            this.createConversation();
        }

        // Add user message to conversation
        await this.addMessage(this.activeConversationId, message, 'user');

        // Get conversation history for context
        const conversationObject = this.getConversation(this.activeConversationId);
        const systemMessage = this.getSystemMessage();
        
        // Extract just the message text if it's an object
        const messageText = typeof message === 'object' && message !== null 
            ? message.text 
            : message;
        
        // Prepare attachments array if any
        const attachments = typeof message === 'object' && message !== null && message.attachments
            ? message.attachments
            : [];
            
        // If memory is enabled, pass all messages EXCEPT the last one (which is the current user message).
        // The provider will add the current user message.
        // If memory is disabled, pass an empty array. The provider will add the current user message.
        const historyForProvider = this.memoryEnabled 
            ? conversationObject.messages.slice(0, -1) // All messages *except* the last one
            : []; 

        try {
            // Call the API with the conversation history and streaming callback
            const response = await apiService.sendMessage(
                messageText,
                historyForProvider, // This is the history *without* the current user's message
                { 
                    systemMessage,
                    attachments 
                },
                onStreamUpdate // Pass the streaming callback
            );

            // Add final assistant response to conversation after stream is complete
            // The onStreamUpdate callback handles updating the UI during the stream
            await this.addMessage(this.activeConversationId, response.message, 'assistant');

            // Increment usage counter based on model type
            if (isPremiumModel) {
                this.messageUsage.premium++;
            } else {
                this.messageUsage.standard++;
            }
            
            // Save updated usage
            this.saveMessageUsage();
            
            // Make sure to save the conversation to localStorage
            await this.saveChats();

            return response;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const chatService = new ChatService();
export default chatService;
