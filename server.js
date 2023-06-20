const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: "129.148.55.118",
    user: "QualityAdmin",
    password: "Suus0220##",
    database: "qualityseg_db",
});

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to database");
});

app.post("/checkout", (req, res) => {
    const data = req.body;
    console.log(data);

    const sql =
        "INSERT INTO checkout (session_id, email, cursos, valor) VALUES ?";
    const values = [
        [
            data.session_id,
            data.email,
            JSON.stringify(data.cursos),
            JSON.stringify(data.valor),
        ],
    ];

    db.query(sql, [values], function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });

    res.json({ status: "ok" });
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
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
  const transactionId = req.body.id; // ou req.body.data.id, depende de como vem no corpo do webhook
  const transactionDetails = await axios.get(`https://api.mercadopago.com/v1/payments/${transactionId}`, {
    headers: {
      Authorization: 'Bearer TEST-2684905602430236-052513-51d07b1caa42a7938ab7e2a9f13a7f98-135153905'
    }
  });
  
  if (transactionDetails.status === 'approved') {
    const email = transactionDetails.payer.email;
    const courses = transactionDetails.additional_info.courses;
    const totalValue = transactionDetails.transaction_amount;
    
    const connection = mysql.createConnection({
      host: '129.148.55.118',
      user: 'QualityAdmin',
      password: 'Suus0220##',
      database: 'qualityseg_db'
    });

    connection.connect();

    const query = `
      INSERT INTO checkout (session_id, email, cursos, valor)
      VALUES (?, ?, ?, ?)
    `;

    connection.query(query, [transactionId, email, JSON.stringify(courses), totalValue], (error, results, fields) => {
      if (error) throw error;
      console.log('Dados inseridos com sucesso!');
    });

    connection.end();
  }

  res.sendStatus(200);
});




const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));