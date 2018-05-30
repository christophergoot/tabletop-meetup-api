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

async function attachGameList(event) {
	const userIds = event.guests.map(guest => guest.userId);
	const gameList = await Collection.aggregate( [
		{ $match: { userId: {$in: userIds } } },
		{ $unwind: '$games' },
		{ $match: { 'games.owned': true } },
		{ $sort: { 'games.name': 1 } },
		// { $sort: { field: 'games.name', test: -1 } },
		{ $skip: 0 },
		// { $limit: 5 },
	] );
	const eventCopy = JSON.parse(JSON.stringify(event));
	eventCopy.games = {
		...event.games,
		list: gameList
	};
	return eventCopy;
}


function HACKEDattachGameList(event) {
	const gameList = [];
	const guestList = [];
	event.guests.forEach(guest => guestList.push(guest.userId));
	return Promise.all(guestList.map(retrieveGameList))
		.then(gameLists => {
			gameLists.forEach(list => {
				list.forEach(game => gameList.push(game));
			});
			const eventCopy = JSON.parse(JSON.stringify(event));
			eventCopy.games = {
				...event.games,
				list: gameList
			};
			return eventCopy;
		});
}

router.get('/:eventId', (req, res) => {
	const { eventId } = req.params;
	const { userId } = req.user;
	return Event
		.findOne({'_id':eventId})
		// .populate('guests.user', {firstName,lastName,username})
		// .populate('guests.user', ['firstName','lastName','username'])
		.populate('guests.user', 'firstName lastName username')
		.then(event => event.serialize())
		.then(event => attachGameList(event))
		.then(event => res.json(event));
});

router.get('/', (req, res) => {
	const { userId } = req.user;
	return Event
		.find({'guests.user':userId})
		.populate('guests.user', 'firstName lastName username')
		.then(events => events.map(event => event.serialize()))

		.then(events => { // attach combined gamelist to event
			return Promise.all(events.map(async event => {
				const eventWithGames = await attachGameList(event);
				return eventWithGames;
			}));
		})
		.then(events => res.json(events));
});

module.exports = { router };