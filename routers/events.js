const express = require('express');
const router = express.Router();
const { Event, User, Collection } = require('../models');

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
router.use(jwtAuth);

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
					field: key,
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
		if (filter.value === 'true') match.$match[`games.${filter.field}`] = true;
		else if (filter.value === 'false') match.$match[`games.${filter.field}`] = false;
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

const addGames = event => {
	return attachGameList(
		event,
		25,
		0,
		{method:'name',direction:1},
		[],
	);
};

router.get('/:eventId', (req, res) => {

	const { eventId } = req.params;
	const { userId } = req.user;

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
		.populate('guests.user', 'firstName lastName username')
		.then(event => event.serialize())
		.then(event => attachGameList(event,limit,skip,sort,filters))
		.then(event => res.json(event));
});

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

function mergeDateTime (dateStr, TimeStr) {
	const date = new Date(dateStr);
	const time = new Date(TimeStr);
	date.setHours(time.getHours());
	date.setMinutes(time.getMinutes());
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date;
}

router.post('/', (req,res) => {
	// TODO
	// validate
	//	must pass in valid userId for guests

	const hostId = req.user.userId;
	const event = req.body;

	event.startDate = mergeDateTime(event.startDate, event.startTime);
	delete event.startTime;

	if (event.endTime && event.endDate) {
		event.endDate = mergeDateTime(event.endDate, event.endTime);
		delete event.endTime;
	}
	else if (event.endTime) {
		event.endDate = mergeDateTime(event.startDate, event.endTime);
		delete event.endTime;
	} else if (event.endDate) {
		event.endDate = mergeDateTime(event.endDate, event.startDate);
	}

	const guests = [];
	for (const key in event) {
		if (key.split('-')[0] === 'guest') {
			const userId = event[key];
			const host = (userId === hostId);
			let rsvp = 'invited';
			if (host) rsvp = 'host';
			const newGuest = {
				'user': userId,
				userId,
				rsvp,
				host,
				'invitedBy': userId
			};
			guests.push(newGuest);
			delete event[key];
		}
	}

	event.guests = guests;

	return Event
		.create(event)
		.then(events => res.json(events))
		.catch(err => {
			// Forward validation errors on to the client, otherwise give a 500
			// error because something unexpected has happened
			if (err.reason === 'ValidationError') {
				return res.status(err.code).json(err);
			}
			res.status(500).json({code: 500, message: 'Internal server error'});
		});

});

module.exports = { router, createMatchFromFilters, createFiltersFromQuery };