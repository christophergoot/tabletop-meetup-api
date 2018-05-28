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
	let userId = '';
	if (req.params.userId) userId = req.params.userId;
	else userId = req.user.userId;
	const { filter, sortMethod, sortDirection } = req.query;

	const limit = parseInt(req.query.limit) || 25;
	const page = parseInt(req.query.page) || 1;
	const skip = (page -1) * limit;
	
	const filterQuery = {};
	filterQuery['\'games.' + filter + '\''] = true;

	const sort = {
		method: sortMethod || 'name',
		direction: sortDirection || 1
	};
	const sortQuery = {};
	sortQuery[`games.${sort.method}`] = parseInt(sort.direction);
	// const sortQuery = { 'games.name': -1 };
	const pageCount = await Collection.findOne({userId})
		.then(c => Math.ceil(c.games.length / limit));
		
	const gameList = await Collection
		.aggregate( [
			{ $match: { userId } },
			{ $unwind: '$games' },
			// { $match: {'games.owned': true }},
			// { $match: filterQuery },
			{ $sort: sortQuery },
			// { $sort: JSON.stringify(sortQuery) },
			{ $skip: skip },
			{ $limit: limit }
		] );
	const games = [];
	gameList.forEach(game => games.push(game.games));
	const collection = { userId, sort, limit, page, pageCount, games };
	return collection;
}

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