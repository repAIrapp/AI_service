// const express = require('express');
// const multer = require('multer');
// const { fullAnalyze } = require('../controllers/analyseController');
// const verifyToken = require('../middlewares/verifytoken');
// const { body, validationResult } = require('express-validator');

// const router = express.Router();
// const upload = multer({ dest: 'uploads/' });

// const validateFullAnalyze = [
//   body('userId').notEmpty().withMessage('userId est requis'),
//   body('objectrepairedId').notEmpty().withMessage('objectrepairedId est requis'),
//   // description est optionnel mais si présent, doit être une string
//   body('description').optional().isString().withMessage('description invalide'),
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     next();
//   }
// ];

// // router.post('/full', upload.single('photo'), fullAnalyze);
// router.post('/full', verifyToken, upload.single('photo'),validateFullAnalyze, fullAnalyze);

// module.exports = router;





const express = require('express');
const multer = require('multer');
const { fullAnalyze } = require('../controllers/analyseController');
const verifyToken = require('../middlewares/verifytoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const { quotaProxy } = require('../middlewares/quotasproxy');


const validateFullAnalyze = [
  body('userId').notEmpty().withMessage('userId est requis'),
  body('objectrepairedId').notEmpty().withMessage('objectrepairedId est requis'),
  body('description').optional().isString().withMessage('description invalide'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// router.post('/full', verifyToken, upload.single('photo'), validateFullAnalyze, fullAnalyze);
router.post(
  '/full',
  verifyToken,
  quotaProxy,              
  upload.single('photo'),
  validateFullAnalyze,
  fullAnalyze
);

module.exports = router;
