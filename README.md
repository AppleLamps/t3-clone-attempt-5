# Advanced Chatbot Replica Project

## 1. Project Goal

The primary goal of this project is to recreate a sophisticated chatbot user interface, as depicted in the provided UI screenshots and initial HTML structure. The recreation will be done **exclusively using HTML, CSS, and vanilla JavaScript (ES6+)**.

## 2. Key Features to Implement

Based on the UI and requirements, the following features are planned:

*   **Main Chat Interface:**
    *   Display of chat history (user and bot messages).
    *   Formatted responses, including support for:
        *   Markdown rendering.
        *   Code blocks (with potential for basic syntax highlighting via a library).
        *   Mathematical formulas (potentially using KaTeX via a library).
    *   Dynamic message input area that resizes with content.
    *   Model selection dropdown/interface.
    *   Search functionality (initially client-side for threads/messages).
    *   File attachment capability (UI only, no backend processing initially).
*   **Collapsible Sidebar:**
    *   Displaying chat thread history, grouped by time (Yesterday, Last 7 Days, etc.).
    *   Search functionality for threads.
    *   "New Chat" button.
    *   User profile section with plan status.
*   **Settings Section (SPA-style navigation):**
    *   **Subscription View:** Displaying user plan details (Message Usage, Premium credits).
    *   **Customization View:**
        *   User profile information (name, "What do you do?").
        *   AI personality traits configuration.
        *   Visual options (Boring Theme, Hide Personal Info).
        *   Font selection (Main Text Font, Code Font) with previews.
    *   **History & Sync View:** (UI placeholder for now)
    *   **Models View:**
        *   Listing available AI models.
        *   Ability to toggle model visibility in the selector.
        *   Filtering models by features (Vision, PDFs, Search, etc.).
    *   **Attachments View:** (UI placeholder for now)
    *   **Contact Us View:** (UI placeholder for now)
    *   Keyboard shortcuts display.
*   **Theme Switching:** Light and Dark mode support.
*   **Responsive Design:** The UI should adapt reasonably to different screen sizes, especially for mobile and desktop views.

## 3. Technology Stack

*   **HTML5:** For the structure of the application.
*   **CSS3:** For all styling, aiming for modern CSS features to replicate the design. No CSS frameworks like Tailwind or Bootstrap will be used directly in the final output files, though inspiration may be drawn from their methodologies for class naming and structure.
*   **Vanilla JavaScript (ES6+):** For all interactivity, DOM manipulation, dynamic content rendering, client-side routing, and application logic. No JavaScript frameworks like React, Vue, or Angular will be used.
*   **(Optional) Third-Party Libraries:**
    *   `markdown-it.js` (or similar) for Markdown rendering.
    *   `highlight.js` or `prism.js` (or similar, lightweight options) for code syntax highlighting.
    *   `katex.min.js` for rendering mathematical formulas.
    *   These will be included as plain JS files if used.

## 4. Folder Structure

The project is organized to promote modularity and separation of concerns:

t3-clone-attempt-5/
├── index.html # Main HTML shell for the SPA
│
├── assets/ # All static assets
│ ├── css/ # Stylesheets
│ │ ├── main.css # Global styles, core chat UI, layout
│ │ ├── sidebar.css # Styles specific to the sidebar
│ │ ├── settings.css # Styles for all settings views
│ │ └── formatted-content.css # Styles for markdown, code, KaTeX
│ │
│ ├── js/ # JavaScript files
│ │ ├── main.js # Entry point for JS, initializes app, global event listeners
│ │ ├── ui.js # DOM manipulation utilities, UI element creation functions
│ │ ├── router.js # Client-side routing logic (shows/hides views)
│ │ ├── api.js # Mock API interactions (simulates backend calls)
│ │ ├── theme.js # Theme (light/dark) switching logic
│ │ ├── utils.js # General utility/helper functions
│ │ │
│ │ ├── components/ # JS modules for distinct UI components
│ │ │ ├── sidebar.js # Sidebar logic (toggle, thread loading, search)
│ │ │ ├── chatInput.js # Chat input area logic
│ │ │ ├── message.js # Rendering individual chat messages
│ │ │ └── modelSelector.js # Model selection UI logic
│ │ │
│ │ ├── views/ # JS modules for rendering different "page" content
│ │ │ ├── chatView.js # Renders the main chat interface content
│ │ │ ├── settingsView.js # Renders the settings navigation and content area
│ │ │ ├── subscriptionView.js # Renders the subscription settings page
│ │ │ ├── customizationView.js # Renders the customization settings page
│ │ │ ├── modelsView.js # Renders the available models settings page
│ │ │ └── ... # Other settings views (attachments, contact)
│ │ │
│ │ ├── services/ # JS modules for specific functionalities/data management
│ │ │ ├── chatService.js # Logic for sending/receiving messages, interacting with history
│ │ │ ├── settingsService.js # Logic for saving/loading user settings (e.g., to localStorage)
│ │ │ └── historyService.js # Manages chat history (CRUD operations, likely localStorage based)
│ │ │
│ │ └── libraries/ # Third-party JS libraries
│ │ ├── markdown-it.min.js # Example
│ │ └── katex.min.js # Example
│ │
│ ├── images/ # UI images, icons (if not SVG in HTML/CSS)
│ │ ├── logo.svg
│ │ └── lamp-avatar.png
│ │
│ ├── fonts/ # Custom font files (if self-hosted)
│
├── templates/ # (Optional) HTML snippets for dynamic rendering
│ ├── message-user.html
│ └── message-bot.html
│
└── README.md # This file


**Explanation of Key JS Files/Folders:**

*   **`js/main.js`**: Initializes the application, sets up global event listeners, and likely invokes the router to display the initial view.
*   **`js/ui.js`**: Contains helper functions for creating and updating DOM elements. This helps keep other modules focused on logic rather than direct, verbose DOM manipulation.
*   **`js/router.js`**: Implements simple client-side routing (e.g., using URL hash changes or the History API) to switch between different views (Chat, Settings subsections) without full page reloads.
*   **`js/api.js`**: This will initially contain functions that simulate API calls (e.g., for fetching bot responses or saving settings) by returning promises with mock data. This allows the rest of the application to be built as if a backend exists.
*   **`js/components/`**: Each file here will manage the state and behavior of a specific UI part. For example, `sidebar.js` would handle opening/closing, loading thread lists, and filtering them.
*   **`js/views/`**: Each file here is responsible for constructing the HTML content for a major section of the application (like the chat interface, or the customization settings page) and managing its specific interactions.
*   **`js/services/`**: These modules abstract away data handling and complex logic. For instance, `chatService.js` would handle the flow of sending a message and getting a (mocked) reply. `historyService.js` would manage storing and retrieving chat conversations from `localStorage`.

## 5. Core Architectural Approach

The application will be structured as a Single Page Application (SPA):

1.  **`index.html`** serves as the main container or "shell."
2.  JavaScript, primarily through **`router.js`** and modules in **`js/views/`**, will dynamically render the content for different sections (Chat, Settings, etc.) into designated areas within `index.html`.
3.  CSS will be modularized to style specific components and views, promoting maintainability.
4.  Data (like chat history or user preferences) will be managed client-side, likely using `localStorage` for persistence in this vanilla JS version.

## 6. Getting Started / How to Run

1.  Ensure all files are organized according to the folder structure above.
2.  Open `index.html` directly in a modern web browser.
3.  No build steps or local server (beyond a simple static file server for development if preferred) are required due to the vanilla HTML/CSS/JS nature.

## 7. Development Focus

*   **Visual Fidelity:** Prioritize matching the look and feel of the provided UI screenshots.
*   **Modularity:** Write CSS and JavaScript in a modular way to make the codebase easier to understand, maintain, and extend.
*   **Dynamic Content:** Focus on JavaScript's role in dynamically creating and updating the UI elements, especially for the chat messages and settings pages.
*   **Client-Side Logic:** Implement all features using client-side JavaScript. Backend interactions will be mocked via `api.js`.

This README should provide a solid foundation for understanding the project's scope and structure.