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
			// userId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
			userId: String,
			rsvp: String,
			host: Boolean,
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

// userId: [{ type: Schema.Types.ObjectId, ref: 'User' }]

// const userDisplayName = new userDisplayName({

// });

EventSchema.methods.serialize = function() {
	return {
		eventId: this._id.toString(),
		location: this.location,
		dateBegin: this.dateBegin,
		dateEnd: this.dateEnd,
		guests: this.guests,
		games: this.games
	};
};


const Event = mongoose.model('Event', EventSchema);

module.exports = { Event };