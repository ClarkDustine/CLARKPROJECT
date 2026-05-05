const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Change to your MySQL username
  password: 'nbBYsy:dqN7b-yL', // Change to your MySQL password
  database: 'pos_system' // Ensure this database exists
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Route to get all products
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Route to add a sale
app.post('/sale', (req, res) => {
  const { product_id, quantity } = req.body;
  // Simple sale logic: insert into sales table
  db.query('INSERT INTO sales (product_id, quantity, sale_date) VALUES (?, ?, NOW())', [product_id, quantity], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Sale recorded', id: result.insertId });
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});