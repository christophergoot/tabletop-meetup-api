'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const EventSchema = mongoose.Schema({
	name: String,
	location: String,
	dateBegin: Date,
	dateEnd: Date,
	guests: [
		{
			userId: String,
			rsvp: String,
			invitedBy: String
		}
	],
	games: [
		{
			gameOwnerId: String,
			gameId: String,
			name: String,
			image: String,
			thumbnail: String,
			minPlayers: Number,
			maxPlayers: Number,
			playingTime: Number,
			yearPublished: Number,
			bggRating: Number,
			averageRating: Number,
			rank: Number,
			isExpansion: Boolean,
		}
	]
});



const Event = mongoose.model('Event', EventSchema);

module.exports = { Event };