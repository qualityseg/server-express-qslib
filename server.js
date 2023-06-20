const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const mercadopago = require('mercadopago');
const pendingTransactions = {};


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



app.use((req, res, next) => {
  // Se não há token na requisição, passe para a próxima rota
  if (!req.headers.authorization) return next();

  // Decodificar o token
  const token = req.headers.authorization.split(' ')[1];
  try {
    const payload = jwt.verify(token, 'suus02201998##');
    req.user = payload;
  } catch (error) {
    console.log('Error decoding JWT: ', error);
  }

  next();
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

app.post('/create_preference', (req, res) => {
  let preference = {
      items: req.body.items, // assumindo que você envia os itens de pagamento no corpo da requisição
      payer: {
          email: req.body.email // assumindo que você envia o email do comprador no corpo da requisição
      }
  };

  mercadopago.preferences.create(preference)
      .then(function(response){
          res.send({id: response.body.id});
      }).catch(function(error){
          console.log(error);
          res.status(500).send(error);
      });
});


app.post('/webhook', async (req, res) => {
  console.log("Received a webhook event", req.body);  

  const event = req.body;

  if (event.action === "payment.created") {
    try {
      // Fetch payment details from Mercado Pago API
      const payment = await mercadopago.payment.findById(event.data.id);

      // Check if payment and payer exist and the payment is approved
      if (payment.body && payment.body.payer && payment.body.status === 'approved') {
        const sessionId = payment.body.id;

        // Recuperar informações de pendingTransactions
        const { email, cursos, valor } = pendingTransactions[sessionId] || {};

        console.log("Saving checkout data", {sessionId, email, cursos, valor});  

        const query = 'INSERT INTO checkout (session_id, email, cursos, valor) VALUES (?, ?, ?, ?)';
        db.query(query, [sessionId, email, JSON.stringify(cursos), valor], (err, result) => {
          if (err) {
              console.error('Error inserting checkout data into the database: ', err);
              return res.status(500).send({ success: false, message: err.message });
          }
          console.log("Query result: ", result);
          console.log("Successfully saved checkout data");

          // Remover transação de pendingTransactions
          delete pendingTransactions[sessionId];

          res.send({ success: true });
        });
      } else {
        console.log("Payment not approved, ignoring");
      }
    } catch (error) {
      console.error('Error fetching payment details from Mercado Pago API: ', error);
    }
  } else {
    console.log("Webhook event not relevant, ignoring");
  }

  res.status(200).end();
});




const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));