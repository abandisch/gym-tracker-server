'use strict';
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const { GymGoerModel } = require('../models/GymGoerModel');
const { JWT_SECRET } = require('../config');

const localStrategy = new LocalStrategy({usernameField: 'email'},(email, password, callback) => {
    GymGoerModel.findGymGoerByEmail(email)
      .then(gymGoer => {
        if (gymGoer !== null) {
          return callback(null, gymGoer);
        } else {
          GymGoerModel.createGymGoer(email).then(_gymGoer => {
            return callback(null, _gymGoer);
          });
        }
      })
      .catch(err => {
        if (err.reason === 'LoginError') {
          return callback(null, false, err);
        }
        return callback(err, false);
      });
});

const jwtStrategy = new JwtStrategy(
  {
    secretOrKey: JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
    algorithms: ['HS256']
  },
  (payload, done) => {
    // console.log('payload:', payload);
    done(null, payload.gymGoer);
  }
);

module.exports = { localStrategy, jwtStrategy };
