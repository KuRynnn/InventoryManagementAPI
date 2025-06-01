const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Item, Transaction } = require('../models');

router.get('/', async (req, res) => {
  console.log('=== TRANSACTION HISTORY DEBUG START ===');
  console.log('Request received at:', new Date().toISOString());
  console.log('Query parameters:', req.query);
  
  try {
    const { tahun, bulan } = req.query;
    console.log('Extracted parameters - tahun:', tahun, 'bulan:', bulan);

    if (!tahun || !bulan) {
      console.log('ERROR: Missing required parameters');
      return res.status(400).json({ message: 'Tahun dan bulan harus disediakan' });
    }

    // Convert to numbers for better logging
    const yearNum = parseInt(tahun);
    const monthNum = parseInt(bulan);
    console.log('Converted to numbers - tahun:', yearNum, 'bulan:', monthNum);

    const tanggalAwal = new Date(tahun, bulan - 1, 1);
  const tanggalAkhir = new Date(tahun, bulan, 0, 23, 59, 59, 999);
    
    console.log('Date range calculated:');
    console.log('  Start date (tanggalAwal):', tanggalAwal.toISOString());
    console.log('  End date (tanggalAkhir):', tanggalAkhir.toISOString());

    console.log('Executing database query...');
    const startTime = Date.now();
    
    const transactions = await Transaction.findAll({
      where: {
        tanggal: {
          [Op.between]: [tanggalAwal, tanggalAkhir]
        }
      },
      include: [{ 
        model: Item, 
        as: 'item',  // Add the alias here
        attributes: ['kode_barang', 'nama_barang'],
        required: false // LEFT JOIN to handle missing items gracefully
      }],
      order: [['tanggal', 'ASC']]
    });

    const queryTime = Date.now() - startTime;
    console.log(`Database query completed in ${queryTime}ms`);
    console.log('Raw transactions count:', transactions.length);

    if (transactions.length > 0) {
      console.log('Sample transaction (first record):');
      console.log('  ID:', transactions[0].id);
      console.log('  Date:', transactions[0].tanggal);
      console.log('  Item info:', transactions[0].item ? {
        kode_barang: transactions[0].item.kode_barang,
        nama_barang: transactions[0].item.nama_barang
      } : 'NULL');
      console.log('  Transaction type:', transactions[0].jenis_transaksi);
      console.log('  Amount:', transactions[0].jumlah);
    } else {
      console.log('No transactions found for the specified period');
    }

    console.log('Processing transactions data...');
    const hasil = transactions.map((transaction, index) => {
      // Debug every 10th transaction or if there's an issue
      if (index % 10 === 0 || !transaction.item) {
        console.log(`Processing transaction ${index + 1}/${transactions.length}:`, {
          id: transaction.id,
          hasItem: !!transaction.item,
          itemKode: transaction.item?.kode_barang,
          itemNama: transaction.item?.nama_barang
        });
      }

      // Handle missing Item relationship
      if (!transaction.item) {
        console.warn(`WARNING: Transaction ID ${transaction.id} has no associated Item`);
      }

      return {
        id: transaction.id,
        tanggal: transaction.tanggal,
        kode_barang: transaction.item?.kode_barang || null,
        nama_barang: transaction.item?.nama_barang || null,
        jenis_transaksi: transaction.jenis_transaksi,
        jumlah: transaction.jumlah,
        harga_satuan: parseFloat(transaction.harga_satuan || 0),
        diskon: parseFloat(transaction.diskon || 0),
        total_harga: parseFloat(transaction.total_harga || 0),
        stok_awal: transaction.stok_awal,
        stok_akhir: transaction.stok_akhir
      };
    });

    console.log('Final result summary:');
    console.log('  Total records processed:', hasil.length);
    console.log('  Records with missing items:', hasil.filter(h => !h.kode_barang).length);
    
    if (hasil.length > 0) {
      console.log('  Date range in results:', {
        earliest: hasil[0].tanggal,
        latest: hasil[hasil.length - 1].tanggal
      });
      
      // Summary by transaction type
      const typeSummary = hasil.reduce((acc, item) => {
        acc[item.jenis_transaksi] = (acc[item.jenis_transaksi] || 0) + 1;
        return acc;
      }, {});
      console.log('  Transaction types summary:', typeSummary);
    }

    console.log('=== TRANSACTION HISTORY DEBUG END ===');
    res.json(hasil);
    
  } catch (error) {
    console.error('=== ERROR OCCURRED ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Additional Sequelize-specific error info
    if (error.name === 'SequelizeError') {
      console.error('Sequelize error details:', {
        name: error.name,
        message: error.message,
        sql: error.sql
      });
    }
    
    console.error('Request details at time of error:', {
      query: req.query,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    console.error('=== ERROR DEBUG END ===');
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;