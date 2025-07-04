const express = require('express');
const multer = require('multer');
const analyzeRoutes = require('./src/routes/analyseRoute');
require('dotenv').config();

const app = express();
const cors = require('cors')
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors())
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); 
app.use('/analyze', analyzeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



