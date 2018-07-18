'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const UserSchema = mongoose.Schema({
	// _id: mongoose.Schema.ObjectId,
	// _id: mongoose.Schema.Types.ObjectId,
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
	lastName: {type: String, default: ''},
	bggUsername: {type: String, default: ''}
});

// UserSchema.virtual('displayName').get(() => {
// 	return this.firstName + ' ' + this.lastName || user.username;
// });

function createDisplayName(first,last,user) {
	let display = (first + ' ' + last).trim();
	if (display === '') display = user;
	return display;
}

UserSchema.methods.serialize = function() {
	const displayName = createDisplayName(this.firstName,this.lastName,this.username);
	return {
		userId: this._id.toString(),
		username: this.username || '',
		displayName,
		firstName: this.firstName || '',
		lastName: this.lastName || '',
		bggUsername: this.bggUsername || ''
	};
};

UserSchema.methods.getName = function() {
	const displayName = createDisplayName(this.firstName,this.lastName,this.username);
	return {
		userId: this._id.toString(),
		username: this.username,
		displayName
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