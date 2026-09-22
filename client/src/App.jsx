import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import PlaceholderModulePage from './pages/PlaceholderModulePage.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import { ROUTES } from './constants/routes.js';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.DOCUMENTS} element={<DocumentsPage />} />
          <Route
            path={ROUTES.REPORTS}
            element={
              <PlaceholderModulePage
                title="Automated Report Generator"
                moduleNumber="Module 1"
                description="Standard templates for Monthly Production, Geological Survey Summaries, and Parliamentary Q&A briefs."
              />
            }
          />
          <Route
            path={ROUTES.TOPICS}
            element={
              <PlaceholderModulePage
                title="Topic Modeling & Word Clouds"
                moduleNumber="Module 2"
                description="BERTopic extraction with TF-IDF fallback, domain mining terminology, and Devanagari stopword lists."
              />
            }
          />
          <Route
            path={ROUTES.QA}
            element={
              <PlaceholderModulePage
                title="Hybrid Query & Response System"
                moduleNumber="Module 3"
                description="Text-to-SQL for accurate numeric aggregates and RAG for narrative context with figure-level citations."
              />
            }
          />
          <Route
            path={ROUTES.RECOMMENDATIONS}
            element={
              <PlaceholderModulePage
                title="AI Insights & Recommendations Engine"
                moduleNumber="Module 4"
                description="Proactive anomaly detection and evidence-backed advisory recommendations requiring reviewer approval."
              />
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <PlaceholderModulePage
                title="System Configuration & Audit"
                moduleNumber="Administration"
                description="Role-Based Access Control, subsidiary scoping, audit log traces, and model profile fallbacks."
              />
            }
          />
        </Route>

        {/* Root and Fallback Redirection */}
        <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
