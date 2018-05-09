const chai = require('chai');
 const chaiHttp = require('chai-http');

 const {app} = require('../server');

 const should = chai.should();
 chai.use(chaiHttp);

 describe('/', function() {

   it('should 200 on GET request to /', function() {
     return chai.request(app)
       .get('/api/')
       .then(function(res) {
         res.should.have.status(200);
         res.should.be.json;
       });
   });
 });