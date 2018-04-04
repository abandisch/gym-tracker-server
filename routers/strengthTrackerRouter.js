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

  routerUtils.confirmRequiredProperties(req.body, ['programName'], (msg) => {
    console.error(msg);
    return res.status(400).json({error: msg});
  });

  const { id: gymGoerId } = req.user;
  const { programName } = req.body;
  const { programId } = req.params;

  GymGoerModel
    .addStrengthTrackerProgram(gymGoerId, programId, programName)
    .then(() => res.status(204).end());
});

module.exports = router;