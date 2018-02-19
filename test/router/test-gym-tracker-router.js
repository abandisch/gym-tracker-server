'use strict';

import {setCookie} from "../../src/js/cookies";

const chai = require('chai');
const expect = chai.expect;
const faker = require('faker');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const { runServer, closeServer, app } = require('../../server');
// const gymTrackerRouter = require('../../routers/gymTrackerRouter');
const mongoose = require('mongoose');

const {GymGoerModel, GymGoerExercisesModel} = require('../../models/GymGoerModel');
const {TEST_DATABASE_URL, JWT_SECRET, JWT_EXPIRY} = require('../../config');

chai.use(chaiHttp);

const BASE_API_URL = '/gym-tracker';
const TEST_EMAIL = 'alex@bandisch.com';
const COOKIE_NAME = 'gymGoer';

const createTestGymGoer = (email) => {
  return GymGoerModel.createGymGoer(email);
};
const createCookieData = (gymGoerId = '5a8409c307a3b762ac1a6ba4') => {
  const gymGoer = { id: gymGoerId, email: TEST_EMAIL };
  const jwtAuthToken = jwt.sign({gymGoer}, JWT_SECRET, {
    subject: TEST_EMAIL,
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256'
  });
  return JSON.stringify({
    email: TEST_EMAIL,
    jwt_token: jwtAuthToken
  });
};
const addTestExercise = (gymGoerId, sessionType, sessionDate, exerciseName, sets = []) => {
  return GymGoerExercisesModel.create({
    gymGoerId: gymGoerId,
    sessionType: sessionType,
    sessionDate: sessionDate,
    exerciseName: exerciseName,
    sets: sets
  });
}

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

  describe('# gymTrackerRouter: /gym-tracker/init-training-session', function () {
    it('should return an initialised exercise session for the gym goer', function () {
      const TEST_TRAINING_SESSION = 'chest';
      return chai.request(app)
        .post(`${BASE_API_URL}/init-training-session`)
        .send({sessionType: TEST_TRAINING_SESSION})
        .set('Cookie', `${COOKIE_NAME}=${createCookieData()}`)
        .then(res => {
          expect(res).status(200);
          expect(res.body).to.have.keys(['sessionType', 'sessionDate', 'exercises']);
          expect(res.body.sessionType).to.equal(TEST_TRAINING_SESSION);
        });
    });
  });

  describe('# gymTrackerRouter: /gym-tracker/add-exercise', function () {
    it('should return a session with the new exercise added', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME = 'bench press';
      let cookieData;
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => {
          return chai.request(app)
            .post(`${BASE_API_URL}/add-exercise`)
            .send({sessionType: TEST_SESSION_TYPE, exerciseName: TEST_EXERCISE_NAME})
            .set('Cookie', `${COOKIE_NAME}=${createCookieData(gymGoer.id)}`)
            .then(res => {
              expect(res).status(200);
              expect(res.body).to.have.keys(['sessionType', 'sessionDate', 'exercises']);
              expect(res.body.sessionType).to.equal(TEST_SESSION_TYPE);
              expect(res.body.exercises.length).to.equal(1);
              expect(res.body.exercises[0].name).to.equal(TEST_EXERCISE_NAME);
            });
        });
    });
  });

  describe('# gymTrackerRouter: /gym-tracker/add-exercise-set', function () {
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
            .post(`${BASE_API_URL}/add-exercise-set`)
            .send({sessionType: TEST_SESSION_TYPE, exerciseName: TEST_EXERCISE_NAME, newSet: TEST_SET})
            .set('Cookie', `${COOKIE_NAME}=${createCookieData(gymGoer.id)}`)
            .then(res => {
              expect(res).status(200);
              expect(res.body).to.have.keys(['sessionType', 'sessionDate', 'exercises']);
              expect(res.body.sessionType).to.equal(TEST_SESSION_TYPE);
              expect(res.body.exercises.length).to.equal(1);
              expect(res.body.exercises[0].name).to.equal(TEST_EXERCISE_NAME);
              expect(res.body.exercises[0].sets.length).to.equal(1);
              expect(res.body.exercises[0].sets[0]).to.have.keys(['_id', 'setNumber', 'weight', 'reps'])
            });
        });
    });
  });
});