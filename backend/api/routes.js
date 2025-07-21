const express = require('express');
const router = express.Router();

router.get('/farms', (req, res) => {
  res.json({ message: 'Endpoint de Fazendas OK' });
});

router.get('/analyses', (req, res) => {
  res.json({ message: 'Endpoint de Análises OK' });
});

router.get('/alerts', (req, res) => {
  res.json({ message: 'Endpoint de Alertas OK' });
});

module.exports = router;