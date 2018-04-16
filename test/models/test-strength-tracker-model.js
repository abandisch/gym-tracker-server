const expect = require('chai').expect;
const mongoose = require('mongoose');
const {TEST_DATABASE_URL} = require('../../config');
const {StrengthTrackerExerciseModel} = require('../../models/StrengthTrackerExerciseModel');
const {GymGoerModel} = require('../../models/GymGoerModel');

const createTestGymGoer = (email) => {
  return GymGoerModel.createGymGoer(email);
};

function createTestExercise(gymGoerId, STProgramId, STExerciseId, sets = []) {
  return StrengthTrackerExerciseModel.create({
    gymGoerId: gymGoerId,
    strTrkProgramId: STProgramId,
    strTrkExerciseId: STExerciseId,
    sets: sets
  });
}

const TEST_EMAIL = 'alex@bandisch.com';

describe('# StrengthTrackerExerciseModel', function () {
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

  describe('# StrengthTrackerExerciseModel.isExistingExercise', function () {
    it('returns true if the strength tracker exercise id and corresponding gymgoer id is found', function () {
      let gymGoer;
      const STExerciseId = '46d06ad2-8364-462d-89c7-77bd0edc46af';
      const STProgramId = '46d06ad2-8364-462d-89c7-54sefsfv3uj2';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => createTestExercise(gymGoer.id, STProgramId, STExerciseId))
        .then(() => StrengthTrackerExerciseModel.isExistingExercise(gymGoer.id, STProgramId, STExerciseId))
        .then(result => {
          expect(result).to.be.true;
        })
    });

    it('returns false if the strength tracker exercise id and corresponding gymgoer id is not found', function () {
      let gymGoer;
      const STExerciseId = '46d06ad2-8364-462d-89c7-77bd0edc46af';
      const STProgramId = '46d06ad2-8364-462d-89c7-54sefsfv3uj2';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => StrengthTrackerExerciseModel.isExistingExercise(gymGoer.id, STProgramId, STExerciseId))
        .then(result => {
          expect(result).to.be.false;
        })
    });
  });

  describe('# StrengthTrackerExerciseModel.addExercise', function () {
    it('returns the serialized exercise after adding it', function () {
      let gymGoer;
      const STExerciseId = '46d06ad2-8364-462d-89c7-77bd0edc46af';
      const STProgramId = '46d06ad2-8364-462d-89c7-54sefsfv3uj2';
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => StrengthTrackerExerciseModel.addExercise(gymGoer.id, STProgramId, STExerciseId))
        .then(result => {
          expect(result).to.be.a('object');
          expect(result).to.have.keys(['id', 'gymGoerId', 'strTrkProgramId', 'strTrkExerciseId', 'sets'])
        })
    });
  });

  describe('# StrengthTrackerExerciseModel.addExerciseSet', function () {
    it('returns the serialized exercise after adding a new set to it', function () {
      let gymGoer;
      const STExerciseId = '46d06ad2-8364-462d-89c7-77bd0edc46af';
      const STProgramId = '46d06ad2-8364-462d-89c7-54sefsfv3uj2';
      const newSet1 = { weight: '10', reps: 5 };
      const newSet2 = { weight: '11', reps: 15 };
      return createTestGymGoer(TEST_EMAIL)
        .then(_gymGoer => gymGoer = _gymGoer)
        .then(() => StrengthTrackerExerciseModel.addExerciseSet(gymGoer.id, STProgramId, STExerciseId, newSet1))
        .then(() => StrengthTrackerExerciseModel.addExerciseSet(gymGoer.id, STProgramId, STExerciseId, newSet2))
        .then(result => {
          expect(result).to.be.a('object');
          expect(result.sets.length).to.equal(2);
          expect(result).to.have.keys(['id', 'gymGoerId', 'strTrkProgramId', 'strTrkExerciseId', 'sets'])
        })
    });
  });
});
