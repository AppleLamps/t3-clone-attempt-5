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
        // Basic styles for print
        const style = `
            <style>
                body { font-family: Inter, Arial, sans-serif; margin: 40px; }
                .message { margin-bottom: 24px; }
                .message .sender { font-weight: bold; margin-bottom: 4px; }
                .message .content { white-space: pre-wrap; }
            </style>
        `;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Conversation Export</title>${style}</head><body>`);
        printWindow.document.write('<h2>Conversation History</h2>');
        printWindow.document.write(chatLog.innerHTML);
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
