const express = require('express');
const router = express.Router();
const { Collection } = require('../models');
const { createFiltersFromQuery, 
	createMatchFromFilters } = require('./events');


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

const filter = [
	{
		field: 'yearPublished',
		is: '$lte',
		value: 2015,
		and: '$gt',
		andValue: 1985
	},
	{
		field: 'rsvp',
		is: '$eq',
		value: 'attending'
	}
];
const filterQuery = { $match: {} };
filter.forEach(filter => {
	if (filter.and)
		filterQuery.$match[filter.field] = { [filter.is]: filter.value, [filter.and]: filter.andValue };
	else filterQuery.$match[filter.field] = { [filter.is]: filter.value };
});

async function getCollection(req) {
	let userId = '';
	if (req.params.userId) userId = req.params.userId;
	else userId = req.user.userId;
	const { sortMethod, sortDirection } = req.query;

	const filters = [];
	createFiltersFromQuery(req.query).forEach(el => filters.push(el));
	const match = createMatchFromFilters(filters);

	const limit = (parseInt(req.query.limit)) || 25;
	const page = parseInt(req.query.page) || 1;
	let skip = (page -1) * limit;
	
	const sort = {
		method: sortMethod || 'name',
		direction: sortDirection || 1
	};
	const sortQuery = {};
	sortQuery[`games.${sort.method}`] = parseInt(sort.direction);
	
	let gameList;

	gameList = await Collection
		.aggregate( [
			{ $match: { userId } },
			{ $unwind: '$games' },
			match,
			{ $sort: sortQuery },
		] );

	const pageCount = Math.ceil(gameList.length / limit);

	if (req.query.limit === '0') skip = 0;
	gameList.splice(0,skip);
	if (limit) gameList.splice(limit);
	
	const games = [];
	gameList.forEach(game => games.push(game.games));
	const collection = { userId, sort, limit, page, pageCount, games, filters };
	return collection;
}

async function addGame(req) {
	const userId = req.user.userId;
	const { gameId, name, image,thumbnail, minPlayers, maxPlayers, 
		playingTime, yearPublished, bggRating, averageRating, rank, 
		numPlays, rating, isExpansion, owned, preOrdered, forTrade,
		previousOwned, want, wantToPlay, wantToBuy, wishList, 
		userComment } = req.body;
	const game = { gameId, name, image,thumbnail, minPlayers, maxPlayers, 
		playingTime, yearPublished, bggRating, averageRating, rank, 
		numPlays, rating, isExpansion, owned, preOrdered, forTrade,
		previousOwned, want, wantToPlay, wantToBuy, wishList, 
		userComment };
	const query = { $and: [
		{ userId },
		{ games: { $elemMatch: { gameId } } }
	]};

	const exists = await Collection.find(query).count();

	if (exists) return Collection.findOneAndUpdate(
		query,
		{ $set: { 'games.$': game } }
	).catch(err => err);

	else return Collection.update(
		{ userId },
		{ $push: { games: game } }
	).catch(err => err);	
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

router.post('/add-game', (req, res) => {
	addGame(req)
		.then(game => {
			console.log(game);
			res.json(game);
		})
		.catch(err => {
			console.log('error',err);
			res.status(500).json({
				error: 'something went wrong attempting to add or update a game to your collection'
			});
		});
});

module.exports = { router };