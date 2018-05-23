const express = require('express');
const router = express.Router();
const { Collection } = require('../models');

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
router.use(jwtAuth);

function getCollection(userId) {
	return Collection
		.findOne({ userId });
}

router.get('/:userId', (req, res) => {
	const { userId } = req.params;
	getCollection(userId)
		.then(collection => res.json(collection))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving collection'
		}));
});

router.get('/', (req, res) => {
	const { userId } = req.user;
	getCollection(userId)
		.then(collection => res.json(collection))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving collection'
		}));
});

module.exports = { router };