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
			yearPublished, bggRating, averageRating, rank, isExpansion, owned } = game.games;
		const existingGameIndex = games.findIndex(g => g.gameId === game.games.gameId);

		if (!owned) return;
		// if game has already been pushed to array, adds the ownerId to exising copy
		else if (existingGameIndex >= 0) {
			games[existingGameIndex].owners.push(game.userId);
		}
		// catch bad resources 
		// else if (!game.gameId)

		else games.push({
			gameId, name, image, thumbnail, minPlayers, maxPlayers, playingTime,
			yearPublished, bggRating, averageRating, rank, isExpansion,
			owners: [game.userId]
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

async function createNewEvent(req) {
	// validate everything

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

	const usernames = [];
	for (const key in event) {
		if (key.split('-')[0] === 'guest') {
			usernames.push(event[key]);
			delete event[key];
		}
	}
	if (!event.guests) throw new Error('422%Must invite at least 1 guest%guests%ValidationError');
	if (event.guests.length>0) {
		const eventPromises = event.guests.map((guest,i) => {
			const guestField = 'guests';
			const { username } = guest;
			return User.findOne({ username }) 			// verify that user exists
				.then(user => user.getName().userId)
				.then(userId => {
					const host = (userId === hostId);
					let rsvp = 'invited';
					if (host) rsvp = 'host';
					return {
						'user': userId,
						userId,
						rsvp,
						host,
						'invitedBy': hostId
					};
				})
				.catch(err => {
					console.log(err);
					throw new Error
					(`422%${username} is not a valid registerd user%${guestField}%ValidationError`);
				});
		});	
		const newGuests = await Promise.all(eventPromises);
		guests.push(...newGuests); 
	}
	if (!guests.find(guest => guest.userId === hostId)) // if the guest list does not already include the host...
		guests.push({ user: hostId, userId: hostId, rsvp: 'host', host: true, invitedBy: hostId}); // add the host to guest list
	event.guests = guests;
	return Event
		.create(event)
		.then(event => {
			console.log('event', event);
			return event;
		});
}

function convertError (error) {
	const errorParts = error.split('%');
	const code = errorParts[0];
	const message = errorParts[1];
	const location = errorParts[2];
	const reason = errorParts[3];
	const errorResult = {
		code,
		message,
		location,
		reason
	};
	switch(code) {
	case '422':
		return {...errorResult};

	default:
		return {...errorResult, code: 500, reason: 'UnknownError'};
	}
}

router.post('/', (req,res) => {
	createNewEvent(req)
		.then(event => event.serialize())
		.then(event => res.json(event))
		.catch(err => { 
			console.log('err', err);
			if (err) {
				const error = convertError(err.message);
				res.status(parseInt(error.code)).json(error);
			}
			else res.status(500).json({
				error: 'something went wrong creating a new Event'
			});
		});
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

async function castGameVote(req, eventSchema = Event) {
	const { userId } = req.user;
	const { eventId } = req.params;
	const { game, vote } = req.body;
	const { gameId } = game;
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

async function deleteSingeleEvent(req) {
	const { userId } = req.user;
	const { eventId } = req.params;
	const exists = await Event.findOne({ _id: eventId });
	if (!exists) throw new Error('provided event does not exist');
	const owner = exists.guests.filter(g => g.host === true && g.userId === userId);
	if (!owner) throw new Error('only a host can delete an event');
	console.log(exists);
	return Event.findOneAndRemove({ _id: eventId });
}

async function changeRsvp(req) {
	const { userId } = req.user;
	const { eventId } = req.params;
	const { rsvp } = req.body;
	const possibleChanges = ['invited', 'maybe', 'yes', 'no', 'host'];
	if (!possibleChanges.includes(rsvp)) throw new Error('RSVP status must be one of invited, maybe, yes, no, host');
	const exists = await Event.findOne({ _id: eventId });
	if (!exists) throw new Error('provided event does not exist');
	return Event.findOne({ _id: eventId }, (err, event) => {
		event.guests.find(g => g.userId === userId).rsvp = rsvp;
		event.save(err => {
			if (err) console.log('error', err);
		});
	}).then(event => {
		return Event.findOne({ _id: event._id })
			.populate('guests.user', 'firstName lastName username')
			.then(event => event.serialize());
		// .then(event => {
		// 	const sort = {
		// 		method: req.query.sortMethod || 'name',
		// 		direction: req.query.sortDirection || 1
		// 	};
		// 	const filters = createFiltersFromQuery(req.query);
		// 	const limit = parseInt(req.query.limit) || 25;
		// 	const page = parseInt(req.query.page) || 1;
		// 	const skip = (page -1) * limit;
	
		// 	return attachGameList(event,limit,skip,sort,filters);

		// });
	});
}


router.post('/:eventId/rsvp', (req, res) => {
	changeRsvp(req)
		// .then(event => event.serialize())
		.then(event => {
			res.json(event);
		})
		.catch(err => {
			console.log(err);
			res.status(500).json({
				error: 'something went wrong updating RSVP'
			});
		});
});

router.delete('/delete/:eventId', (req, res) => {
	deleteSingeleEvent(req)
		.then(res => {
			console.log(res);
			res.json(res);
		})
		.catch(err => {
			console.log(err);
			res.status(500).json({
				error: 'something went wrong deleting an event'
			});
		});
});

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