const sequelize = require('./config/database');
const Item = require('./models/item');
const Transaction = require('./models/transaction');

async function initDb() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Sync the database
    await sequelize.sync({ force: true });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

initDb();