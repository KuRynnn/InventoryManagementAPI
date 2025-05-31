// ===== models/item.js =====
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Item = sequelize.define('items', {  
  kode_barang: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  nama_barang: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  harga_beli: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  harga_jual: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  stok: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'items', 
  timestamps: true     
});

module.exports = Item;