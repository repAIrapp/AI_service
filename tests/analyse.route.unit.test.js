// // // tests/analyse.route.unit.test.js
// // const request = require('supertest');
// // const express = require('express');

// // // Mock du contrôleur
// // jest.mock('../src/controllers/analyseController', () => {
// //   return {
// //     fullAnalyze: jest.fn((req, res) => res.status(200).json({ ok: true })),
// //   };
// // });

// // // Mock du middleware (toujours passe)
// // jest.mock('../src/middlewares/verifytoken', () => jest.fn((req, res, next) => next()));

// // const analyseRoute = require('../src/routes/analyseRoute');
// // const { fullAnalyze } = require('../src/controllers/analyseController');

// // describe('analyseRoute (unit)', () => {
// //   let app;

// //   beforeEach(() => {
// //     app = express();
// //     app.use(express.json());
// //     app.use('/analyse', analyseRoute);
// //     jest.clearAllMocks();
// //   });

// //   test('POST /analyse/full appelle fullAnalyze et retourne 200', async () => {
// //     const res = await request(app)
// //       .post('/analyse/full')
// //       .attach('photo', Buffer.from('fakeimg'), { filename: 'test.jpg', contentType: 'image/jpeg' });

// //     expect(res.status).toBe(200);
// //     expect(res.body).toEqual({ ok: true });
// //     expect(fullAnalyze).toHaveBeenCalled();
// //   });
// // });




// const request = require('supertest');
// const express = require('express');
// const multer = require('multer');

// // Simulation multer.single('photo')
// jest.mock('multer', () => () => ({
//   single: () => (req, _res, next) => {
//     req.file = {
//       path: 'fakepath/test.jpg',
//       mimetype: 'image/jpeg',
//       originalname: 'test.jpg',
//     };
//     next();
//   },
// }));

// // Simulation du middleware d'authentification
// jest.mock('../src/middlewares/verifytoken', () =>
//   jest.fn((req, res, next) => next())
// );

// describe('analyseRoute (unit)', () => {
//   let app;
//   let router;
//   const mockController = {
//     fullAnalyze: jest.fn((req, res) => res.status(200).json({ ok: true }))
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();

//     // Nouvelle app et router à chaque test
//     app = express();
//     app.use(express.json());
//     router = express.Router();

//     // On simule ici l'import de la route avec notre mock controller
//     const verifyToken = require('../src/middlewares/verifytoken');
//     const upload = multer();

//     router.post(
//       '/full',
//       verifyToken,
//       upload.single('photo'),
//       mockController.fullAnalyze
//     );

//     app.use('/analyse', router);
//   });

//   test('POST /analyse/full appelle fullAnalyze et retourne 200', async () => {
//     const res = await request(app)
//       .post('/analyse/full')
//       .set('Authorization', 'Bearer faketoken')
//       .field('userId', 'fakeUserId')
//       .field('objectrepairedId', 'fakeObjectId')
//       .attach('photo', Buffer.from('fakeimg'), {
//         filename: 'test.jpg',
//         contentType: 'image/jpeg',
//       });

//     expect(res.status).toBe(200);
//     expect(res.body).toEqual({ ok: true });
//     expect(mockController.fullAnalyze).toHaveBeenCalled();
//   });
// });



// tests/analyse.route.unit.test.js
const request = require('supertest');
const express = require('express');

// --- Mocks ---
jest.mock('../src/controllers/analyseController', () => ({
  fullAnalyze: jest.fn((req, res) => res.status(200).json({ ok: true })),
}));

jest.mock('../src/middlewares/verifytoken', () =>
  jest.fn((req, res, next) => next())
);

// Mock multer qui simule aussi le parsing des champs texte
jest.mock('multer', () => {
  return () =>
    ({
      single: () => (req, _res, next) => {
        // simule le fichier
        req.file = {
          path: 'fakepath/test.jpg',
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
        };
        // simule les champs texte pour que la validation passe
        if (!req.body) req.body = {};
        if (!('userId' in req.body)) req.body.userId = 'fakeUserId';
        if (!('objectrepairedId' in req.body)) req.body.objectrepairedId = 'fakeObjectId';
        next();
      },
    });
});

const analyseRoute = require('../src/routes/analyseRoute');
const { fullAnalyze } = require('../src/controllers/analyseController');

describe('analyseRoute (unit)', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/analyse', analyseRoute); // on monte la vraie route
  });

  test('POST /analyse/full appelle fullAnalyze et retourne 200', async () => {
    const res = await request(app)
      .post('/analyse/full')
      .set('Authorization', 'Bearer faketoken')
      // on envoie quand même les champs, mais le mock assure le parsing
      .field('userId', 'fakeUserId')
      .field('objectrepairedId', 'fakeObjectId')
      .attach('photo', Buffer.from('fakeimg'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fullAnalyze).toHaveBeenCalled();
  });
});
