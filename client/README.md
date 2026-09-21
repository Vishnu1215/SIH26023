# SIH26023 - Client (Frontend)

React + Vite frontend for the AI-Powered Geological, Mining and Reporting Solution.

## Folder Structure

```text
client/
├── src/
│   ├── assets/       # Static assets (images, icons, fonts)
│   ├── components/   # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── layouts/      # Layout wrappers
│   ├── pages/        # Route page components
│   ├── services/     # API integration services
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## Setup and Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at: `http://localhost:5173`

4. **Build for Production:**
   ```bash
   npm run build
   ```
