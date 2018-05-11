const express = require('express');
const router = express.Router();
const { User } = require('../models');

router.get('/', (req, res) => {
	res.json({
		ok: true,
		message: 'you found the users router'
	});
});

function getUser(userId) {
	console.log('userId', userId);
	return User
		.findOne({ '_id': userId })
		.then(user => user.serialize());
}

router.get('/:userId', (req, res) => {
	const { userId } = req.params;
	getUser(userId)
		.then(user => res.json(user))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving user'
		}));
});

module.exports = { router, getUser };