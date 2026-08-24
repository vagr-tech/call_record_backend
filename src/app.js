const express = require('express');
const cors = require('cors');

const shopRoutes = require('./routes/shopRoutes');
const callLogRoutes = require('./routes/callLogRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---- Middleware ----
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
}));
app.use(express.json());

// ---- Health check (useful for Render) ----
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'shop-caller-backend' });
});
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

// ---- Routes ----
app.use('/api/shops', shopRoutes);
app.use('/api/call-logs', callLogRoutes);

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ---- Central error handler (always last) ----
app.use(errorHandler);

module.exports = app;
