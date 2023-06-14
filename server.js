const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const mercadopago = require('mercadopago');

const nodemailer = require('nodemailer');

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


mercadopago.configure({
  access_token: 'TEST-2684905602430236-052513-51d07b1caa42a7938ab7e2a9f13a7f98-135153905',
});

app.post('/create_preference', async (req, res) => {
  const email = req.body.email;
  const { title, price, quantity } = req.body;

  const preference = {
    items: [
      {
        title,
        unit_price: Number(price),
        quantity: Number(quantity),
      },
    ],
    back_urls: {
      success: 'http://localhost:3000/success', // URL para redirecionar o usuário após a compra bem-sucedida
      failure: 'http://localhost:3000/failure', // URL para redirecionar o usuário após a compra mal sucedida
      pending: 'http://localhost:3000/pending' // URL para redirecionar o usuário quando a compra estiver pendente
    },
    auto_return: 'approved',
    payer: {
      email
    }
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/success', (req, res) => {
  const paymentInfo = req.query; // Aqui você obtém as informações de pagamento retornadas pelo Mercado Pago

  // Você pode obter o título do item (curso) da seguinte maneira:
  const courseNames = paymentInfo.external_reference;

  const userEmail = paymentInfo.payer.email;

  // Agora você pode enviar um e-mail para o usuário com os nomes dos cursos que ele comprou
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'miguel.matheus@gmail.com',
      pass: 'Mustang2019#'
    }
  });

  const mailOptions = {
    from: 'miguel.matheus@gmail.com',
    to: userEmail, // Você precisa obter o e-mail do cliente de alguma maneira
    subject: 'Confirmação de Compra',
    text: `Obrigado por comprar os seguintes cursos: ${courseNames}`
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email enviado: ' + info.response);
    }
  });

  res.send('Pagamento aprovado com sucesso!'); // Você pode personalizar essa mensagem
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));