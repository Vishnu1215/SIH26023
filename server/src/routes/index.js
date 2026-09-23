import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import documentRoutes from './document.routes.js';
import reportRoutes from './report.routes.js';
import { getDashboardAnalytics } from '../controllers/document.controller.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.get('/dashboard/analytics', getDashboardAnalytics);

export default apiRouter;
