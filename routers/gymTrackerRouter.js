const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const cookieParser = require('cookie-parser');

const config = require('../config');
const {GymGoerModel, GymGoerExercisesModel} = new require('../models/GymGoerModel');
const {routerUtils} = require('./routerUtils');

const createAuthToken = function(gymGoer) {
  return jwt.sign({gymGoer}, config.JWT_SECRET, {
    subject: gymGoer.email,
    expiresIn: config.JWT_EXPIRY,
    algorithm: 'HS256'
  });
};
const jwtAuth = passport.authenticate('jwt', { session: false });
const localAuth = passport.authenticate('local', {session: false});

router.get('/', (req, res) => {
  const filters = routerUtils.getFilters(req.query, ['email']);
  const limit = routerUtils.getLimit(req.query, 10);

  GymGoerModel
    .find(filters)
    .limit(limit)
    .then(results => {
      res.json({
        gymGoers: results.map((gymGoer) => {
          return gymGoer.serialize();
        })
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({message: 'Internal Server Error'});
    });
});

router.get('/:id', [cookieParser(), jwtAuth], (req, res) => {
  GymGoerModel
    .findById(req.params.id)
    .then(gymGoer => {
      if (gymGoer) {
        res.status(200).json(gymGoer.serializeAll());
      } else {
        console.error(`Cannot GET gym goer. Invalid id supplied (${req.params.id})`);
        res.status(400).json({ error: 'Invalid id supplied' });
      }
    })
    .catch((err) => {
      if (err.name === 'CastError') {
        console.error(`Cannot GET gym goer. Invalid id supplied (${req.params.id})`);
        res.status(400).json({ error: 'Invalid id supplied' });
      }
      console.error('ERROR:', err);
      res.status(500).json({message: 'Internal Server Error'});
    });
});

router.post('/add-exercise', [cookieParser(), jsonParser, jwtAuth], (req, res) => {
  const {id: gymGoerID} = req.user;
  const {sessionType, exerciseName} = req.body;

  routerUtils.confirmRequiredProperties(req.body, ['sessionType', 'exerciseName'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  GymGoerExercisesModel
    .addNewExercise(gymGoerID, sessionType, exerciseName)
    .then(session => res.json(session));
});

router.post('/init-training-session', [cookieParser(), jsonParser, jwtAuth], (req, res) => {
  const {id: gymGoerID} = req.user;
  const sessionType = req.body.sessionType;

  routerUtils.confirmRequiredProperties(req.body, ['sessionType'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  GymGoerModel
    .initGymGoerTrainingSession(gymGoerID, sessionType)
    .then(session => {
      res.json(session);
    });
});

router.post('/login', [jsonParser, localAuth], (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({authToken});
});

module.exports = router;