const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const itemsRouter = require('./routes/items');
const transactionsRouter = require('./routes/transactions');
const transactionsHistoryRouter = require('./routes/transaction_history');
const rekapitulasiRouter = require('./routes/rekapitulasi');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/items', itemsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/transactions_history', transactionsHistoryRouter);
app.use('/api/rekapitulasi', rekapitulasiRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});