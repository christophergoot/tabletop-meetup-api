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

function retrieveCollection(userId) {
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

router.get('/', (req, res) => {
	const { userId } = req.user;
	return Event
		.find({'guests.userId':userId})
		.then(events => events.map(event => event.serialize()))
		.then(events => { // attach user's name to event guest list
			const userIds = [];
			events.forEach(event => {
				event.guests.forEach(guest => {
					userIds.push(guest.userId);
				});
			});
			return Promise.all(userIds.map(attachDisplayName))
				.then(users => {
					const eventsCopy = JSON.parse(JSON.stringify(events));
					eventsCopy.forEach(event => {
						event.guests.forEach(guest => {
							guest.name = users.find(user => user.userId === guest.userId).userName;
						});
					});
					return eventsCopy;
				});
		})
		.then(events => { // attach combined gamelist to event
			return Promise.all( events.map(event => {
				const gameList = [];
				const guestList = [];
				event.guests.forEach(guest => guestList.push(guest.userId));
				return Promise.all(guestList.map(retrieveCollection))
					.then(gameLists => {
						gameLists.forEach(list => {
							list.forEach(game => gameList.push(game));
						});
						const eventCopy = JSON.parse(JSON.stringify(event));
						eventCopy.games = gameList;
						return eventCopy;
						return events;
					});
			}) );
		})
		.then(events => res.json(events));

});

module.exports = { router };