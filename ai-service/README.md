# SIH26023 - AI Service

FastAPI service for the AI-Powered Geological, Mining and Reporting Solution.

## Folder Structure

```text
ai-service/
├── app/
│   ├── api/          # API endpoints & route handlers
│   │   ├── __init__.py
│   │   └── health.py # Health-check endpoint
│   ├── core/         # Core settings and configuration
│   │   ├── __init__.py
│   │   └── config.py
│   ├── models/       # Pydantic schemas and domain models
│   ├── services/     # AI/ML business logic & pipelines
│   ├── utils/        # Helper utility functions
│   ├── __init__.py
│   └── main.py       # FastAPI application entry point
├── .env.example
├── requirements.txt
└── README.md
```

## Setup and Running

1. **Create and Activate Python Virtual Environment:**
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

4. **Start the Service:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Verify Health Endpoint:**
   * Health Check: `http://localhost:8000/health`
   * Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
