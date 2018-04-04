const expect = require('chai').expect;
const mongoose = require('mongoose');
const {TEST_DATABASE_URL} = require('../../config');
const {GymGoerModel, GymGoerExercisesModel} = require('../../models/GymGoerModel');

mongoose.Promise = global.Promise;

const createTestGymGoer = (email) => {
  return GymGoerModel.createGymGoer(email);
};
const findTestGymGoer = (email) => {
  return GymGoerModel.findGymGoerByEmail(email);
};
const addTestTrainingSession = (gymGoerId, sessionType) => {
  return GymGoerExercisesModel.addTrainingSession(gymGoerId, sessionType);
};
const addTestSessionForGymGoer = (sessionType) => {
  return (gymGoer) => addTestTrainingSession(gymGoer.id, sessionType).then(() => gymGoer);
};
function addPreviousTestExercise(gymGoerId, sessionType, sessionDate, exerciseName, sets = []) {
  return GymGoerExercisesModel.create({
    gymGoerId: gymGoerId,
    sessionType: sessionType,
    sessionDate: sessionDate,
    exerciseName: exerciseName,
    sets: sets
  });
}
function toReadableISODate(date) {
  return new Date(date).toISOString().split('T')[0];
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const TEST_EMAIL = 'alex@bandisch.com';

describe('# GymGoerExerciseModel', function () {
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

  // Test Dates
  let oneWeekAgoDate = new Date();
  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7);

  let twoWeeksAgoDate = new Date();
  twoWeeksAgoDate.setDate(oneWeekAgoDate.getDate() - 7);

  describe('# GymGoerExercisesModel.findLastExercisesForSessionType', function () {
    it('should return an exercise object from a previous session', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'dips';
      const TEST_EXERCISE_NAME_3 = 'inclined bench press';
      const TEST_SET_1 = [{ setNumber: 1, weight: "40", reps: 10 }, { setNumber: 2, weight: "40", reps: 11 }, { setNumber: 3, weight: "40", reps: 10 }];
      const TEST_SET_2 = [{ setNumber: 1, weight: "50", reps: 12 }, { setNumber: 2, weight: "50", reps: 12 }, { setNumber: 3, weight: "52", reps: 10 }];
      const TEST_SET_3 = [{ setNumber: 1, weight: "Body Weight", reps: 12 }, { setNumber: 2, weight: "Body Weight", reps: 11 }, { setNumber: 3, weight: "Body Weight", reps: 10 }];
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        // exercises two weeks ago
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_1, TEST_SET_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_2, TEST_SET_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_3, TEST_SET_3))
        // exercise one week ago
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1, TEST_SET_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2, TEST_SET_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3, TEST_SET_3))
        .then((() => GymGoerExercisesModel.findSinglePreviousExerciseForSessionType(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_2)))
        .then((exercise) => {
          expect(exercise).to.be.a('object');
          expect(exercise.sessionType).to.equal(TEST_SESSION_TYPE);
          expect(toReadableISODate(exercise.sessionDate)).to.equal(toReadableISODate(oneWeekAgoDate));
          expect(exercise).to.contain.keys(['sessionDate', 'exerciseName', 'sets', 'gymGoerId', 'sessionType' ]);
        })
    });
    it('should return null if no previous exercise is found', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then((() => GymGoerExercisesModel.findSinglePreviousExerciseForSessionType(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1)))
        .then((exercise) => {
          expect(exercise).to.equal(null);
        })
    });
  });

  describe('# GymGoerExercisesModel.attachLastBestSetToSingleExercise', function () {
    it('should add lastBestSet object to the exercise object', function () {
      let gymGoer;
      const TODAY = new Date();
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'dips';
      const TEST_EXERCISE_NAME_3 = 'inclined bench press';
      const TEST_SET_1 = [{ setNumber: 1, weight: "40", reps: 10 }, { setNumber: 2, weight: "40", reps: 11 }, { setNumber: 3, weight: "40", reps: 10 }];
      const TEST_SET_2 = [{ setNumber: 1, weight: "50", reps: 12 }, { setNumber: 2, weight: "50", reps: 12 }, { setNumber: 3, weight: "52", reps: 10 }];
      const TEST_SET_3 = [{ setNumber: 1, weight: "Body Weight", reps: 12 }, { setNumber: 2, weight: "Body Weight", reps: 11 }, { setNumber: 3, weight: "Body Weight", reps: 10 }];
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        // exercises two weeks ago
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_1, TEST_SET_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_2, TEST_SET_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_3, TEST_SET_3))
        // exercises one week ago
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1, TEST_SET_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2, TEST_SET_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3, TEST_SET_3))
        // exercises today
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_3))
        .then(() => GymGoerExercisesModel.findExercisesForToday(gymGoer.id, TEST_SESSION_TYPE))
        .then((exercises => GymGoerExercisesModel.attachLastBestSetToSingleExercise(exercises[0])))
        .then(updatedExercise => {
          expect(toReadableISODate(updatedExercise.sessionDate)).to.equal(toReadableISODate(TODAY));
          expect(updatedExercise.sessionType).to.equal(TEST_SESSION_TYPE);
          expect(updatedExercise.lastBestSet).to.be.a('object');
          expect(updatedExercise.lastBestSet).to.have.keys(['sessionDate', 'weight', 'reps']);
          expect(toReadableISODate(updatedExercise.lastBestSet.sessionDate)).to.equal(toReadableISODate(oneWeekAgoDate))
        });
    });
    it('should add an empty lastBestSet object to the exercise object', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'dips';
      const TEST_EXERCISE_NAME_3 = 'inclined bench press';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3))
        .then(() => GymGoerExercisesModel.findAllPreviousExercisesForSessionType(TEST_SESSION_TYPE, gymGoer.id))
        .then((exercises => GymGoerExercisesModel.attachLastBestSetToSingleExercise(exercises[0])))
        .then(exercise => {
          expect(exercise.lastBestSet).to.be.a('object');
          expect(exercise.lastBestSet).to.be.empty;
        });
    });
  });

  describe('# GymGoerExercisesModel.attachLastBestSetToMultipleExercises', function () {
    it('should add lastBestSet object to the exercise object', function () {
      let gymGoer;
      const TODAY = new Date();
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'dips';
      const TEST_EXERCISE_NAME_3 = 'inclined bench press';
      const TEST_SET_1 = [{ setNumber: 1, weight: "40", reps: 10 }, { setNumber: 2, weight: "40", reps: 11 }, { setNumber: 3, weight: "40", reps: 10 }];
      const TEST_SET_2 = [{ setNumber: 1, weight: "50", reps: 12 }, { setNumber: 2, weight: "50", reps: 12 }, { setNumber: 3, weight: "52", reps: 10 }];
      const TEST_SET_3 = [{ setNumber: 1, weight: "Body Weight", reps: 12 }, { setNumber: 2, weight: "Body Weight", reps: 11 }, { setNumber: 3, weight: "Body Weight", reps: 10 }];
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        // exercises two weeks ago
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_1, TEST_SET_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_2, TEST_SET_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_3, TEST_SET_3))
        // exercises one week ago
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1, TEST_SET_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2, TEST_SET_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3, TEST_SET_3))
        // exercises today
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_3))
        .then(() => GymGoerExercisesModel.findExercisesForToday(gymGoer.id, TEST_SESSION_TYPE))
        .then((exercises => GymGoerExercisesModel.attachLastBestSetToMultipleExercises(exercises)))
        .then(updatedExercises => {
          expect(updatedExercises.length).to.equal(3);
          updatedExercises.forEach(exercise => {
            expect(toReadableISODate(exercise.sessionDate)).to.equal(toReadableISODate(TODAY));
            expect(exercise.sessionType).to.equal(TEST_SESSION_TYPE);
            expect(exercise.lastBestSet).to.be.a('object');
            expect(exercise.lastBestSet).to.have.keys(['sessionDate', 'weight', 'reps']);
            expect(toReadableISODate(exercise.lastBestSet.sessionDate)).to.equal(toReadableISODate(oneWeekAgoDate))
          });
        });
    });
    it('should add an empty lastBestSet object to the exercise object', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'dips';
      const TEST_EXERCISE_NAME_3 = 'inclined bench press';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3))
        .then(() => GymGoerExercisesModel.findAllPreviousExercisesForSessionType(TEST_SESSION_TYPE, gymGoer.id))
        .then((exercises => GymGoerExercisesModel.attachLastBestSetToMultipleExercises(exercises)))
        .then(updatedExercises => {
          expect(updatedExercises.length).to.equal(3);
          updatedExercises.forEach(exercise => {
            expect(exercise.lastBestSet).to.be.a('object');
            expect(exercise.lastBestSet).to.be.empty;
          });
        });
    });
  });

  describe('# GymGoerExercisesModel.initSessionExercises', function () {
    it('should return a session object with exercises from a previous session', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'dips';
      const TEST_EXERCISE_NAME_3 = 'inclined bench press';
      const ISODateToday = new Date().toISOString().slice(0, 10);
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3))
        .then(() => GymGoerExercisesModel.initSessionExercises(gymGoer.id, TEST_SESSION_TYPE, ISODateToday))
        .then(session => {
          expect(session.exercises.length).to.equal(3);
          expect(session.sessionType).to.equal(TEST_SESSION_TYPE)
        });
    });
    it ('should return session object with exercises from today', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'dips';
      const TEST_EXERCISE_NAME_3 = 'inclined bench press';
      const TEST_DATE_TODAY = new Date();
      let ISODateToday = TEST_DATE_TODAY.toISOString().slice(0, 10);
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TEST_DATE_TODAY, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TEST_DATE_TODAY, TEST_EXERCISE_NAME_2))
        .then(() => GymGoerExercisesModel.initSessionExercises(gymGoer.id, TEST_SESSION_TYPE, ISODateToday))
        .then(session => {
          expect(session.exercises.length).to.equal(2);
          expect(session.sessionType).to.equal(TEST_SESSION_TYPE)
        });
    });
    it('should return a session object with an empty exercises array', function () {
      const TEST_SESSION_TYPE = 'chest';
      let gymGoer;
      const ISODateToday = new Date().toISOString().slice(0, 10);
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => GymGoerExercisesModel.initSessionExercises(gymGoer.id, TEST_SESSION_TYPE, ISODateToday))
        .then(session => {
          expect(session.exercises.length).to.equal(0);
          expect(session.sessionType).to.equal(TEST_SESSION_TYPE)
        });
    })
  });

  describe('# GymGoerExercisesModel.addNewExercise', function () {
    it('should add a new exercise to the Gym Goer\'s session and return the session', function () {
      let gymGoer;
      const TEST_SESSION_TYPE = 'legs';
      const TEST_EXERCISE_NAME_1 = "leg press";
      const TEST_EXERCISE_NAME_2 = "squats";
      const TEST_EXERCISE_NAME_3 = "deadlift";
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => GymGoerExercisesModel.addNewExercise(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1))
        .then(() => sleep(100)) // add some time between insert, per real life
        .then(() => GymGoerExercisesModel.addNewExercise(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_2))
        .then(() => sleep(100)) // add some time between insert, per real life
        .then(() => GymGoerExercisesModel.addNewExercise(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_3))
        .then(session => {
          expect(session.exercises.length).to.equal(3);
          expect(session.exercises[0].name).to.equal(TEST_EXERCISE_NAME_3);
          expect(session.exercises[1].name).to.equal(TEST_EXERCISE_NAME_2);
          expect(session.exercises[2].name).to.equal(TEST_EXERCISE_NAME_1);
          expect(session.sessionType).to.equal(TEST_SESSION_TYPE);
        })
        .then(() => GymGoerExercisesModel.find({"gymGoerId": gymGoer.id, "sessionType": TEST_SESSION_TYPE}))
        .then((sessionFromDB) => {
          expect(sessionFromDB.length).to.equal(3);
          expect(sessionFromDB[0].sessionType).to.equal(TEST_SESSION_TYPE);
        })
    });
  });

  describe('# GymGoerExercisesModel.findAllPreviousExercisesForSessionType', function () {

    it('should return an array of exercises from the last training session', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'inclined bench press';
      const TEST_EXERCISE_NAME_3 = 'dips';

      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME_3))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, twoWeeksAgoDate, TEST_EXERCISE_NAME_3))
        .then(() => GymGoerExercisesModel.findAllPreviousExercisesForSessionType(TEST_SESSION_TYPE, gymGoer.id))
        .then((exercises) => {
          exercises.forEach(exercise => {
            expect(toReadableISODate(exercise.sessionDate)).to.equal(toReadableISODate(oneWeekAgoDate))
            expect(exercise.sessionType).to.equal(TEST_SESSION_TYPE);
            expect(exercise.gymGoerId.toString()).to.equal(gymGoer.id.toString());
          });
          expect(exercises.length).to.equal(3);
        });
    });
    it('should return an empty array where there is no previous exercises for the session type', function () {
      let gymGoer;
      const REQUIRED_SESSION_TYPE = 'chest';
      const OTHER_SESSION_TYPE = 'legs';
      const TEST_EXERCISE_NAME = 'leg press';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, OTHER_SESSION_TYPE, oneWeekAgoDate, TEST_EXERCISE_NAME))
        .then(() => GymGoerExercisesModel.findAllPreviousExercisesForSessionType(REQUIRED_SESSION_TYPE, gymGoer.id))
        .then((exercises) => {
          expect(exercises.length).to.equal(0);
        });
    });
  });

  describe('# GymGoerExercisesModel.hasExistingTrainingSessionToday', function () {
    it('should return true if there is an existing training session for today', function () {
      const SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME = 'bench press';
      const TODAY = new Date();
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, SESSION_TYPE, TODAY, TEST_EXERCISE_NAME))
        .then(() => GymGoerExercisesModel.hasExistingTrainingSessionToday(SESSION_TYPE, gymGoer))
        .then((result) => {
          expect(result).to.be.equal(true);
        });
    });
    it('should return false if there is no existing training session for today', function () {
      const SESSION_TYPE = 'chest';
      const OTHER_SESSION_TYPE = 'legs';
      const TEST_EXERCISE_NAME = 'bench press';
      const TODAY = new Date();
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, OTHER_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME))
        .then(() => GymGoerExercisesModel.hasExistingTrainingSessionToday(SESSION_TYPE, gymGoer))
        .then((result) => {
          expect(result).to.be.equal(false);
        });
    });
  });

  describe('# GymGoerExercisesModel.flattenExercises', function () {
    it('should return an object containing the session details and an array of exercises', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'inclined bench press';
      const TEST_EXERCISE_NAME_3 = 'dips';
      const TODAY = new Date();
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_2))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_3))
        .then(() => GymGoerExercisesModel.findExercisesForToday(gymGoer.id, TEST_SESSION_TYPE))
        .then((exercises) => GymGoerExercisesModel.flattenExercises(exercises))
        .then((exerciseSession) => {
          expect(exerciseSession.sessionType).to.equal(TEST_SESSION_TYPE);
          expect(exerciseSession.exercises.length).to.equal(3);
          expect(toReadableISODate(exerciseSession.sessionDate)).to.equal(toReadableISODate(TODAY));
        });
    });
    it('should return null if no array of exercises is provided', function () {
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => GymGoerExercisesModel.flattenExercises([]))
        .then((exerciseSession) => {
          expect(exerciseSession).to.equal(null);
        });
    });

  });

  describe('# GymGoerExercisesModel.addNewSet', function () {
    it('should assign the setNumber to the set, add a new set to the exercise and return the updated exercise session', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'inclined bench press';
      const TEST_SET = {
        weight: "40",
        reps: 12
      };
      const TODAY = new Date();

      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_2))
        .then(() => GymGoerExercisesModel.addNewSet(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1, TEST_SET))
        .then(() => GymGoerExercisesModel.addNewSet(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1, TEST_SET))
        .then((exerciseSession) => {
          expect(exerciseSession.sessionType).to.equal(TEST_SESSION_TYPE);
          expect(exerciseSession.exercises.length).to.equal(2);
          expect(exerciseSession.exercises[0].sets.length).to.equal(2);
          expect(exerciseSession.exercises[1].sets.length).to.equal(0);
          expect(toReadableISODate(exerciseSession.sessionDate)).to.equal(toReadableISODate(TODAY));
          expect(exerciseSession.exercises[0].name).to.equal(TEST_EXERCISE_NAME_1);
          expect(exerciseSession.exercises[0].sets[0].setNumber).to.equal(1);
          expect(exerciseSession.exercises[0].sets[0].weight).to.equal("40");
          expect(exerciseSession.exercises[0].sets[0].reps).to.equal(12);
        });
    });
  });

  describe('# GymGoerExercisesModel.deleteExerciseSetById', function () {
    it('should return true when deleting the exercise set with the given id', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'inclined bench press';
      const TEST_SET = {
        weight: "40",
        reps: 12
      };
      const TODAY = new Date();
      let exerciseSetId;
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_2))
        .then(() => GymGoerExercisesModel.addNewSet(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1, TEST_SET))
        .then(() => GymGoerExercisesModel.addNewSet(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1, TEST_SET))
        .then(exerciseSession => {
          exerciseSetId = exerciseSession.exercises[0].sets[0].id;
        })
        .then(() => GymGoerExercisesModel.deleteExerciseSetById(exerciseSetId))
        .then((deleteResult) => {
          expect(deleteResult).to.equal(true);
        });
    });
    it('should return false when trying to delete the exercise set with and invalid id', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME_1 = 'bench press';
      const TEST_EXERCISE_NAME_2 = 'inclined bench press';
      const TEST_SET = {
        weight: "40",
        reps: 12
      };
      const TODAY = new Date();
      const INVALID_EXERCISE_SET_ID = '555aaaa555000c292a5c1111';
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_1))
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME_2))
        .then(() => GymGoerExercisesModel.addNewSet(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1, TEST_SET))
        .then(() => GymGoerExercisesModel.addNewSet(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAME_1, TEST_SET))
        .then(() => GymGoerExercisesModel.deleteExerciseSetById(INVALID_EXERCISE_SET_ID))
        .then((deleteResult) => {
          expect(deleteResult).to.equal(false);
        });
    });
  });

  describe('# GymGoerExercisesModel.updateExerciseSetById', function () {
    it('should return true after updating the exercise set with the given id', function () {
      const TEST_SESSION_TYPE = 'chest';
      const TEST_EXERCISE_NAME = 'bench press';
      const TEST_SETS = [{
          setNumber: 1,
          weight: "40",
          reps: 12
        },
        {
          setNumber: 2,
          weight: "40",
          reps: 13
        }];
      const UPDATED_SET = {
        setNumber: 1,
        weight: "body weight",
        reps: 10
      };
      const TODAY = new Date();
      let exerciseSetId;
      let gymGoer;
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => addPreviousTestExercise(gymGoer.id, TEST_SESSION_TYPE, TODAY, TEST_EXERCISE_NAME, TEST_SETS))
        .then(() => GymGoerExercisesModel.findExercisesForToday(gymGoer.id, TEST_SESSION_TYPE))
        .then(exercises => exerciseSetId = exercises[0].sets[0].id)
        .then(() => GymGoerExercisesModel.updateExerciseSetById(exerciseSetId, UPDATED_SET))
        .then((results) => expect(results).to.equal(true))
        .then(() => GymGoerExercisesModel.find({"gymGoerId": gymGoer.id}))
        .then(exercises => {
          expect(exercises[0].sets[0]).to.be.a('object');
          expect(exercises[0].sets[0].setNumber).to.equal(1);
          expect(exercises[0].sets[0].weight).to.equal('body weight');
          expect(exercises[0].sets[0].reps).to.equal(10);
        });
    });
  });

  describe('# GymGoerExercisesModel.addMultipleNewExercises', function () {
    function createMultipleExercises(gymGoerId, sessionType, exerciseNameArray) {
      return new Promise((resolve, reject) => {
        resolve(exerciseNameArray.map(exercise => ({
          gymGoerId: gymGoerId,
          sessionType: sessionType,
          exerciseName: exercise,
          sets: []
        })));
      })
    }
    it('it should insert an array of new exercises for today and return the exercise session', function () {
      let gymGoer;
      const TEST_EXERCISE_NAMES = ['bench press', 'dumbbell curls', 'dips'];
      const TEST_SESSION_TYPE = 'chest';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => createMultipleExercises(gymGoer.id, TEST_SESSION_TYPE, TEST_EXERCISE_NAMES))
        .then((multipleExercises) => GymGoerExercisesModel.addMultipleNewExercises(gymGoer.id, TEST_SESSION_TYPE, multipleExercises))
        .then(session => {
          expect(session.exercises.length).to.equal(3);
          expect(session.sessionType).to.equal(TEST_SESSION_TYPE);
        })
        .then(() => GymGoerExercisesModel.find({"gymGoerId": gymGoer.id, "sessionType": TEST_SESSION_TYPE}))
        .then((sessionFromDB) => {
          expect(sessionFromDB.length).to.equal(3);
          expect(sessionFromDB[0].sessionType).to.equal(TEST_SESSION_TYPE);
        })
    });
  });
});

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

  describe('# GymGoerModel.createGymGoer', function () {

    it('should throw an Error is the email is not provided', function () {
      return createTestGymGoer()
        .catch(err => expect(err).to.be.an.instanceOf(Error));
    });

    it('should throw an Error is the email is an empty string', function () {
      return createTestGymGoer("")
        .catch(err => expect(err).to.be.an.instanceOf(Error));
    });

    it('should throw an Error if the email address is already in the database', function () {
      return createTestGymGoer(TEST_EMAIL)
        .then(() => createTestGymGoer(TEST_EMAIL))
        .catch(err => expect(err).to.be.an.instanceOf(Error));
    });

    it('should create and provide the newly created, serialized GymGoer', function () {
      return createTestGymGoer(TEST_EMAIL)
        .then(gymGoer => {
          expect(gymGoer).to.be.an.instanceOf(Object);
          expect(gymGoer).to.have.keys(['id', 'email', 'strengthTracker']);
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
          expect(gymGoer).to.have.keys(['id', 'email', 'strengthTracker']);
        });
    });
  });
});
