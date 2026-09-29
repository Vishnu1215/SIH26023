import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar.jsx';
import Navbar from '../components/common/Navbar.jsx';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const contentRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  // Automatically reset content scroll position to top when navigating between routes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  // Auto-collapse sidebar on tablets / screens <= 1024px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`dashboard-container ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <div className="dashboard-main">
        <Navbar onToggleSidebar={() => setCollapsed(!collapsed)} isSidebarCollapsed={collapsed} />
        <main ref={contentRef} className="dashboard-content" id="main-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
