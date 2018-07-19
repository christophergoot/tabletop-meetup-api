const express = require('express');
const router = express.Router();
const { User, Collection } = require('../models');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const fetch = require('node-fetch');
const unzip = require('zlib').gunzip;

// Retrieves all registered users
router.get('/', (req, res) => {
	return User.find()
		.then(users => users.map(user => user.getName()))
		.then(userList => {
			res.json({ userList });
		})
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving all registered users'
		}));

});

// get user by username
router.get('/username/:username', (req, res) => {
	const { username, index } = req.params;
	return User.findOne({ username })
		.then(user => user.getName())
		.then(user => res.json({ user }))
		.catch(err => res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'not a valid username',
			location: 'guests'
		}));
});

function getUser(userId) {
	return User
		.findOne({ '_id': userId })
		.then(user => user.serialize());
}

function fetchBggUser(username) {
	const url = 'https://cors-anywhere.herokuapp.com/' 
	+ 'https://www.boardgamegeek.com/xmlapi2/user?'
	+ `name=${username}`
	+ '&domain=boardgame';
	return fetch(url, {
		method: 'GET',
		'Access-Control-Allow-Origin': 'https://www.boardgamegeek.com'
	})
		.then(res => res.text())
		.then(res => {
			let user;
			parseString(res, (err, result) => {
				if (err) console.log(err);
				if (result) user = { name: result.user.$.name, bggId: result.user.$.id };
				else return;
			});
			return user;
		});
}

router.get('/check-bgg-user/:username', (req, res) => {
	const { username } = req.params;
	fetchBggUser(username)
		.then(user => res.json(user))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving bgg user'
		}));		
});

router.get('/:userId', (req, res) => {
	const { userId } = req.params;
	getUser(userId)
		.then(user => res.json(user))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving user'
		}));
});


// Post to register a new user
router.post('/', jsonParser, (req, res) => {
	const requiredFields = ['username', 'password'];
	const missingField = requiredFields.find(field => !(field in req.body));

	if (missingField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Missing field',
			location: missingField
		});
	}

	const stringFields = ['username', 'password', 'firstName', 'lastName', 'bggUsername'];
	const nonStringField = stringFields.find(
		field => field in req.body && typeof req.body[field] !== 'string'
	);

	if (nonStringField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Incorrect field type: expected string',
			location: nonStringField
		});
	}

	// If the username and password aren't trimmed we give an error.  Users might
	// expect that these will work without trimming (i.e. they want the password
	// "foobar ", including the space at the end).  We need to reject such values
	// explicitly so the users know what's happening, rather than silently
	// trimming them and expecting the user to understand.
	// We'll silently trim the other fields, because they aren't credentials used
	// to log in, so it's less of a problem.
	const explicityTrimmedFields = ['username', 'password'];
	const nonTrimmedField = explicityTrimmedFields.find(
		field => req.body[field].trim() !== req.body[field]
	);

	if (nonTrimmedField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Cannot start or end with whitespace',
			location: nonTrimmedField
		});
	}

	const sizedFields = {
		username: {
			min: 1
		},
		password: {
			min: 10,
			// bcrypt truncates after 72 characters, so let's not give the illusion
			// of security by storing extra (unused) info
			max: 72
		}
	};
	const tooSmallField = Object.keys(sizedFields).find(
		field =>
			'min' in sizedFields[field] &&
			req.body[field].trim().length < sizedFields[field].min
	);
	const tooLargeField = Object.keys(sizedFields).find(
		field =>
			'max' in sizedFields[field] &&
			req.body[field].trim().length > sizedFields[field].max
	);

	if (tooSmallField || tooLargeField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: tooSmallField
				? `Must be at least ${sizedFields[tooSmallField]
					.min} characters long`
				: `Must be at most ${sizedFields[tooLargeField]
					.max} characters long`,
			location: tooSmallField || tooLargeField
		});
	}

	let { username, password, firstName = '', lastName = '', bggUsername = '' } = req.body;
	// Username and password come in pre-trimmed, otherwise we throw an error
	// before this
	firstName = firstName.trim();
	lastName = lastName.trim();
	bggUsername = bggUsername.trim();

	// if (bggUsername) {
	// 	checkBggForUsername(bggUsername)
	// 		.then()
	// };

	User.find({ username })
		.count()
		.then(count => {
			if (count > 0) {
				// There is an existing user with the same username
				return Promise.reject({
					code: 422,
					reason: 'ValidationError',
					message: 'Username already taken',
					location: 'username'
				});
			}
			// If there is no existing user, hash the password
			return User.hashPassword(password);
		})
		.then(async hash => {
			// create the new user
			const newUser = await User.create({
				username,
				password: hash,
				firstName,
				lastName,
				bggUsername
			});
			return newUser;
		})
		.then(newUser => {
			// create the new collection
			if (!bggUsername) {
				Collection.create({
					userId: newUser._id,
					games: []
				});
				return newUser;
			}
			fetch('http://bgg-json.azurewebsites.net/collection/' + bggUsername)
				.then(bggGames => {
					return new Promise(function (resolve, reject) {
						let dataString = '';
						bggGames.body.on('data', function (data) {
							dataString += data.toString();
						});
						bggGames.body.on('end', function () {
							try {
								const gameList = JSON.parse(dataString);
								resolve(gameList);
							} catch (err) {
								console.log(err);
								resolve([]);
							}

						});
					})
						.then(gameList => {
							Collection.create({
								userId: newUser._id,
								games: gameList
							});
						});
				});
			return newUser;
		})
		.then(newUser => {
			// console.log(collection);
			return res.status(201).json(newUser.serialize());
		})
		.catch(err => {
			console.log(err);
			// Forward validation errors on to the client, otherwise give a 500
			// error because something unexpected has happened
			if (err.reason === 'ValidationError') {
				return res.status(err.code).json(err);
			}
			res.status(500).json({ code: 500, message: 'Internal server error' });
		});
});

module.exports = { router, getUser };