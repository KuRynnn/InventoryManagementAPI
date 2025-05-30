// models/transaction.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Items',
      key: 'id'
    }
  },
  tanggal: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  jenis_transaksi: {
    type: DataTypes.ENUM('pembelian', 'penjualan'),
    allowNull: false,
  },
  jumlah: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  harga_satuan: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  diskon: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  total_harga: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  stok_awal: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stok_akhir: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Transaction;