// print-conversation.js
// Adds print/export to PDF functionality for chat history

// Loads after DOMContentLoaded
export function setupPrintButton() {
    const printBtn = document.getElementById('print-btn');
    if (!printBtn) return;
    printBtn.addEventListener('click', () => {
        // Get the chat log HTML
        const chatLog = document.getElementById('chat-log');
        if (!chatLog) return;
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        // Enhanced print styles for clean, labeled, and visually distinct export
        const style = `
            <style>
                body {
                    font-family: 'Inter', Arial, sans-serif;
                    margin: 36pt 32pt 36pt 32pt;
                    background: #fff;
                    color: #222;
                    font-size: 12pt;
                }
                h2 {
                    text-align: center;
                    margin-bottom: 1.5em;
                    font-size: 1.5em;
                }
                .chat-log {
                    margin: 0 auto;
                    max-width: 800px;
                }
                .chat-message {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 28px;
                    padding: 18px 22px;
                    border-radius: 12px;
                    border: 1.5px solid #e0e0e0;
                    background: #fafbfc;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
                    page-break-inside: avoid;
                }
                .chat-message.user-message {
                    background: #eaf6ff;
                    border-color: #b6e0fe;
                    align-self: flex-end;
                    margin-left: 80px;
                }
                .chat-message.bot-message {
                    background: #f7f6fa;
                    border-color: #d6d0e6;
                    align-self: flex-start;
                    margin-right: 80px;
                }
                .chat-message .sender {
                    font-weight: bold;
                    font-size: 1em;
                    margin-bottom: 6px;
                    letter-spacing: 0.5px;
                }
                .chat-message .content {
                    white-space: pre-wrap;
                    font-size: 1em;
                    line-height: 1.6;
                }
                /* Hide UI-only elements in print */
                .copy-message-btn, .code-control-btn, .chat-actions, .message-actions, .prompt-btn, .model-selector-btn, .reasoning-effort-btn {
                    display: none !important;
                }
                /* Spacing between messages */
                .chat-message + .chat-message {
                    margin-top: 18px;
                }
                /* Print-specific tweaks */
                @media print {
                    html, body {
                        background: #fff !important;
                        color: #222 !important;
                    }
                    .copy-message-btn, .code-control-btn, .chat-actions, .message-actions, .prompt-btn, .model-selector-btn, .reasoning-effort-btn {
                        display: none !important;
                    }
                }
            </style>
        `;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Conversation Export</title>${style}</head><body>`);
        printWindow.document.write('<h2>Conversation History</h2>');
        // Clone chatLog and inject sender labels if missing
        const chatLogClone = chatLog.cloneNode(true);
        // For each .chat-message, ensure sender label is present and classes are correct
        chatLogClone.querySelectorAll('.chat-message').forEach(msg => {
            // If already labeled, skip
            if (!msg.querySelector('.sender')) {
                // Determine sender by class
                let sender = 'User';
                if (msg.classList.contains('bot-message')) sender = 'AI';
                else if (msg.classList.contains('assistant-message')) sender = 'AI';
                else if (msg.classList.contains('user-message')) sender = 'User';
                // Prepend sender label
                const senderDiv = document.createElement('div');
                senderDiv.className = 'sender';
                senderDiv.textContent = sender;
                msg.insertBefore(senderDiv, msg.firstChild);
            }
        });
        printWindow.document.write(chatLogClone.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        // Wait for DOM, then print
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
        };
    });
}

document.addEventListener('DOMContentLoaded', setupPrintButton);
