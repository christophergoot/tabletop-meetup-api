const express = require('express');
const router = express.Router();
const { Event, User, Collection } = require('../models');
// const _ = require('lodash');


const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
router.use(jwtAuth);

function attachDisplayName(userId) {
	return User.findOne({ '_id': userId })
		.then(user => {
			const userName = user.firstName + user.lastName || user.username;
			return {userName, userId};
		});
}

function retrieveGameList(userId) {
	return Collection.findOne({userId})
		// .then(collection => collection.public())
		.then(collection => {
			const filteredGames = collection.games.filter(game => game.owned);
			const gamesOwned = JSON.parse(JSON.stringify(filteredGames));
			gamesOwned.map(game => {
				game.userId = userId;
				return game;
			});
			return gamesOwned;
		});
}

function createFiltersFromQuery(query) {
	const reservedFields = [
		'sortMethod',
		'sortDirection',
		'page',
		'pageCount',
		'limit'
	];
	const filters = [];
	for(let key in query) {
		if(query.hasOwnProperty(key) && !reservedFields.includes(key)) {
			const range = query[key].split(':');
			if (range.length === 1) {
				filters.push({
					filed: key,
					value: range[0]
				});
			} else {
				filters.push({
					field: key,
					range: {
						min: parseInt(range[0],10),
						max: parseInt(range[1],10)
					}
				});
			}
		}
	}
	return filters;
}

function createMatchFromFilters(filters) {
	const match = {$match: {}};
	filters.forEach(filter => {
		if (filter.value) match.$match[`games.${filter.field}`] = {$eq: filter.value};
		else match.$match[`games.${filter.field}`] = {$gte: filter.range.min, $lte: filter.range.max};
	});
	return match;
}

async function attachGameList(event,limit,skip,sort,filters) {
	const match = createMatchFromFilters(filters);
	const userIds = event.guests.map(guest => guest.userId);
	const sortQuery = {};
	sortQuery[`games.${sort.method}`] = parseInt(sort.direction);

	const gameList = await Collection.aggregate( [
		{ $match: { userId: {$in: userIds } } },
		{ $unwind: '$games' },
		match,
		{ $sort: sortQuery },
	] );
	const games = [];
	gameList.forEach(game => {
		const existingGameIndex = games.findIndex(g => g.gameId === game.games.gameId);
		if (existingGameIndex >= 0) games[existingGameIndex].owners.push(game.userId);
		else games.push({
			gameId: game.games.gameId,
			name: game.games.name,
			image: game.games.image,
			thumbnail: game.games.thumbnail,
			minPlayers: game.games.minPlayers,
			maxPlayers: game.games.maxPlayers,
			playingTime: game.games.playingTime,
			yearPublished: game.games.yearPublished,
			bggRating: game.games.bggRating,
			averageRating: game.games.averageRating,
			rank: game.games.rank,
			isExpansion: game.games.isExpansion,
			owners: [{userId: game.userId}]
		});

	});
	const page = (skip / limit) + 1;
	const pageCount = Math.ceil(games.length / limit);
	if (limit === 0) skip = 0;
	games.splice(0,skip);
	if (limit) games.splice(limit);

	const eventCopy = JSON.parse(JSON.stringify(event));
	
	// update the eventCopy with preexisting fields
	[	{	field: 'limit', value: limit },
		{	field: 'skip', value: skip },
		{	field: 'page', value: page },
		{	field: 'pageCount', value: pageCount },
		{	field: 'sort', value: sort },
		{	field: 'filters', value: filters },
		{	field: 'games', value: games },
	].forEach(el => eventCopy[el.field] = el.value);
	
	return eventCopy;
}

router.get('/:eventId', (req, res) => {

	const { eventId } = req.params;
	const { userId } = req.user;
	// const userId = '5af9f461e3370c0f57bd431c';

	const sort = {
		method: req.query.sortMethod || 'name',
		direction: req.query.sortDirection || 1
	};

	const filters = createFiltersFromQuery(req.query);

	const limit = parseInt(req.query.limit) || 25;
	const page = parseInt(req.query.page) || 1;
	const skip = (page -1) * limit;

	return Event
		.findOne({'_id':eventId})
		// .populate('guests.user', {firstName,lastName,username})
		// .populate('guests.user', ['firstName','lastName','username'])
		.populate('guests.user', 'firstName lastName username')
		.then(event => event.serialize())
		.then(event => attachGameList(event,limit,skip,sort,filters))
		.then(event => res.json(event));
});

const addGames = event => {
	return attachGameList(
		event,
		25,
		0,
		{method:'name',direction:1},
		[],
	);
};

router.get('/', (req, res) => {
	const { userId } = req.user;
	return Event
		.find({'guests.user':userId})
		.populate('guests.user', 'firstName lastName username')
		.then(events => events.map(event => event.serialize()))

		.then(async events => {
			const many = await Promise.all(events.map(addGames));
			console.log(many);
			return many;
		})
		.then(events => res.json(events));
});

module.exports = { router };