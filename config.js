'use strict';

module.exports = {
	DATABASE_URL: process.env.DATABASE_URL,
	PORT: process.env.PORT || 3000,
	TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
	CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_EXPIRY: process.env.JWT_EXPIRY || '7d'
};

// exports.DATABASE_URL = process.env.DATABASE_URL;
// exports.PORT = process.env.PORT;
// exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
// exports.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;