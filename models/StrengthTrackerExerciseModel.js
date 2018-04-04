'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const strengthTrackerExerciseSchema = mongoose.Schema({
  gymGoerId: {type: mongoose.Schema.Types.ObjectId, required: true},
  strTrkExerciseId: {type: String, required: true},
  dayNumber: {type: Number, required: true},
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
    dayNumber: this.dayNumber,
    strTrkExerciseId: this.strTrkExerciseId,
    sets: this.sets.map(set => ({id: set._id, setNumber: set.setNumber, weight: set.weight, reps: set.reps}))
  };
};

const StrengthTrackerExerciseModel = mongoose.model('StrengthTrackerExercises', strengthTrackerExerciseSchema);

module.exports = {StrengthTrackerExerciseModel};