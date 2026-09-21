import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/index.js';

const app = express();

app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRouter);

// Fallback healthcheck route on root
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'server' });
});

app.use(errorHandler);

export default app;
