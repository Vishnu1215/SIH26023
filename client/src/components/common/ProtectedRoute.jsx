import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../../utils/storage.js';
import { ROUTES } from '../../constants/routes.js';

export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return children;
}
