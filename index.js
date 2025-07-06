const express = require('express');
const multer = require('multer');
const analyzeRoutes = require('./src/routes/analyseRoute');
require('dotenv').config();
const client = require("prom-client");

const app = express();
const cors = require('cors')
const PORT = process.env.PORT;

const register = new client.Registry();
// Crée une métrique de type Counter
const AIRequestsCounter = new client.Counter({
  name: "ai_requests_total",
  help: "Nombre total de requêtes sur le service AI",
  labelNames: ["method", "route", "status"]
});

// Enregistre la métrique dans le registre
register.registerMetric(AIRequestsCounter);

// Collecte les métriques système par défaut
client.collectDefaultMetrics({ register });

// Middleware pour enregistrer chaque requête
app.use((req, res, next) => {
  res.on("finish", () => {
    AIRequestsCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
  });
  next();
});

app.use(express.json());
app.use(cors())
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); 
app.use('/analyze', analyzeRoutes);
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const metricsApp = express();
metricsApp.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});
metricsApp.listen(9102, () => {
  console.log("📊 AI service metrics exposed on http://localhost:9102/metrics");
});


