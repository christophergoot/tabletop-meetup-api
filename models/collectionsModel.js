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
			gameId: Number,
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

CollectionSchema.methods.public = function() {
	return {
		userId: this._id.toString(),
		games: [
			{
				gameId: this.gameId,
				name: this.name,
				image: this.image,
				thumbnail: this.thumbnail,
				minPlayers: this.minPlayers,
				maxPlayers: this.maxPlayers,
				playingTime: this.playingTime,
				yearPublished: this.yearPublished,
				bggRating: this.bggRating,
				averageRating: this.averageRating,
				rank: this.rank,
				isExpansion: this.isExpansion,
			}
		]
	};
};
mongoose.set('debug', true);
const Collection = mongoose.model('Collection', CollectionSchema);

module.exports = { Collection };