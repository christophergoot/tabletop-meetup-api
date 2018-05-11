const chai = require('chai');
const chaiHttp = require('chai-http');
const { User } = require('../models');
const { getUser } = require('../routers/users');
const {runServer, app, closeServer, tearDownDb } = require('../server');
const { TEST_DATABASE_URL } = require('../config');
const { seedUsers } = require('../seed-data');

const should = chai.should();
chai.use(chaiHttp);

describe('/api/users/:userId', () => {
	before(() => runServer(TEST_DATABASE_URL));
	beforeEach(() => seedUsers());
	after(() => closeServer());
	afterEach(() => tearDownDb());

	// TODO: additional use cases
	// should throw error with invalid userID
	// should return public profile if not logged in
	// should return fill profile if not logged in

	it('should get a single user', async function() {
		// get a random valid userID
		const knownUsers = await User.find();
		const knownUser = knownUsers[Math.floor(Math.random()*knownUsers.length)];
		const userId = knownUser._id;
		// get and verify
		return getUser(userId)
			// .then(res => res.json())
			.then(res => {
				res.should.include.keys('userId', 'firstName');
				res.userId.should.deep.equal(userId);
				res.firstName.should.deep.equal(knownUser.firstName);
			});
	});
	// it('should throw error with invalid userID', async () => {
	// 	const falseUserId = '123';
	// 	return getUser(falseUserId)
	// 		.then(res => {
	// 			res.should.equal('undefined');
	// 		});
	// });
	
});