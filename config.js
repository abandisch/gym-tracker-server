'use strict';

exports.DATABASE_URL = process.env.NODE_ENV === 'development' ? 'mongodb://localhost/gym-tracker-server' : process.env.DATABASE_URL;
exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost/gym-tracker-server-test';
exports.PORT = process.env.PORT || 8080;
exports.JWT_SECRET = process.env.JWT_SECRET || 'mytestingsecret';
exports.JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';