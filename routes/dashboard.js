// File: api/dashboard.js

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Item, Transaction } = require('../models');
const sequelize = require('sequelize');

router.get('/', async (req, res) => {
  try {
    // Get total items and total stock
    const itemStats = await Item.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalJenisBarang'],
        [sequelize.fn('SUM', sequelize.col('stok')), 'totalStok']
      ]
    });

    const totalJenisBarang = itemStats[0].dataValues.totalJenisBarang;
    const totalStok = itemStats[0].dataValues.totalStok;

    // Get all transactions
    const allTransactions = await Transaction.findAll({
      include: [{ model: Item }]
    });

    // Calculate statistics
    let totalStockTerjual = 0;
    let totalModal = 0;
    let totalOmset = 0;
    let totalKeuntunganKotor = 0;
    let totalKeuntunganBersih = 0;
    let totalDiskon = 0;

    allTransactions.forEach(t => {
      if (t.jenis_transaksi === 'penjualan') {
        totalStockTerjual += t.jumlah;
        totalOmset += t.total_harga;
        totalKeuntunganKotor += t.total_harga - (t.Item.harga_beli * t.jumlah);
        totalDiskon += t.diskon;
      } else if (t.jenis_transaksi === 'pembelian') {
        totalModal += t.total_harga;
      }
    });

    totalKeuntunganBersih = totalOmset - totalModal;

    // Get top selling items (all time)
    const topSelling = await Transaction.findAll({
      where: { jenis_transaksi: 'penjualan' },
      attributes: [
        'item_id',
        [sequelize.fn('SUM', sequelize.col('jumlah')), 'total_terjual']
      ],
      include: [{ model: Item, attributes: ['nama_barang'] }],
      group: ['item_id'],
      order: [[sequelize.fn('SUM', sequelize.col('jumlah')), 'DESC']],
      limit: 5
    });

    res.json({
      stockInfo: {
        totalJenisBarang,
        totalStok,
        totalStockTerjual
      },
      financialInfo: {
        totalModal,
        totalOmset,
        totalKeuntunganKotor,
        totalKeuntunganBersih
      },
      topSelling: topSelling.map(item => ({
        nama_barang: item.Item.nama_barang,
        jumlah_terjual: item.dataValues.total_terjual
      }))
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;