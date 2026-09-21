import app from './app.js';
import { config } from './config/index.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`[Server] Express backend running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
});
