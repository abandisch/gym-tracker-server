'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const { runServer, closeServer, app } = require('../../server');
const mongoose = require('mongoose');

const {StrengthTrackerExerciseModel} = require('../../models/StrengthTrackerExerciseModel');
const {GymGoerModel} = require('../../models/GymGoerModel');
const {TEST_DATABASE_URL, JWT_SECRET, JWT_EXPIRY} = require('../../config');

chai.use(chaiHttp);

const BASE_API_URL = '/strength-tracker';
const TEST_EMAIL = 'alex@bandisch.com';

const createTestGymGoer = (email) => {
  return GymGoerModel.createGymGoer(email);
};
const createJwtToken = (gymGoerId = '5a8409c307a3b762ac1a6ba4') => {
  const gymGoer = { id: gymGoerId, email: TEST_EMAIL };
  const jwtAuthToken = jwt.sign({gymGoer}, JWT_SECRET, {
    subject: TEST_EMAIL,
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256'
  });
  return jwtAuthToken;
};
const addTestExercise = (gymGoerId, strTrkExerciseId, dayNumber, sets = []) => {
  return GymGoerExercisesModel.create({
    gymGoerId,
    strTrkExerciseId,
    dayNumber,
    sets
  });
};

describe('# strengthTrackerRouter', function () {
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });
  after(function() {
    return closeServer();
  });
  // Clean the database before each test
  beforeEach(function () {
    return mongoose.connection.dropDatabase();
  });

  describe('# strengthTrackerRouter: PUT: /strength-tracker/programs/:id', function () {
    it('should update the gymgoer with the chosen program id and name', function () {
      let gymGoer;
      const TEST_PROGRAM_ID = '2d997e82';
      const TEST_PROGRAM_NAME = 'test gym workout';
      const TEST_PROGRAM_START_DATE = new Date().toISOString().split('T')[0];
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => {
          return chai.request(app)
            .put(`${BASE_API_URL}/programs/${TEST_PROGRAM_ID}`)
            .send({programName: TEST_PROGRAM_NAME, dateStarted: TEST_PROGRAM_START_DATE})
            .set('Authorization', `Bearer ${createJwtToken(gymGoer.id)}`)
            .then(res => {
              expect(res).status(204);
            });
        })
    });
  });
});