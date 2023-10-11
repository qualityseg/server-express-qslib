const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const mercadopago = require('mercadopago');

const app = express();

const db = mysql.createPool({
  host: '129.148.55.118',
  user: 'QualityAdmin',
  password: 'Suus0220##',
  database: 'qualityseg_db',
  connectionLimit: 10,
});

db.getConnection((err, connection) => {
  if (err) throw err;
  console.log('Conectado ao banco de dados MySQL');
  connection.release();
});

app.use(cors({
  origin: ['http://localhost:3000', 'https://qualitysegconsultoria-cursosead.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());



mercadopago.configure({
  access_token: 'APP_USR-7304812877338953-082314-54650cc5997e303c67cc93800415cce0-226752657',
});

app.post('/create_preference', async (req, res) => {
  // Os itens são passados como um array no corpo da requisição
  const { items } = req.body;

  const preference = {
    items,  // Use os itens fornecidos
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));