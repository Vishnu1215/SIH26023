import React, { useState, useEffect } from 'react';
import { checkServerHealth, checkAiServiceHealth } from '../services/api.js';

export default function HomePage() {
  const [serverHealth, setServerHealth] = useState({ status: 'checking...' });
  const [aiHealth, setAiHealth] = useState({ status: 'checking...' });

  useEffect(() => {
    checkServerHealth().then(setServerHealth);
    checkAiServiceHealth().then(setAiHealth);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <span className="badge">SIH26023 Prototype</span>
        <h1 className="title">CMPDI / CIL AI Reporting Platform</h1>
        <p className="subtitle">
          Geological, Mining, and Reporting Solution - System Foundation
        </p>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <div className="status-label">Frontend (Client)</div>
          <div className="status-value">Ready (Vite + React)</div>
        </div>

        <div className="status-card">
          <div className="status-label">Backend (Express)</div>
          <div className="status-value">{serverHealth.status}</div>
        </div>

        <div className="status-card">
          <div className="status-label">AI Service (FastAPI)</div>
          <div className="status-value">{aiHealth.status}</div>
        </div>
      </div>
    </div>
  );
}
