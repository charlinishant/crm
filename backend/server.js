require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();

const leadRouter = require('./routes/leadRoutes')
const projectRouter = require("./routes/projectRoutes")

app.use(cors());
app.use(express.json());
app.use('/leads', leadRouter)
app.use('/projects', projectRouter)

app.get('/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.send('Database Connected ');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});