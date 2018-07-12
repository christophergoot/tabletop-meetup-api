'use strict';
// const User = require('./userModel');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const EventSchema = mongoose.Schema({
	name: String,
	location: String,
	startDate: Date,
	endDate: Date,
	guests: [
		{
			user: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
			// userId: [{ type: String, ref: 'user' }],
			userId: { type: String },
			rsvp: String,
			host: Boolean,
			invitedBy: String
		}
	]
});

EventSchema.methods.serialize = function() {
	return {
		eventId: this._id.toString(),
		location: this.location,
		startDate: this.startDate,
		endDate: this.endDate,
		guests: this.guests,
		games: this.games
	};
};

const Event = mongoose.model('Event', EventSchema);

module.exports = { Event };