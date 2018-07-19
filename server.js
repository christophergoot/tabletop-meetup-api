'use strict';

require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const { DATABASE_URL, PORT, CLIENT_ORIGIN } = require('./config');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');

const jwtAuth = passport.authenticate('jwt', { session: false });
const { router: authRouter, localStrategy, jwtStrategy } = require('./routers/auth');

// CORS
app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
	res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
	if (req.method === 'OPTIONS') {
		return res.send(204);
	}
	next();
});

// const cors = require('cors');
// app.use(
// 	cors({
// 		origin: CLIENT_ORIGIN
// 	})
// );

passport.use(localStrategy);
passport.use(jwtStrategy);

app.use(morgan('common'));
app.use(bodyParser.json());

const { router: usersRouter } = require('./routers/users');
const { router: eventsRouter } = require('./routers/events');
const { router: collectionsRouter } = require('./routers/collections');
app.use('/api/users', usersRouter);
app.use('/api/events/', eventsRouter);
app.use('/api/auth/', authRouter);
app.use('/api/collections/', collectionsRouter);

app.use('*', (req, res) => res.status(404).json({ message: 'Not Found' }));

let server;

function runServer(databaseUrl = DATABASE_URL, port = PORT) {
	return new Promise((resolve, reject) => {
		mongoose.connect(databaseUrl, err => {
			if (err) {
				return reject(err);
			}
			server = app.listen(port, () => {
				console.log(`Tabletop Meetup API is listening on port ${port}`);
				resolve();
			})
				.on('error', err => {
					mongoose.disconnect();
					reject(err);
				});
		});
	});
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
	return mongoose.disconnect().then(() => {
		return new Promise((resolve, reject) => {
			console.log('Closing server');
			server.close(err => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});
	});
}

function tearDownDb() {
	return mongoose.connection.dropDatabase();
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
	runServer().catch(err => console.error(err));
}

module.exports = { runServer, app, closeServer, tearDownDb };
