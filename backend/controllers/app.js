const express = require('express');
const { PrismaClient } = require('@prisma/client');

// Import routers
const templateRoutes = require('./routes/templates');
const paymentPlanRoutes = require('./routes/paymentPlans');
const bookingRoutes = require('./routes/bookings');
const demandRoutes = require('./routes/demands');

const app = express();
const prisma = new PrismaClient();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to make Prisma client available to all routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Mount routers
app.use('/api/templates', templateRoutes);
app.use('/api/payment-plans', paymentPlanRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/demands', demandRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;