import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar.jsx';
import Navbar from '../components/common/Navbar.jsx';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const contentRef = useRef(null);

  // Automatically reset content scroll position to top when navigating between routes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <Navbar />
        <main ref={contentRef} className="dashboard-content" id="main-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
