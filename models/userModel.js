'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// const userSchema = mongoose.Schema({
// 	userId: String,
// 	email: {
// 		type: String,
// 		required: true,
// 		unique: true
// 	},
// 	password: {
// 		type: String,
// 		required: true
// 	},
// 	firstName: {
// 		type: String, 
// 		default: ''
// 	},
// 	lastName: {
// 		type: String, 
// 		default: ''
// 	},
// 	userName: String,
// 	bggId: String,
// 	associated: {
// 		players: [{
// 			userId: String,
// 		}],
// 		events: [{
// 			eventId: String
// 		}],
// 		locations: [{
// 			locationId: String
// 		}]
// 	}
// });

const UserSchema = mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true
	},
	password: {
		type: String,
		required: true
	},
	firstName: {type: String, default: ''},
	lastName: {type: String, default: ''}
});

UserSchema.methods.serialize = function() {
	return {
		userId: this._id.toString(),
		username: this.username || '',
		firstName: this.firstName || '',
		lastName: this.lastName || ''
	};
};
  
UserSchema.methods.validatePassword = function(password) {
	return bcrypt.compare(password, this.password);
};

UserSchema.statics.hashPassword = function(password) {
	return bcrypt.hash(password, 10);
};
  

const User = mongoose.model('User', UserSchema);

module.exports = { User };