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

db.getConnection((err, connection) => {
  if (err) throw err;
  console.log('Conectado ao banco de dados MySQL');

  const createCheckoutTableQuery = `
    CREATE TABLE IF NOT EXISTS checkout (
      session_id VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      cursos VARCHAR(255),
      valor DOUBLE,
      PRIMARY KEY (session_id)
    )
  `;

  connection.query(createCheckoutTableQuery, err => {
    if (err) throw err;
    console.log('Tabela de checkout verificada / criada com sucesso');
  });

  connection.release();
});


app.use(cors());
app.use(express.json());


app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  const query = 'SELECT * FROM cadastro WHERE usuario = ?';
  db.query(query, [usuario], (err, results) => {
   
    if (err) {
      console.error('Error querying the database: ', err);
      return res.send({ success: false, message: err.message });
    }
    if (results.length === 0) {
      return res.send({ success: false, message: 'User not found' });
    }
    const user = results[0];
    console.log('User found in database: ', user);

    if (senha !== user.senha) {
      return res.send({ success: false, message: 'Wrong password' });
    }
    
    const token = jwt.sign({ id: user.id }, 'suus02201998##', { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    
    // inclua o nome do usuário na resposta
    res.send({ success: true, username: user.usuario, token });
    
  });
});


app.delete('/deleteAll', (req, res) => {
  const query = 'DELETE FROM cadastro';
  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: 'Falha ao excluir registros: ' + err.message });
    }

    if (result.affectedRows > 0) {
      res.send({ success: true, message: `${result.affectedRows} registro(s) foram excluídos.` });
    } else {
      res.send({ success: false, message: 'Não há registros para excluir.' });
    }
  });
});

app.post('/checkout', (req, res) => {
  // Extrai os dados de checkout do corpo da solicitação
  const { email, cursos, valor } = req.body;

  // Gera uma ID de sessão única
  const sessionId = jwt.sign({ email }, 'suus02201998##', { expiresIn: '1h' });

  // Consulta para inserir os dados de checkout no banco de dados
  const query = 'INSERT INTO checkout (session_id, email, cursos, valor) VALUES (?, ?, ?, ?)';
  
  // Executa a consulta
  db.query(query, [sessionId, email, cursos, valor], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ success: false, message: err.message });
    }

    // Envia a ID da sessão como resposta
    res.send({ success: true, sessionId });
  });
});


app.post('/register', (req, res) => {
  const { usuario, senha } = req.body;

  const query = 'INSERT INTO cadastro (usuario, senha) VALUES (?, ?)';
  db.query(query, [usuario, senha], (err, result) => {
    
    if (err) {
      console.log(err);
      return res.send({ success: false, message: err.message });
    }

    res.send({ success: true });
  });

});

app.post('/payment_notification', (req, res) => {
  // Extraia os detalhes do pagamento do corpo da requisição
  const { id, email, cursos, valor } = req.body;

  // Query para inserir os detalhes do pagamento no banco de dados
  const query = 'INSERT INTO pagamentos (id, email, cursos, valor) VALUES (?, ?, ?, ?)';
  
  // Execute a query
  db.query(query, [id, email, cursos, valor], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ success: false, message: err.message });
    }
    res.send({ success: true });
  });
});


mercadopago.configure({
  access_token: 'TEST-2684905602430236-052513-51d07b1caa42a7938ab7e2a9f13a7f98-135153905',
});

app.post('/create_preference', async (req, res) => {
  const { title, price, quantity } = req.body;

  const preference = {
    items: [
      {
        title,
        unit_price: Number(price),
        quantity: Number(quantity),
      },
    ],
  };

  try {
    const response = await mercadopago.preferences.create(preference); // Correção aqui
    res.json({ id: response.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));