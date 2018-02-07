'use strict';

const mongoose = require('mongoose');
mongoose.promise = global.Promise;
const GymGoerModelMethods = require('./GymGoerModelMethods');

const gymGoerSchema = mongoose.Schema({
  email: {type: String,
          required: true,
          index: true,
          unique: true
  },
  trainingSessions: [
    {
      sessionType: {type: String, required: true},
      sessionDate: {type: Date, default: Date.now},
      exercises: [
        {
          name: {type: String, required: true},
          sets: [
            {
              setNumber: {type: Number, required: true},
              weight: {type: String, required: true},
              reps: {type: Number, required: true}
            }
          ]
        }
      ]
    }
  ]
});

// Assign the GymGoerModelMethods to the gymGoerSchema methods
Object.assign(gymGoerSchema.methods, GymGoerModelMethods);

gymGoerSchema.statics.validateParameters = function(parameters, message) {
  return new Promise((resolve, reject) => {
    if (parameters.every(parameter => typeof parameter !== 'undefined') === true) {
      resolve(true);
    }
    reject(new Error(message));
  });
};

gymGoerSchema.statics.findGymGoerByEmail = function(email) {
  return this.validateParameters([email], 'Email is required')
    .then(() => {
      return this.findOne({email: email})
        .then(gymGoer => {
          if (gymGoer) {
            return gymGoer.serializeAll()
          } else {
            return null;
          }
      })
  });
};

gymGoerSchema.statics.createGymGoer = function (email) {
  return this.validateParameters([email], 'Email is required')
    .then(() => {
      return GymGoerModel.create({
        email: email,
        trainingSessions: []
      }).then(gymGoer => gymGoer.serializeAll());
    });
};

gymGoerSchema.statics.addTrainingSession = function (gymGoerID, sessionType) {
  return this.validateParameters([gymGoerID, sessionType], 'Both ID and SessionType are required')
    .then(() => {
      return this.findOne({
        "_id": gymGoerID
      })
        .then(gymGoer => {
          if (gymGoer !== null) {
            const hasDoneSessionToday = gymGoer.hasDoneTrainingSessionToday(sessionType);
            if (hasDoneSessionToday === false) {
              const newSession = { sessionType: sessionType, exercises: [] };
              return this
                .findOneAndUpdate({ "_id": gymGoerID }, { $push: { trainingSessions: newSession } })
                .then(gymGoer => {
                  return gymGoer;
                });
            }
            return gymGoer;
          } else {
            throw new Error('ID not found');
          }
        })
        .then(() => {
          return {
            created: true,
            sessionType: sessionType
          };
        });
    });
};

const GymGoerModel = mongoose.model('GymGoer', gymGoerSchema);

module.exports = {GymGoerModel};