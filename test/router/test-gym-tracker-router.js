'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const { runServer, closeServer, app } = require('../../server');
const mongoose = require('mongoose');

const {GymGoerModel, GymGoerExercisesModel} = require('../../models/GymGoerModel');
const {TEST_DATABASE_URL, JWT_SECRET, JWT_EXPIRY} = require('../../config');

chai.use(chaiHttp);

const BASE_API_URL = '/gym-tracker';
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
const addTestExercise = (gymGoerId, sessionType, sessionDate, exerciseName, sets = []) => {
  return GymGoerExercisesModel.create({
    gymGoerId: gymGoerId,
    sessionType: sessionType,
    sessionDate: sessionDate,
    exerciseName: exerciseName,
    sets: sets
  });
};

describe('# gymTrackerRouter', function () {
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

  describe('# gymTrackerRouter: /gym-tracker/login', function () {
    it('should return a JWT token', function () {
      return chai.request(app)
        .post(`${BASE_API_URL}/login`)
        .send({email: TEST_EMAIL, password: 'null'})
        .then(res => {
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys(['authToken'])
        });
    });
    it('should return a http 400 error (bad request) if no email is provided', function () {
      return chai.request(app)
        .post(`${BASE_API_URL}/login`)
        .send({email: '', password: 'null'})
        .catch(res => {
          expect(res.status).to.equal(400);
        })
    });
  });

  describe('# gymTrackerRouter: /gym-tracker/exercises/:sessionType/:sessionDate', function () {
    it('should return an initialised exercise session for the gym goer', function () {
      const TEST_TRAINING_SESSION = 'chest';
      const ISODateToday = new Date().toISOString().slice(0, 10);
      return chai.request(app)
        .post(`${BASE_API_URL}/exercises/${TEST_TRAINING_SESSION}/${ISODateToday}`)
        .set('Authorization', `Bearer ${createJwtToken()}`)
        .then(res => {
          expect(res).status(200);
          expect(res.body).to.have.keys(['sessionType', 'sessionDate', 'exercises']);
          expect(res.body.sessionType).to.equal(TEST_TRAINING_SESSION);
        });
    });

    it('should return a http 400 if the session date format is not yyy-mm-dd', function () {
      const TEST_TRAINING_SESSION = 'chest';
      const badISODateFormat = 'i-am-a-bad-date';
      return chai.request(app)
        .post(`${BASE_API_URL}/exercises/${TEST_TRAINING_SESSION}/${badISODateFormat}`)
        .set('Authorization', `Bearer ${createJwtToken()}`)
        .catch(res => {
          expect(res).status(400);
        });
    });
  });

  describe('# gymTrackerRouter: /gym-tracker/exercises', function () {
    it('should return a session with the new exercise added', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME = 'bench press';
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => {
          return chai.request(app)
            .post(`${BASE_API_URL}/exercises`)
            .send({sessionType: TEST_SESSION_TYPE, exerciseName: TEST_EXERCISE_NAME})
            .set('Authorization', `Bearer ${createJwtToken()}`)
            .then(res => {
              expect(res).status(201);
              expect(res.body).to.have.keys(['sessionType', 'sessionDate', 'exercises']);
              expect(res.body.sessionType).to.equal(TEST_SESSION_TYPE);
              expect(res.body.exercises.length).to.equal(1);
              expect(res.body.exercises[0].name).to.equal(TEST_EXERCISE_NAME);
            });
        });
    });
  });

  describe('# gymTrackerRouter: POST: /gym-tracker/exercises/sets', function () {
    it('should return a session with the new set added to the exercise', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME = 'bench press';
      const TEST_SET = { weight: "40", reps: 12 };
      let TODAY = new Date();
      let gymGoer;

      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME))
        .then(() => {
          return chai.request(app)
            .post(`${BASE_API_URL}/exercises/sets`)
            .set('Authorization', `Bearer ${createJwtToken(gymGoer.id)}`)
            .send({sessionType: TEST_SESSION_TYPE, exerciseName: TEST_EXERCISE_NAME, newSet: TEST_SET})
            .then(res => {
              expect(res).status(201);
              expect(res.body).to.have.keys(['sessionType', 'sessionDate', 'exercises']);
              expect(res.body.sessionType).to.equal(TEST_SESSION_TYPE);
              expect(res.body.exercises.length).to.equal(1);
              expect(res.body.exercises[0]).to.have.keys(['id', 'name', 'sets', 'lastBestSet']);
              expect(res.body.exercises[0].name).to.equal(TEST_EXERCISE_NAME);
              expect(res.body.exercises[0].sets.length).to.equal(1);
              expect(res.body.exercises[0].sets[0]).to.have.keys(['id', 'setNumber', 'weight', 'reps']);
            });
        });
    });
  });

  describe('# gymTrackerRouter: DELETE: /gym-tracker/exercises/sets/:id', function () {
    it('should return a session with the set removed from the exercise', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME = 'bench press';
      const TEST_SET = [{setNumber: 1, weight: "40", reps: 12 }];
      let TODAY = new Date();
      let gymGoer;
      let exerciseSetId;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME, TEST_SET))
        .then((exercise) =>  exerciseSetId = exercise.sets[0]._id)
        .then(() => {
          return chai.request(app)
            .delete(`${BASE_API_URL}/exercises/sets/${exerciseSetId}`)
            .send({sessionType: TEST_SESSION_TYPE})
            .set('Authorization', `Bearer ${createJwtToken(gymGoer.id)}`)
            .then(res => {
              expect(res).status(200);
            });
        });
    });
  });

  describe('# gymTrackerRouter: UPDATE: /gym-tracker/exercises/sets/:id', function () {
    it('should return a session with the set removed from the exercise', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME = 'bench press';
      const TEST_SET = [{setNumber: 1, weight: "40", reps: 12 }];
      const UPDATED_TEST_SET = { weight: "60", reps: 10 };
      let TODAY = new Date();
      let gymGoer;
      let exerciseSetId;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME, TEST_SET))
        .then((exercise) =>  exerciseSetId = exercise.sets[0]._id)
        .then(() => {
          return chai.request(app)
            .put(`${BASE_API_URL}/exercises/sets/${exerciseSetId}`)
            .send({updatedSet: UPDATED_TEST_SET, sessionType: TEST_SESSION_TYPE})
            .set('Authorization', `Bearer ${createJwtToken(gymGoer.id)}`)
            .then(res => {
              expect(res).status(200);
            });
        });
    });
  });
});