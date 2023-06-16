const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const uuid = require('uuid');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const mercadopago = require('mercadopago');

const app = express();
app.use(cookieParser());
app.use(cors())
app.use(express.json());

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

app.post('/create_preference', (req, res) => {
  if (!req.cookies['session_id']) {
    res.cookie('session_id', uuid.v4());
  }
  const { email, course_id, quantidade, titulo, valor } = req.body;
  const session_id = req.cookies['session_id'];
  
  let expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);

  const addSelectedCourseQuery = 'INSERT INTO selected_courses (session_id, email, course_id, quantidade, titulo, valor, expiry) VALUES (?, ?, ?, ?, ?, ?, ?)';

  db.query(addSelectedCourseQuery, [session_id, email, course_id, quantidade, titulo, valor, expiryDate], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Erro ao processar a solicitação');
    } else {
      res.status(200).send('Seleção adicionada com sucesso');
    }
  });
});

setInterval(() => {
  let deleteExpiredSelectionsQuery = 'DELETE FROM selected_courses WHERE expiry < NOW()';
  db.query(deleteExpiredSelectionsQuery, (err, result) => {
    if (err) {
      console.error('Erro ao apagar seleções expiradas:', err);
    } else {
      console.log('Seleções expiradas apagadas com sucesso');
    }
  });
}, 10 * 60 * 1000); // Executa a cada 10 minutos

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

app.post('/checkout', function (req, res) {
  if (req.session.cart && req.session.cart.length > 0) { // Verifique se o carrinho existe e não está vazio
      let values = req.session.cart.map(item => [
          req.session.id, 
          req.session.email, 
          item.course_id, 
          item.quantidade, 
          item.titulo, 
          item.valor,
          new Date() // Isto irá inserir a data e a hora atuais
      ]);

      let sql = "INSERT INTO selected_courses (session_id, email, course_id, quantidade, titulo, valor, expiry) VALUES ?";

      pool.query(sql, [values], function (err, result) {
          if (err) {
              console.error(err);
              res.status(500).send(err);
          } else {
              console.log("Número de registros inseridos: " + result.affectedRows);
              req.session.cart = []; // Limpe o carrinho
              res.send("Checkout concluído com sucesso!");
          }
      });
  } else {
      res.status(400).send("O carrinho está vazio");
  }
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