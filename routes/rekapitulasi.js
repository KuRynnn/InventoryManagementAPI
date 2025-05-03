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

    const items = await Item.findAll();
    const hasil = [];

    for (const item of items) {
      const lastTransactionBeforeMonth = await Transaction.findOne({
        where: {
          item_id: item.id,
          tanggal: {
            [Op.lt]: tanggalAwal
          }
        },
        order: [['tanggal', 'DESC']]
      });

      const transactions = await Transaction.findAll({
        where: {
          item_id: item.id,
          tanggal: {
            [Op.between]: [tanggalAwal, tanggalAkhir]
          }
        },
        order: [['tanggal', 'ASC']]
      });

      const stokAwal = lastTransactionBeforeMonth ? lastTransactionBeforeMonth.stok_akhir : 0;

      const jumlahPembelian = transactions
        .filter(t => t.jenis_transaksi === 'pembelian')
        .reduce((sum, t) => sum + t.jumlah, 0);

      const jumlahTerjual = transactions
        .filter(t => t.jenis_transaksi === 'penjualan')
        .reduce((sum, t) => sum + t.jumlah, 0);

      const totalHargaBeli = transactions
        .filter(t => t.jenis_transaksi === 'pembelian')
        .reduce((sum, t) => sum + t.total_harga, 0);

      const totalHargaJual = transactions
        .filter(t => t.jenis_transaksi === 'penjualan')
        .reduce((sum, t) => sum + t.total_harga, 0);

      const totalDiskon = transactions
        .filter(t => t.jenis_transaksi === 'penjualan')
        .reduce((sum, t) => sum + t.diskon, 0);

      const stokAkhir = stokAwal + jumlahPembelian - jumlahTerjual;
      const keuntungan = totalHargaJual - (jumlahTerjual * parseFloat(item.harga_beli));

      hasil.push({
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        stok_awal: stokAwal,
        jumlah_pembelian: jumlahPembelian,
        harga_beli: parseFloat(item.harga_beli),
        total_harga_beli: parseFloat(totalHargaBeli),
        jumlah_terjual: jumlahTerjual,
        harga_jual: parseFloat(item.harga_jual),
        total_harga_jual: parseFloat(totalHargaJual),
        total_diskon: parseFloat(totalDiskon),
        stok_akhir: stokAkhir,
        keuntungan: parseFloat(keuntungan)
      });
    }

    res.json(hasil);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;