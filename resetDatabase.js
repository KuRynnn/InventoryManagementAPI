const sequelize = require('./config/database');
const Item = require('./models/item');
const Transaction = require('./models/transaction');

async function resetDatabase() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database reset successful');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await sequelize.close();
  }
}

resetDatabase();