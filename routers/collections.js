const express = require('express');
const router = express.Router();
const { Collection } = require('../models');

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
router.use(jwtAuth);


function sortGamesByMethod(games, sort) {
	const sorted = games.sort((a,b) => {
		if (a[sort.method] < b[sort.method]) {
			return -1;
		} 

		if (a[sort.method] > b[sort.method]) {
			return 1;
		} 

		return 0;
	});
	if (sort.direction === 'desc') sorted.reverse();
	return sorted;
}

function getCollection(userId, sort) {
	return Collection
		.findOne({ userId })
		.then(collection => {
			collection.games = sortGamesByMethod(collection.games, sort);
			return collection;
		});
}

router.get('/:userId', (req, res) => {
	const { userId } = req.params;
	const sort = {
		method: req.query.sortMethod || 'name',
		direction: req.query.sortDirection || 'asc'
	};
	// const sort = 'yearPublished';
	// const sort = { yearPublished: 1 };
	getCollection(userId, sort)
		// .then(collection => {
		// 	collection.games = sortGamesByMethod(collection.games, sort);
		// 	return collection;
		// })
		.then(collection => res.json(collection))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving collection'
		}));
});

router.get('/', (req, res) => {
	const { userId } = req.user;
	const sort = {
		method: req.query.sortMethod || 'name',
		direction: req.query.sortDirection || 'asc'
	};
	getCollection(userId, sort)
		.then(collection => res.json(collection))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving collection'
		}));
});

module.exports = { router };