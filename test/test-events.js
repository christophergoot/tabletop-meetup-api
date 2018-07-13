const chai = require('chai');
const chaiHttp = require('chai-http');
const { Events } = require('../models');
const { castGameVote } = require('../routers/events');
const {runServer, app, closeServer, tearDownDb } = require('../server');
const { TEST_DATABASE_URL } = require('../config');
const { seedUsers } = require('../seed-data');

const expect = chai.expect;
// const should = chai.should();

chai.use(chaiHttp);

const err = null;
const req = {
	user: { userId: '5b43b4e546f7c74691d72342'},
	params: { eventId: '5b44ee6e00bee04d7d47b65b'},
	body: {
		gameId: 5867,
		vote: 'yes'
	}
};
const event = {
	save: () => {
				
	},
	'startDate' : ('2018-07-16T02:00:00.000Z'),
	'name' : 'Friday at the Fields',
	'guests' : [ 
		{
			'user' : [ 
				('5b43b4e546f7c74691d72342')
			],
			'_id' : ('5b44ee6e00bee04d7d47b65d'),
			'userId' : '5b43b4e546f7c74691d72342',
			'rsvp' : 'invited',
			'host' : false,
			'invitedBy' : '5b43b4e546f7c74691d72342'
		}, 
		{
			'user' : [ 
				('5af9f461e3370c0f57bd431c')
			],
			'_id' : ('5b44ee6e00bee04d7d47b65c'),
			'userId' : '5af9f461e3370c0f57bd431c',
			'rsvp' : 'host',
			'host' : true,
			'invitedBy' : '5af9f461e3370c0f57bd431c'
		}
	],
	'gameVotes' : [ 
		{
			'yes' : [],
			'no' : [],
			'_id' : ('5b48df275a4b4b865cca33b8'),
			'gameId' : 5867
		}
	],
	'__v' : 5
};

describe('castGameVote', _ => {
	it('should cast a yes vote for previously voted for game', () => {

		const eventSchema = {
			findById: (eventId, callback) => {
				if (callback) {
					callback(err, event);
					return expect(event.gameVotes[0].yes.length).to.equal(1);
				}
				return {
					count: () => Promise.resolve(10)			
				};
			},

		};
		castGameVote(req, eventSchema);
		// (event.gameVotes[0].yes.length).should.equal(1);
		
	});
});

