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
		const { gameId, name, image, thumbnail, minPlayers, maxPlayers, playingTime,
			yearPublished, bggRating, averageRating, rank, isExpansion } = game.games;

		// if game has already been pushed to array, adds the ownerId to exising copy
		const existingGameIndex = games.findIndex(g => g.gameId === game.games.gameId);
		if (existingGameIndex >= 0) {
			games[existingGameIndex].owners.push(game.userId);
		}
		// catch bad resources 
		// else if (!game.gameId)

		else games.push({
			gameId, name, image, thumbnail, minPlayers, maxPlayers, playingTime,
			yearPublished, bggRating, averageRating, rank, isExpansion,
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

function getSingleEvent(req) {

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
		.then(event => attachGameList(event,limit,skip,sort,filters));
}

function createNewEvent(req) {
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
		.then(events => res.json(events));
}

function mergeDateTime (dateStr, TimeStr) {
	const date = new Date(dateStr);
	const time = new Date(TimeStr);
	date.setHours(time.getHours());
	date.setMinutes(time.getMinutes());
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date;
}

async function castGameVote(req, eventSchema = Event) {
	console.log(arguments);
	const { userId } = req.user;
	const { eventId } = req.params;
	const { gameId, vote } = req.body;
	const eventExists = await eventSchema.findById(eventId).count();
	if (!eventExists) throw new Error('event does not exist');
	if (vote !== 'yes' && vote !== 'no') throw new Error('vote must be either \'yes\' or \'no\'');

	else return eventSchema.findById(eventId, (err, event) => {
		if (err) console.log('error', err);
		if (event) console.log('event', event);
		const successMessage = `successfully voted ${vote} for ${gameId}`;
		let voteConfirmation = false;


		event.gameVotes.forEach(game => {
			if (game.gameId === gameId) { // game has previously been voted for
				// find existing vote (if exists) and remove it
				
				const indexOfYes = game.yes.indexOf(userId);
				const indexOfNo = game.no.indexOf(userId);
				if (indexOfYes >= 0) game.yes.splice(indexOfYes, 1);
				if (indexOfNo >= 0) game.no.splice(indexOfNo, 1);

				game[vote].push(userId); // cast vote
				voteConfirmation = true;
				return;
			}
		});

		if (!voteConfirmation) {
			event.gameVotes.push({ gameId, yes: [], no: [] }); // creates the vote entry
			event.gameVotes[event.gameVotes.length-1][vote].push(userId); // casts the user vote
		}
		event.save(err => {
			if (err) console.log('error', err);
		});
	});
}
// User.findOne({username: oldUsername}, function (err, user) {
//     user.username = newUser.username;
//     user.password = newUser.password;
//     user.rights = newUser.rights;

//     user.save(function (err) {
//         if(err) {
//             console.error('ERROR!');
//         }
//     });
// });

// -------------- working endpoint


router.post('/:eventId/cast-vote', (req,res) => {
	castGameVote(req)
		.then(vote => res.json(vote))
		.catch(err => {
			console.log(err);
			res.status(500).json({
				error: 'something went wrong casting a game vote'
			});
		});
});

router.post('/', (req,res) => {
	// TODO
	// validate
	//	must pass in valid userId for guests
	createNewEvent(req)
		.then(event => res.json(event))
		.catch(err => res.status(500).json({
			error: 'something went wrong creating a new Event'
		}));
});

router.get('/', (req, res) => {
	const { userId } = req.user;
	return Event
		.find({'guests.user':userId})
		.populate('guests.user', 'firstName lastName username')
		.then(events => events.map(event => event.serialize()))

		.then(async events => {
			const many = await Promise.all(events.map(addGames));
			return many;
		})
		.then(events => res.json(events));
});

router.get('/:eventId', (req, res) => {
	getSingleEvent(req)
		.then(event => res.json(event))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving an Event'
		}));

});

module.exports = { router, createMatchFromFilters, createFiltersFromQuery, castGameVote };