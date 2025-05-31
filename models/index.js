// ===== models/index.js =====
const sequelize = require('../config/database');
const Item = require('./item');
const Transaction = require('./transaction');

// Define associations
Item.hasMany(Transaction, { 
  foreignKey: 'item_id',
  as: 'transactions'  // Optional: add alias
});

Transaction.belongsTo(Item, { 
  foreignKey: 'item_id',
  as: 'item'  // Optional: add alias
});

// Sync associations
const initModels = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync models (be careful in production!)
    // await sequelize.sync({ alter: true });
    console.log('Models synced successfully.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
  }
};

module.exports = {
  Item,
  Transaction,
  sequelize,
  initModels
};