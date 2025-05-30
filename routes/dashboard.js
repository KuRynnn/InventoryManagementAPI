// File: api/dashboard.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Item, Transaction } = require('../models');
const sequelize = require('sequelize');

router.get('/', async (req, res) => {
  try {
    // Get total items and total stock
    const itemStats = await Item.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalJenisBarang'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('stok')), 0), 'totalStok']
      ],
      raw: true
    });

    const totalJenisBarang = parseInt(itemStats?.totalJenisBarang || 0);
    const totalStok = parseInt(itemStats?.totalStok || 0);

    // Get sales transactions summary
    const salesStats = await Transaction.findOne({
      where: { jenis_transaksi: 'penjualan' },
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('jumlah')), 0), 'totalStockTerjual'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_harga')), 0), 'totalOmset'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('diskon')), 0), 'totalDiskon']
      ],
      raw: true
    });

    // Get purchase transactions summary
    const purchaseStats = await Transaction.findOne({
      where: { jenis_transaksi: 'pembelian' },
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_harga')), 0), 'totalModal']
      ],
      raw: true
    });

    // Extract values safely
    const totalStockTerjual = parseInt(salesStats?.totalStockTerjual || 0);
    const totalOmset = parseFloat(salesStats?.totalOmset || 0);
    const totalDiskon = parseFloat(salesStats?.totalDiskon || 0);
    const totalModal = parseFloat(purchaseStats?.totalModal || 0);

    // Calculate gross profit using a separate query
    const salesForProfit = await Transaction.findAll({
      where: { jenis_transaksi: 'penjualan' },
      include: [{
        model: Item,
        attributes: ['harga_beli']
      }],
      attributes: ['jumlah', 'total_harga']
    });

    let totalKeuntunganKotor = 0;
    salesForProfit.forEach(sale => {
      const costOfGoodsSold = (sale.Item?.harga_beli || 0) * (sale.jumlah || 0);
      totalKeuntunganKotor += (sale.total_harga || 0) - costOfGoodsSold;
    });

    const totalKeuntunganBersih = totalOmset - totalModal;

    // Get top selling items
    const topSellingRaw = await Transaction.findAll({
      where: { jenis_transaksi: 'penjualan' },
      attributes: [
        'item_id',
        [sequelize.fn('SUM', sequelize.col('jumlah')), 'total_terjual']
      ],
      group: ['item_id'],
      order: [[sequelize.fn('SUM', sequelize.col('jumlah')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Get item names for top selling items
    const topSelling = [];
    for (const item of topSellingRaw) {
      const itemDetail = await Item.findByPk(item.item_id, {
        attributes: ['nama_barang']
      });
      
      topSelling.push({
        nama_barang: itemDetail?.nama_barang || 'Unknown Item',
        jumlah_terjual: parseInt(item.total_terjual || 0)
      });
    }

    // Send response
    res.json({
      stockInfo: {
        totalJenisBarang,
        totalStok,
        totalStockTerjual
      },
      financialInfo: {
        totalModal: Math.round(totalModal * 100) / 100,
        totalOmset: Math.round(totalOmset * 100) / 100,
        totalKeuntunganKotor: Math.round(totalKeuntunganKotor * 100) / 100,
        totalKeuntunganBersih: Math.round(totalKeuntunganBersih * 100) / 100,
        totalDiskon: Math.round(totalDiskon * 100) / 100
      },
      topSelling
    });

  } catch (error) {
    console.error('Dashboard Error Details:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('SQL:', error.sql || 'No SQL query');
    
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;