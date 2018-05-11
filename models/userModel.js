'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const userSchema = mongoose.Schema({
	userId: String,
	email: String,
	firstName: String,
	lastName: String,
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
		email: this.email,
		// fullName: this.fullName,
		firstName: this.firstName,
		lastName: this.lastName,
		userName: this.userName,
		bggId: this.bggId,
		associated: this.associated
	};
};

// userSchema.virtual('fullName').get(() => {
// 	let lastName;
// 	if (!this.lastName) lastName = 'virtual.lastName';
// 	else lastName = this.lastName;
// 	return (this.firstName + ' ' + lastName).trim();
// });

const User = mongoose.model('User', userSchema);

module.exports = { User };