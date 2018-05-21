'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const LocationSchema = mongoose.Schema({
	name: String,
	description: String,
	address: [
		String
	],
	previousPlayers: [
		String
	]
});

LocationSchema.methods.serialize = function() {
	return {
		userId: this._id,
		name: this.name,
		description: this.description
	};
};


const Location = mongoose.model('Location', LocationSchema);

module.exports = { Location };