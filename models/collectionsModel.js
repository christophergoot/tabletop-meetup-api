'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const CollectionSchema = mongoose.Schema({
	userId: {
		type: String,
		required: true,
	},
	games: [
		{
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
			numPlays: Number,
			rating: Number,
			isExpansion: Boolean,
			owned: Boolean,
			preOrdered: Boolean,
			forTrade: Boolean,
			previousOwned: Boolean,
			want: Boolean,
			wantToPlay: Boolean,
			wantToBuy: Boolean,
			wishList: Boolean,
			userComment: String
		}
	]
});



const Collection = mongoose.model('Collection', CollectionSchema);

module.exports = { Collection };