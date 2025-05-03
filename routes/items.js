const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Item, Transaction } = require('../models');
const sequelize = require('../config/database');

// GET all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new item
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { kode_barang, nama_barang, harga_beli, harga_jual, jumlah, diskon } = req.body;
    const newItem = await Item.create({
      kode_barang,
      nama_barang,
      harga_beli,
      harga_jual,
      stok: jumlah || 0
    }, { transaction: t });

    // Create a transaction for the initial stock
    await Transaction.create({
      item_id: newItem.id,
      jenis_transaksi: 'pembelian',
      jumlah: jumlah || 0,
      harga_satuan: harga_beli,
      diskon: diskon || 0,
      total_harga: ((jumlah || 0) * harga_beli) - (diskon || 0),
      stok_awal: 0,
      stok_akhir: jumlah || 0,
      tanggal: new Date()
    }, { transaction: t });

    await t.commit();
    res.status(201).json(newItem);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
});

// GET single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update item
router.put('/:id', async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (item) {
      await item.update(req.body);
      res.json({ message: 'Item updated successfully' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (item) {
      await item.destroy();
      res.json({ message: 'Item deleted successfully' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search items
router.get('/search', async (req, res) => {
  try {
    const { nama_barang } = req.query;
    const items = await Item.findAll({
      where: {
        nama_barang: {
          [Op.like]: `%${nama_barang}%`
        }
      }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;