import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import TopicsSearchPage from './pages/TopicsSearchPage.jsx';
import QueryPage from './pages/QueryPage.jsx';
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
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.TOPICS} element={<TopicsSearchPage />} />
          <Route path={ROUTES.SEARCH} element={<TopicsSearchPage />} />
          <Route path={ROUTES.QUERY} element={<QueryPage />} />
          <Route path={ROUTES.QA} element={<QueryPage />} />
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
