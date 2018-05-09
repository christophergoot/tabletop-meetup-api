'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const userSchema = mongoose.Schema({
	userId: String,
	userName: String,
	bggId: String,
	associated: {
		players: [{
			userId: String,
		}],
		events: [{
			eventId: String
		}],
		locations: [{
			locationId: String
		}]
	}
});

userSchema.methods.serialize = function() {
	return {
		userId: this._id,
		userName: this.userName,
		bggId: this.bggId,
		associated: this.associated
	};
};

userSchema.virtual('name').get(() => this.firstName + ' ' + this.lastName);
const User = mongoose.model('User', userSchema);

module.exports = { User };