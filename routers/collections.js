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

async function getCollection(req) {
	const { userId } = req.params;
	const sort = {
		method: req.query.sortMethod || 'name',
		direction: req.query.sortDirection || 1
	};
	const { filter } = req.query;
	const filterQuery = {};
	filterQuery['\'games.' + filter + '\''] = true;

	const limit = parseInt(req.query.limit) || 25;

	const sortQuery = {};
	sortQuery['\'games.' + sort.method + '\''] = parseInt(sort.direction);
	// const sortQuery = `games[${sort.method}]: ${sort.direction}`;
	const gameList = await Collection
		.aggregate( [
			{ $match: { userId } },
			{ $unwind: '$games' },
			{ $match: {'games.owned': true }},
			// { $match: filterQuery },
			{ $sort: sortQuery },
			// { $skip: 100 },
			{ $limit: limit }
		] );
	const games = [];
	gameList.forEach(game => games.push(game.games));
	collection = {games, userId};
	return collection;
}

// do this:
// db.getCollection('collections').aggregate( [
// 	{ $match: { userId:"5af9d3aa04eaf40db2da662d" } },
// 	{ $unwind: '$games' },
// 	{ $match: { 'games.yearPublished': { $gt: 2000, $lt: 2010 } } },
// 	{ $sort: { 'games.name': -1} },
// 	// { $skip: 100 },
// 	{ $limit: 25 }
// 	] )

router.get('/:userId', (req, res) => {
	getCollection(req)
		.then(collection => res.json(collection))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving collection'
		}));
});

router.get('/', (req, res) => {
	getCollection(req)
		.then(collection => res.json(collection))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving collection'
		}));
});

module.exports = { router };