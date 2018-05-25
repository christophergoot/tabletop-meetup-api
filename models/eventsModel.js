'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const EventSchema = mongoose.Schema({
	name: String,
	location: String,
	startDate: Date,
	endDate: Date,
	guests: [
		{
			// userId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
			userId: String,
			rsvp: String,
			host: Boolean,
			invitedBy: String
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
		startDate: this.startDate,
		endDate: this.endDate,
		guests: this.guests,
		games: this.games
	};
};


const Event = mongoose.model('Event', EventSchema);

module.exports = { Event };