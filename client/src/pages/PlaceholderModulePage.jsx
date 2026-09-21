import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function PlaceholderModulePage({ title, moduleNumber, description }) {
  const location = useLocation();

  return (
    <div className="dashboard-view">
      <div className="page-header">
        <div>
          <h2 className="page-title">{title}</h2>
          <p className="page-subtitle">SIH26023 &bull; {moduleNumber}</p>
        </div>
      </div>

      <section className="main-content-card">
        <div className="empty-workspace-state">
          <div className="empty-icon-box">
            <Construction size={36} color="#0284c7" />
          </div>
          <h3 className="empty-title">{title} Initialized</h3>
          <p className="empty-description">
            {description || `Route ${location.pathname} is ready for integration in the next project phases.`}
          </p>
          <div className="empty-guidance">
            <span>Authentication, Layout, and Navigation are operational.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
