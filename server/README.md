# SIH26023 - Server (Backend)

Express.js backend service for the AI-Powered Geological, Mining and Reporting Solution.

## Folder Structure

```text
server/
├── src/
│   ├── config/       # Environment & runtime configuration
│   ├── controllers/  # Route controller handlers
│   ├── middleware/   # Express middlewares (error handling, auth, logging)
│   ├── routes/       # API route definitions
│   ├── services/     # Business logic & external service connectors
│   ├── utils/        # Helper utility functions
│   ├── app.js        # Express app initialization
│   └── server.js     # Server entry point & listener
├── .env.example
├── package.json
└── README.md
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
   Or production start:
   ```bash
   npm start
   ```

4. **Verify Health Endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "server",
     "timestamp": "..."
   }
   ```
