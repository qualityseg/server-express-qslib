const express = require('express');
const serverless = require('serverless-http');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Adicione as rotas do seu servidor aqui
app.post('/login', (req, res) => {
  // Sua lógica de login vai aqui
});

module.exports.handler = serverless(app);
