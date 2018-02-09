const expect = require('chai').expect;
const mongoose = require('mongoose');
const {TEST_DATABASE_URL} = require('../../config');
const {GymGoerModel} = require('../../models/GymGoerModel');

mongoose.Promise = global.Promise;

describe('# GymGoerModel', function () {

  // Connect to the database
  before(function () {
    return new Promise((resolve, reject) => {
      mongoose.connect(TEST_DATABASE_URL, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  });

  // Clean the database before each test
  beforeEach(function () {
    return mongoose.connection.dropDatabase();
  });

  // Disconnect from the database
  after(function () {
    return mongoose.disconnect();
  });

  const TEST_EMAIL = 'alex@bandisch.com';

  const createTestGymGoer = (email) => {
    return GymGoerModel.createGymGoer(email);
  };

  const findTestGymGoer = (email) => {
    return GymGoerModel.findGymGoerByEmail(email);
  };

  const addTestTrainingSession = (gymGoerId, sessionType) => {
    return GymGoerModel.addTrainingSession(gymGoerId, sessionType);
  };

  const addTestSessionForGymGoer = (sessionType) => {
    return (gymGoer) => addTestTrainingSession(gymGoer.id, sessionType).then(() => gymGoer);
  };

  const initTestTrainingSession = (gymGoerId, sessionType) => {
    return GymGoerModel.initTrainingSession(gymGoerId, sessionType);
  };

  describe('# GymGoerModel.createGymGoer', function () {

    it('should throw an Error is the email is not provided', function () {
      return createTestGymGoer()
        .catch(err => {
          expect(err).to.be.an.instanceOf(Error);
        });
    });

    it('should throw an Error is the email is an empty string', function () {
      return createTestGymGoer("")
        .catch(err => {
          expect(err).to.be.an.instanceOf(Error);
        });
    });

    it('should throw an Error if the email address is already in the database', function () {
      return createTestGymGoer(TEST_EMAIL)
        .then(() => createTestGymGoer(TEST_EMAIL))
        .catch(err => {
          expect(err).to.be.an.instanceOf(Error);
        });
    });

    it('should create and provide the newly created, serialized GymGoer', function () {
      return createTestGymGoer(TEST_EMAIL)
        .then(gymGoer => {
          expect(gymGoer).to.be.an.instanceOf(Object);
          expect(gymGoer).to.have.keys(['id', 'email', 'trainingSessions']);
        });
    });

  });

  describe('# GymGoerModel.findGymGoerByEmail', function () {

    it('should throw an Error if no email is provided', function () {
      return findTestGymGoer()
        .catch(err => expect(err).to.be.an.instanceOf(Error));
    });

    it('should return null if it cannot find the GymGoer by email', function () {
      return findTestGymGoer(TEST_EMAIL)
        .then(gymGoer => expect(gymGoer).to.be.equal(null));
    });

    it('should find GymGoer by email and provide a serialised GymGoer', function () {
      let gymGoerID;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoerID = _gymGoer.id)
        .then(() => findTestGymGoer(TEST_EMAIL))
        .then(gymGoer => {
          expect(gymGoer).to.be.an.instanceOf(Object);
          expect(gymGoer).to.have.keys(['id', 'email', 'trainingSessions']);
        });
    });

  });

  describe('# GymGoerModel.addTrainingSession', function () {

    it('should throw an Error if the GymGoer ID does not exist in the database', function () {
      return GymGoerModel
        .addTrainingSession('5a777eed2f47b02f9d01757c', 'chest')
        .catch(err => {
          expect(err).to.be.an.instanceOf(Error);
        });
    });

    it('should throw an Error if the GymGoer ID is not an ObjectID', function () {
      return GymGoerModel
        .addTrainingSession('banana', 'chest')
        .catch(err => {
          expect(err).to.be.an.instanceOf(Error);
        });
    });

    it('should add a training session if it does NOT exist for today and return the session object', function () {
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addTestTrainingSession(gymGoer.id, 'chest'))
        .then(session => {
          expect(session).to.be.an.instanceOf(Object);
          expect(session).to.have.keys(['sessionDate', 'exercises', 'sessionType']);
          return GymGoerModel.findById(gymGoer.id)
        })
        .then(dbGymGoer => expect(dbGymGoer.trainingSessions.length).to.be.equal(1));
    });

    it('should not add a training session if one for today already exist and return the session object', function () {
      return createTestGymGoer(TEST_EMAIL)
        // .then(_gymGoer => gymGoer = _gymGoer)
        // .then(() => addTestTrainingSession(gymGoer.id, 'chest'))
        // .then(() => addTestTrainingSession(gymGoer.id, 'chest'))
        .then(addTestSessionForGymGoer('chest'))
        .then(addTestSessionForGymGoer('chest'))
        .then((gymGoer) => GymGoerModel.findById(gymGoer.id))
        .then(gGoer => gGoer.serializeAll())
        .then(dbGymGoer => {
              expect(dbGymGoer.trainingSessions.length).to.be.equal(1);
        });
    });
  });

  describe('# GymGoerModel.validateParameters', function () {
    it('should return true if all parameters are not undefined', function () {
      const parameter1 = 'test1';
      const parameter2 = 'test2';
      GymGoerModel
        .validateParameters([parameter1, parameter2], 'test message')
        .then(result => {
          expect(result).to.equal(true);
        });
    });
    it('should throw an Error if one or all parameters are undefined', function () {
      const parameter1 = 'test1';
      const parameter2 = undefined;
      GymGoerModel
        .validateParameters([parameter1, parameter2], 'All parameters are required')
        .catch(result => {
          expect(result).to.be.an.instanceOf(Error);
        });
    });
    it('should throw an Error if all parameters are undefined', function () {
      const parameter1 = undefined;
      GymGoerModel
        .validateParameters([parameter1], 'All parameters are required')
        .catch(result => {
          expect(result).to.be.an.instanceOf(Error);
        });
    });
  });

  describe('# GymGoerModel.initSessionExercises', function () {
    it('should provide empty exercises session', function () {
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addTestTrainingSession(gymGoer.id, 'chest'))
        .then(() => GymGoerModel.initSessionExercises(gymGoer.id, 'chest'))
        .then(sessionExercises => expect(sessionExercises.length).to.equal(0));
    });
  });

  describe('# GymGoerModel.initTrainingSession', function () {
    it('should initialise a training session for a gym goer', function () {
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => initTestTrainingSession(gymGoer.id, 'chest'))
        .then(initialisedSession => {
          const dateToday = new Date().toISOString().split('T')[0];
          const dateSession = new Date(initialisedSession.sessionDate).toISOString().split('T')[0];
          expect(initialisedSession).to.be.a('object');
          expect(initialisedSession).to.have.keys(['sessionDate', 'exercises', 'sessionType']);
          expect(dateSession).to.equal(dateToday);
        });
    })
  });

  describe('# GymGoerModel.addExercises', function () {
    it('should add the exercises to the Gym Goer and return the added exercises', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'legs';
      const startToday = new Date().setHours(0,0,0,0);
      const endToday = new Date().setHours(23,59,59,999);
      const TEST_EXERCISES = [ {
          name: "leg press",
          sets: []
        }, {
          name: "barbell squat",
          sets: []
        }, {
          name: "split squats",
          sets: []
        } ];
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => initTestTrainingSession(gymGoer.id, TEST_SESSION_TYPE))
        .then(initialisedSession => GymGoerModel.addExercises(gymGoer.id, initialisedSession.sessionType, TEST_EXERCISES))
        .then(() => GymGoerModel.findOne({
            $and : [
              {"_id": gymGoer.id}, {trainingSessions: { $elemMatch: { sessionType: TEST_SESSION_TYPE, sessionDate: {$gte: startToday, $lt: endToday} } } }
            ]
          }))
        .then((gymGoer) => {
          gymGoer.trainingSessions[0].exercises.forEach((exercise, index) => {
            expect(exercise.sets.length).to.equal(0);
            expect(exercise.name).to.equal(TEST_EXERCISES[index].name);
          });
          expect(gymGoer.trainingSessions[0].exercises.length).to.equal(3);
        })
      });
    });
  });
