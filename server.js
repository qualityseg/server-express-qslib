const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');

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

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));
