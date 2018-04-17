const express = require('express');
const passport = require('passport');
const router = express.Router();
const jsonParser = require('body-parser').json();
const {GymGoerModel} = new require('../models/GymGoerModel');
const {StrengthTrackerExerciseModel} = new require('../models/StrengthTrackerExerciseModel');
const jwtAuth = passport.authenticate('jwt', { session: false });
const {routerUtils} = require('./routerUtils');

// update strength tracker program id and name
router.put('/programs/:programId', [jsonParser, jwtAuth], (req, res) => {
  
  routerUtils.confirmRequiredProperties(req.params, ['programId'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  routerUtils.confirmRequiredProperties(req.body, ['programName', 'dateStarted'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  const { id: gymGoerId } = req.user;
  const { programName, dateStarted } = req.body;
  const { programId } = req.params;

  GymGoerModel
    .addStrengthTrackerProgram(gymGoerId, programId, programName, dateStarted)
    .then(() => res.status(201).json({status: "ok"}));
});

// Add new set to exercise
router.post('/exercises/sets', [jsonParser, jwtAuth], (req, res) => {

  routerUtils.confirmRequiredProperties(req.body, ['programId', 'exerciseId', 'weight', 'reps'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  const {id: gymGoerID} = req.user;
  const {programId, exerciseId, weight, reps} = req.body;

  StrengthTrackerExerciseModel // TODO: Write addNewSet for the StrengthTrackerExerciseModel. Save the exerciseId, weight, and reps and calcualte the setNumber
    .addExerciseSet(gymGoerID, programId, exerciseId, { weight, reps })
    .then(updatedExercise => res.status(201).json(updatedExercise))
    .catch(err => {
      console.error('Error adding new set: ', err);
    })

});

module.exports = router;