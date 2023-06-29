const express = require('express');
const cors = require('cors');  // importe a biblioteca CORS
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: 'TEST-5726910917773045-022319-9fe40cf329e21dbf8d13e488ad37d1b5-638695398',
});

const app = express();
app.use(express.json());

app.use(cors());  // adicione o middleware CORS

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
    const response = await mercadopago.preferences.create(preference);
    console.log(response);
    res.json({ id: response.body.id });
  } catch (error) {
    console.log(error);  // Isso permitirá que você veja o erro no console do servidor
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
