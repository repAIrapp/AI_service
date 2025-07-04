const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // Stocke les infos du token dans req.user
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token invalide' });
  }
}

module.exports = verifyToken;
