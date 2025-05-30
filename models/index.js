// models/index.js
const Item = require('./item');
const Transaction = require('./transaction');

// Define associations here
Item.hasMany(Transaction, { foreignKey: 'item_id' });
Transaction.belongsTo(Item, { foreignKey: 'item_id' });

module.exports = {
  Item,
  Transaction
};