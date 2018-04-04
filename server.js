'use strict';

require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors');
mongoose.Promise = global.Promise;

const app = express();

const { DATABASE_URL, PORT } = require('./config');
const { localStrategy, jwtStrategy } = require('./auth/strategies');

passport.use(localStrategy);
passport.use(jwtStrategy);

// Router
const gymTrackerRouter = require('./routers/gymTrackerRouter');
const strengthTrackerRouter = require('./routers/strengthTrackerRouter');

// Logs
app.use(morgan('tiny'));

// Handle /gym-tracker API route, and allow all CORS requests
app.use('/gym-tracker', cors(), gymTrackerRouter);

// Handle the /str-trckr API route (for the Strength Tracker)
app.use('/strength-tracker', cors(), strengthTrackerRouter);

// Start / Stop Server
let server;
function runServer(databaseUrl, port = PORT) {

  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`\n  === App is listening on port ${port} ===\n`);
        resolve();
      })
      .on('error', err => {
        mongoose.disconnect();
        reject(err);
      });
    });
  });
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('\n  === Closing server ===\n');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}


if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}


module.exports = {app, runServer, closeServer};