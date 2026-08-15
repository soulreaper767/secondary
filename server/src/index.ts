import express from 'express';
import cors from 'cors';
import path from 'path';
import cron from 'node-cron';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { runNonProductiveScan } from './lib/jobs/nonProductive';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roleRoutes from './routes/roles';
import territoryRoutes from './routes/territories';
import distributorRoutes from './routes/distributors';
import productRoutes from './routes/products';
import retailerRoutes from './routes/retailers';
import pjpRoutes from './routes/pjp';
import routePlanRoutes from './routes/routePlans';
import orderRoutes from './routes/orders';
import stockRoutes from './routes/stock';
import stockOrderRoutes from './routes/stockOrders';
import receiptRoutes from './routes/receipts';
import returnRoutes from './routes/returns';
import stockTakeRoutes from './routes/stockTakes';
import reportRoutes from './routes/reports';
import targetRoutes from './routes/targets';
import incentiveRoutes from './routes/incentives';
import notificationRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboard';

const app = express();

app.use(cors({ origin: config.isProd ? true : config.clientOrigin }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, env: config.nodeEnv }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/pjp', pjpRoutes);
app.use('/api/route-plans', routePlanRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/stock-orders', stockOrderRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/stock-takes', stockTakeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/incentives', incentiveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// In production, serve the built client SPA from the same process.
if (config.isProd) {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} [${config.nodeEnv}]`);
});

// Non-productive universe scan: on boot, then daily at 02:00.
runNonProductiveScan()
  .then((n) => console.log(`Non-productive scan on boot flagged ${n} shop(s).`))
  .catch((err) => console.error('Non-productive scan failed:', err));

cron.schedule('0 2 * * *', () => {
  runNonProductiveScan()
    .then((n) => console.log(`Non-productive scan flagged ${n} shop(s).`))
    .catch((err) => console.error('Non-productive scan failed:', err));
});
