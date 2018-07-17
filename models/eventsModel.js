'use strict';
// const User = require('./userModel');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const EventSchema = mongoose.Schema({
	name: String,
	locationName: String,
	locationAddress: String,
	locationDescription: String,
	startDate: Date,
	endDate: Date,
	additionalInformation: String,
	guests: [
		{
			user: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
			// userId: [{ type: String, ref: 'user' }],
			userId: { type: String },
			rsvp: String,
			host: Boolean,
			invitedBy: String
		}
	],
	gameVotes: [
		{
			gameId: { type: Number, required: true },
			yes: [String],
			no: [String]
		}
	]
});

EventSchema.methods.serialize = function() {
	return {
		eventId: this._id.toString(),
		name: this.name,
		locationName: this.locationName,
		locationAddress: this.locationAddress,
		locationDescription: this.locationDescription,
		startDate: this.startDate,
		endDate: this.endDate,
		additionalInformation: this.additionalInformation,
		guests: this.guests,
		gameVotes: this.gameVotes
	};
};

const Event = mongoose.model('Event', EventSchema);

module.exports = { Event };