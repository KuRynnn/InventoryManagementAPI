const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Item, Transaction } = require('../models');

router.get('/', async (req, res) => {
  try {
    const { tahun, bulan } = req.query;

    if (!tahun || !bulan) {
      return res.status(400).json({ message: 'Tahun dan bulan harus disediakan' });
    }

    const tanggalAwal = new Date(tahun, bulan - 1, 1);
    const tanggalAkhir = new Date(tahun, bulan, 0);

    const transactions = await Transaction.findAll({
      where: {
        tanggal: {
          [Op.between]: [tanggalAwal, tanggalAkhir]
        }
      },
      include: [{ model: Item, attributes: ['kode_barang', 'nama_barang'] }],
      order: [['tanggal', 'ASC']]
    });

    const hasil = transactions.map(transaction => ({
      id: transaction.id,
      tanggal: transaction.tanggal,
      kode_barang: transaction.Item.kode_barang,
      nama_barang: transaction.Item.nama_barang,
      jenis_transaksi: transaction.jenis_transaksi,
      jumlah: transaction.jumlah,
      harga_satuan: parseFloat(transaction.harga_satuan),
      diskon: parseFloat(transaction.diskon),
      total_harga: parseFloat(transaction.total_harga),
      stok_awal: transaction.stok_awal,
      stok_akhir: transaction.stok_akhir
    }));

    res.json(hasil);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;