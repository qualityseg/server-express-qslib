// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');  // Ainda não utilizado, mas importado para uso futuro
const mysql = require('mysql');
const mercadopago = require('mercadopago');

const app = express();

// Configura a conexão com o banco de dados usando variáveis de ambiente
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
});

// Inicializa a conexão com o banco de dados
db.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados MySQL:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
  connection.release();
});

// Configura o CORS e permite apenas origens específicas
app.use(cors({
  origin: ['http://localhost:3000', 'https://qualitysegconsultoria-cursosead.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Middleware para analisar o corpo da requisição como JSON
app.use(express.json());

// Configura o Mercado Pago usando uma variável de ambiente
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Rota para criar uma preferência no Mercado Pago
app.post('/create_preference', async (req, res) => {
  const { items } = req.body;
  const preference = { items };

  try {
    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Porta padrão ou a porta especificada na variável de ambiente
const port = process.env.PORT || 5000;

// Inicia o servidor na porta especificada
app.listen(port, () => console.log(`Server is running on port ${port}`));
