// File: api/dashboard.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Item, Transaction } = require('../models');
const sequelize = require('sequelize');

router.get('/', async (req, res) => {
  console.log('=== DASHBOARD API DEBUG START ===');
  console.log('Request received at:', new Date().toISOString());
  
  try {
    // Get total items and total stock
    console.log('Fetching item statistics...');
    const itemStats = await Item.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalJenisBarang'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('stok')), 0), 'totalStok']
      ],
      raw: true
    });
    
    console.log('Item stats raw result:', itemStats);
    const totalJenisBarang = parseInt(itemStats?.totalJenisBarang || 0);
    const totalStok = parseInt(itemStats?.totalStok || 0);
    console.log('Processed item stats:', { totalJenisBarang, totalStok });

    // Get sales transactions summary
    console.log('Fetching sales statistics...');
    const salesStats = await Transaction.findOne({
      where: { jenis_transaksi: 'penjualan' },
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('jumlah')), 0), 'totalStockTerjual'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_harga')), 0), 'totalOmset'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('diskon')), 0), 'totalDiskon']
      ],
      raw: true
    });
    console.log('Sales stats raw result:', salesStats);

    // Get purchase transactions summary
    console.log('Fetching purchase statistics...');
    const purchaseStats = await Transaction.findOne({
      where: { jenis_transaksi: 'pembelian' },
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_harga')), 0), 'totalModal']
      ],
      raw: true
    });
    console.log('Purchase stats raw result:', purchaseStats);

    // Extract values safely
    const totalStockTerjual = parseInt(salesStats?.totalStockTerjual || 0);
    const totalOmset = parseFloat(salesStats?.totalOmset || 0);
    const totalDiskon = parseFloat(salesStats?.totalDiskon || 0);
    const totalModal = parseFloat(purchaseStats?.totalModal || 0);
    
    console.log('Processed transaction stats:', {
      totalStockTerjual,
      totalOmset,
      totalDiskon,
      totalModal
    });

    // Calculate gross profit using a more efficient approach
    console.log('Calculating gross profit...');
    let totalKeuntunganKotor = 0;
    
    try {
      // Try with alias first
      const salesForProfit = await Transaction.findAll({
        where: { jenis_transaksi: 'penjualan' },
        include: [{
          model: Item,
          as: 'item', // Use the alias
          attributes: ['harga_beli'],
          required: false // LEFT JOIN to handle missing items
        }],
        attributes: ['jumlah', 'total_harga']
      });

      console.log(`Found ${salesForProfit.length} sales transactions for profit calculation`);
      
      salesForProfit.forEach((sale, index) => {
        const itemHargaBeli = sale.item?.harga_beli || 0;
        const costOfGoodsSold = itemHargaBeli * (sale.jumlah || 0);
        const saleProfit = (sale.total_harga || 0) - costOfGoodsSold;
        totalKeuntunganKotor += saleProfit;
        
        // Debug every 100th transaction or first few
        if (index < 5 || index % 100 === 0) {
          console.log(`Sale ${index + 1}: item_price=${itemHargaBeli}, qty=${sale.jumlah}, revenue=${sale.total_harga}, profit=${saleProfit}`);
        }
      });
      
    } catch (profitError) {
      console.log('Error with alias, trying without alias:', profitError.message);
      
      // Fallback: try without alias
      try {
        const salesForProfit = await Transaction.findAll({
          where: { jenis_transaksi: 'penjualan' },
          include: [{
            model: Item,
            attributes: ['harga_beli'],
            required: false
          }],
          attributes: ['jumlah', 'total_harga']
        });

        salesForProfit.forEach(sale => {
          const itemHargaBeli = sale.Item?.harga_beli || 0;
          const costOfGoodsSold = itemHargaBeli * (sale.jumlah || 0);
          totalKeuntunganKotor += (sale.total_harga || 0) - costOfGoodsSold;
        });
        
      } catch (fallbackError) {
        console.error('Both alias and non-alias approaches failed:', fallbackError.message);
        // Use simple calculation as fallback
        totalKeuntunganKotor = totalOmset - totalModal;
        console.log('Using simple profit calculation as fallback');
      }
    }

    const totalKeuntunganBersih = totalOmset - totalModal;
    console.log('Profit calculations:', {
      totalKeuntunganKotor: Math.round(totalKeuntunganKotor * 100) / 100,
      totalKeuntunganBersih: Math.round(totalKeuntunganBersih * 100) / 100
    });

    // Get top selling items with improved error handling
    console.log('Fetching top selling items...');
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

    console.log('Top selling raw data:', topSellingRaw);

    // Get item names for top selling items - batch query instead of individual queries
    const itemIds = topSellingRaw.map(item => item.item_id);
    const itemDetails = await Item.findAll({
      where: { id: itemIds },
      attributes: ['id', 'nama_barang'],
      raw: true
    });

    // Create lookup map for better performance
    const itemMap = itemDetails.reduce((acc, item) => {
      acc[item.id] = item.nama_barang;
      return acc;
    }, {});

    const topSelling = topSellingRaw.map(item => ({
      nama_barang: itemMap[item.item_id] || 'Unknown Item',
      jumlah_terjual: parseInt(item.total_terjual || 0)
    }));

    console.log('Processed top selling items:', topSelling);

    // Prepare final response
    const response = {
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
    };

    console.log('Final response prepared:', JSON.stringify(response, null, 2));
    console.log('=== DASHBOARD API DEBUG END ===');
    
    // Send response
    res.json(response);
    
  } catch (error) {
    console.error('=== DASHBOARD ERROR OCCURRED ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('SQL query:', error.sql || 'No SQL query available');
    
    // Additional Sequelize-specific error info
    if (error.name && error.name.includes('Sequelize')) {
      console.error('Sequelize error details:', {
        name: error.name,
        message: error.message,
        sql: error.sql,
        parameters: error.parameters
      });
    }
    
    console.error('Request details at time of error:', {
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    console.error('=== DASHBOARD ERROR DEBUG END ===');
    
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;