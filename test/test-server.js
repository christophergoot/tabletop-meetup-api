const chai = require('chai');
const chaiHttp = require('chai-http');

const { app } = require('../server');

const should = chai.should();
chai.use(chaiHttp);

describe('/api', function () {

	it('should 401 on GET to protected resource', function () {
		return chai.request(app)
			.get('/api/events')
			.then(function (res) {
				res.should.have.status(401);
			});
	});
	
});