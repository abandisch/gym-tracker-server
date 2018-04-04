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

// Add new exercise to sessionType
router.post('/exercises', [cookieParser(), jsonParser, jwtAuth], (req, res) => {
  const {id: gymGoerID} = req.user;
  const {sessionType, exerciseName} = req.body;

  routerUtils.confirmRequiredProperties(req.body, ['exerciseName'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  GymGoerExercisesModel
    .addNewExercise(gymGoerID, sessionType, exerciseName)
    .then(session => res.status(201).json(session))
    .catch(err => {
      console.error(err);
      res.status(500).json({error: 'Internal server error'})
    });
});

// Add new set to exercise
router.post('/exercises/sets', [cookieParser(), jsonParser, jwtAuth], (req, res) => {
  const {id: gymGoerID} = req.user;
  const {sessionType, exerciseName, newSet} = req.body;

  routerUtils.confirmRequiredProperties(req.body, ['sessionType', 'exerciseName', 'newSet'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  GymGoerExercisesModel
    .addNewSet(gymGoerID, sessionType, exerciseName, newSet)
    .then(updatedSession => res.status(201).json(updatedSession))
    .catch(err => {
      console.error('Error adding new set: ', err);
    })

});

// Delete exercise set
router.delete('/exercises/sets/:id', [cookieParser(), jsonParser, jwtAuth], (req, res) => {
  const {id: gymGoerId} = req.user;
  const {sessionType} = req.body;

  routerUtils.confirmRequiredProperties(req.params, ['id'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  routerUtils.confirmRequiredProperties(req.body, ['sessionType'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  return GymGoerExercisesModel
    .deleteExerciseSetById(req.params.id)
    .then(() => GymGoerExercisesModel.findExercisesForToday(gymGoerId, sessionType))
    .then(exercises => GymGoerExercisesModel.attachLastBestSetToMultipleExercises(exercises))
    .then(exercisesForToday => GymGoerExercisesModel.flattenExercises(exercisesForToday))
    .then(flattenedExercises => res.status(200).json(flattenedExercises));
});

// update exercise set
router.put('/exercises/sets/:id', [cookieParser(), jsonParser, jwtAuth], (req, res) => {
  const {id: gymGoerId} = req.user;
  const {updatedSet, sessionType} = req.body;

  routerUtils.confirmRequiredProperties(req.params, ['id'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  routerUtils.confirmRequiredProperties(req.body, ['sessionType'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  return GymGoerExercisesModel
    .updateExerciseSetById(req.params.id, updatedSet)
    .then(() => GymGoerExercisesModel.findExercisesForToday(gymGoerId, sessionType))
    .then(exercises => GymGoerExercisesModel.attachLastBestSetToMultipleExercises(exercises))
    .then(exercisesForToday => GymGoerExercisesModel.flattenExercises(exercisesForToday))
    .then(flattenedExercises => res.status(200).json(flattenedExercises))
});

// Get exercises for sessionType on sessionISODate (using POST, so browser doesn't cache results)
router.post('/exercises/:sessionType/:sessionISODate', [cookieParser(), jsonParser, jwtAuth], (req, res) => {
  const {id: gymGoerID} = req.user;
  const sessionType = req.params.sessionType;
  let sessionISODate;

  routerUtils.confirmRequiredProperties(req.params, ['sessionType', 'sessionISODate'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  // Validate provided sessionDate is in the correct format (yyyy-mm-dd), if provided
  if (routerUtils.isValidISODate(req.params.sessionISODate)) {
    sessionISODate = req.params.sessionISODate;
  } else {
    return res.status(400).json({error: 'Incorrect date format'});
  }

  GymGoerExercisesModel
    .initSessionExercises(gymGoerID, sessionType, sessionISODate)
    .then(session => {
      res.json(session);
    });
});

router.post('/login', [jsonParser, localAuth], (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({authToken});
});

module.exports = router;