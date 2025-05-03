const express = require('express');
const router = express.Router();
const { Transaction, Item } = require('../models');
const sequelize = require('../config/database');

// GET all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.findAll();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new transaction
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { item_id, jenis_transaksi, jumlah, diskon } = req.body;

    if (!item_id) {
      return res.status(400).json({ message: 'item_id is required' });
    }

    const item = await Item.findByPk(item_id, { transaction: t });
    
    if (!item) {
      await t.rollback();
      return res.status(404).json({ message: 'Item not found' });
    }

    const stok_awal = item.stok;
    let stok_akhir, harga_satuan;

    if (jenis_transaksi === 'pembelian') {
      harga_satuan = item.harga_beli;
      stok_akhir = stok_awal + jumlah;
    } else if (jenis_transaksi === 'penjualan') {
      harga_satuan = item.harga_jual;
      stok_akhir = stok_awal - jumlah;
      if (stok_akhir < 0) {
        await t.rollback();
        return res.status(400).json({ message: 'Stok tidak mencukupi' });
      }
    } else {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid jenis_transaksi' });
    }

    const total_harga = (harga_satuan * jumlah) - (diskon || 0);

    const newTransaction = await Transaction.create({
      item_id,
      jenis_transaksi,
      jumlah,
      harga_satuan,
      diskon: diskon || 0,
      total_harga,
      stok_awal,
      stok_akhir,
      tanggal: new Date()
    }, { transaction: t });

    await item.update({ stok: stok_akhir }, { transaction: t });

    await t.commit();
    res.status(201).json(newTransaction);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;