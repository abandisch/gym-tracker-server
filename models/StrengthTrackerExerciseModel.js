'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const strengthTrackerExerciseSchema = mongoose.Schema({
  gymGoerId: {type: mongoose.Schema.Types.ObjectId, required: true},
  strTrkProgramId: {type: String, required: true},
  strTrkExerciseId: {type: String, required: true},
  sets: [
    {
      setNumber: {type: Number, required: true},
      weight: {type: String, required: true},
      reps: {type: Number, required: true}
    }
  ]
});

strengthTrackerExerciseSchema.methods.serialize = function () {
  return {
    id: this._id,
    gymGoerId: this.gymGoerId,
    strTrkProgramId: this.strTrkProgramId,
    strTrkExerciseId: this.strTrkExerciseId,
    sets: this.sets.map(set => ({id: set._id, setNumber: set.setNumber, weight: set.weight, reps: set.reps}))
  };
};

strengthTrackerExerciseSchema.statics.isExistingExercise = function(gymGoerId, STProgramId, STExerciseId) {
  return this.findOne({
    "gymGoerId": gymGoerId,
    "strTrkProgramId": STProgramId,
    "strTrkExerciseId": STExerciseId
  })
  .then(exercise => !!exercise);
}

/**
 * Adds a single new exercise with no sets for the given GymGoer
 * @param {string} gymGoerId - GymGoer ID
 * @param {string} STProgramId - Strength Tracker program id
 * @param {string} STExerciseId - Strength Tracker exercise id
 * @returns {Promise} - Serialized exercise
 */
strengthTrackerExerciseSchema.statics.addExercise = function(gymGoerId, STProgramId, STExerciseId) {
  return this.findOne(
    { 
      "gymGoerId": gymGoerId,
      "strTrkProgramId": STProgramId,
      "strTrkExerciseId": STExerciseId 
    })
    .then(exercise => {
      if (exercise === null) {
        return this.create({
          gymGoerId: gymGoerId,
          strTrkProgramId: STProgramId,
          strTrkExerciseId: STExerciseId,
          sets: []
        })
        .then(_exercise => _exercise.serialize());
      } else {
        return exercise.serialize();
      }
    });
};

/**
 * Adds a new Set to the exercise
 * @param {String} gymGoerId - GymGoer Id
 * @param {string} STProgramId - Strength Tracker program id
 * @param {String} STExerciseId - Strenght Tracker Id of the exercise
 * @param {Object} newSet - Object containing the details of the new set { weight, reps }
 * @returns {Promise} - Serialized exercise with new set
 */
strengthTrackerExerciseSchema.statics.addExerciseSet = function (gymGoerId, STProgramId, STExerciseId, newSet) {
  let setNumber;

  return this.addExercise(gymGoerId, STProgramId, STExerciseId)
          /* .then(() =>   this.findOne({
            "gymGoerId": gymGoerId,
            "strTrkProgramId": STProgramId,
            "strTrkExerciseId": STExerciseId
          }))  */ // @TODO: Looks like we can remove this.findOne 
          .then(exercise => setNumber = exercise.sets.length + 1)
          .then(() => this.findOneAndUpdate({
            "gymGoerId": gymGoerId,
            "strTrkProgramId": STProgramId,
            "strTrkExerciseId": STExerciseId
            },
            { $addToSet:
                {
                  "sets": {
                    setNumber: setNumber,//{ $size: "$sets" }, // see if there is a better way of doing this ...
                    weight: newSet.weight,
                    reps: newSet.reps
                  }
                }
            },
            { new: true }
          ))
          .then(exercise => exercise.serialize());
};

const StrengthTrackerExerciseModel = mongoose.model('StrengthTrackerExercises', strengthTrackerExerciseSchema);

module.exports = {StrengthTrackerExerciseModel};