const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const mercadopago = require('mercadopago');
const twilio = require('twilio');


const accountSid = 'AC70ff9c698a1bd034555f3ba4d29c7750'; // Seu Account SID da Twilio
const authToken = 'aa4e96f3f419b68df5843f38ec7a19d5'; // Seu Auth Token da Twilio
const client = twilio(accountSid, authToken);


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
  const { title, price, quantity } = req.body;

  const preference = {
    items: [
      {
        title,
        unit_price: Number(price),
        quantity: Number(quantity),
      },
    ],
    additional_info: JSON.stringify({ title }), // Armazene os detalhes do curso aqui
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook', (req, res) => {
  const paymentId = req.query.id;
  mercadopago.payment.findById(paymentId).then(payment => {
    if (payment.status === 'approved') {
      const additionalInfo = JSON.parse(payment.additional_info);
      const { title } = additionalInfo;

      // Enviar uma mensagem para o WhatsApp com os detalhes da compra
      client.messages
        .create({
          body: `O usuário comprou os seguintes cursos: ${title}. O valor total do pagamento é ${payment.transaction_amount}.`,
          from: 'whatsapp:+14155238886', // Número do WhatsApp da Twilio
          to: 'whatsapp:+5514998141078' // Seu número de WhatsApp
        })
        .then(message => console.log(message.sid))
        .catch(err => console.error(err));
    }
  }).catch(err => {
    console.error('Erro ao buscar detalhes do pagamento: ', err);
  });
  res.status(200).end();
});



const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));