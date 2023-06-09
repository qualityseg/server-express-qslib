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
  access_token: 'APP_USR-2684905602430236-052513-9eece6d19d92891e0f385f8ad4816f6d-135153905',
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