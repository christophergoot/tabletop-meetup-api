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

async function attachGameList(event,limit,skip,sort,filter) {
	const userIds = event.guests.map(guest => guest.userId);
	const sortQuery = {};
	sortQuery[`games.${sort.method}`] = parseInt(sort.direction);

	const gameList = await Collection.aggregate( [
		{ $match: { userId: {$in: userIds } } },
		{ $unwind: '$games' },
		{ $match: { 'games.owned': true } },
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
		{	field: 'filter', value: filter },
		{	field: 'games', value: games },
	].forEach(el => eventCopy[el.field] = el.value);
	
	return eventCopy;
}

router.get('/:eventId', (req, res) => {
	const { eventId } = req.params;
	const { userId } = req.user;
	const { filter, sortMethod, sortDirection } = req.query;
	const sort = {
		method: sortMethod || 'name',
		direction: sortDirection || 1
	};
	const limit = parseInt(req.query.limit) || 25;
	const page = parseInt(req.query.page) || 1;
	const skip = (page -1) * limit;

	return Event
		.findOne({'_id':eventId})
		// .populate('guests.user', {firstName,lastName,username})
		// .populate('guests.user', ['firstName','lastName','username'])
		.populate('guests.user', 'firstName lastName username')
		.then(event => event.serialize())
		.then(event => attachGameList(event,limit,skip,sort,filter))
		.then(event => res.json(event));
});

const addGames = event => {
	return attachGameList(event,25,0,{method:'name',direction:1},'');
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
			// events.map(async event => {
			// 	const newEvent = await attachGameList(event,25,0,{method:'name',direction:1},'');
			// 	return newEvent;
			// });
			return many;
		})


		// .then(events => { // attach combined gamelist to event
		// 	return Promise.all(events.map(async event => {
		// 		const eventWithGames = await attachGameList(event);
		// 		return eventWithGames;
		// 	}));
		// })
		.then(events => res.json(events));
});

module.exports = { router };