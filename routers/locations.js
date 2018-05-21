const express = require('express');
const router = express.Router();
const { Location } = require('../models');


const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
router.use(jwtAuth);

router.get('/', (req, res) => {
	const { userId } = req.user;
	// const { userId } = req.params;
	return Location
		.find( { 'previousPlayers': [userId] } )
		.then(events => res.json(events))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving locations'
		}));
});

module.exports = { router };