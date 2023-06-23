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

app.use(cors({
  origin: '*',
  credentials: true
}));
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
    items: req.body.items.map(item => ({
      title: item.title,
      unit_price: item.unit_price,
      quantity: item.quantity,
      description: item.description, // Adiciona a descrição em cada item, que pode ser usada para o email.
    })),
    payer: {
      email: req.body.email
    },
  };

  mercadopago.preferences.create(preference)
    .then(function(response){
      res.send({id: response.body.id});
    }).catch(function(error){
      console.log(error);
      res.status(500).send(error);
    });
});

app.post('/webhook', (req, res) => {
  const paymentId = req.query.id;

  // Chame a API do Mercado Pago para obter os detalhes do pagamento
  axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
    }
  })
  .then((response) => {
    const payment = response.data;

    if (payment.status === 'approved') {
      // O pagamento foi aprovado, salve os dados do token no banco de dados
      const { transaction_amount, payer, additional_info } = payment;

      const { email } = payer;
      const { courses } = JSON.parse(additional_info);

      const newCheckout = {
        session_id: payment.order.id,
        email: email,
        cursos: JSON.stringify(courses),
        valor: transaction_amount
      };

      // Substitua com a função que você usa para salvar os dados no banco de dados
      saveCheckoutData(newCheckout);
    }
  })
  .catch((error) => {
    console.error(error);
  });

  res.status(200).send();
});



const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));