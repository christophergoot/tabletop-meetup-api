const express = require('express');
const router = express.Router();
const { Event } = require('../models');


const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
router.use(jwtAuth);

// router.get('/', (req, res) => {
// 	res.json({
// 		ok: true,
// 		message: 'you found the events router'
// 	});
// });

router.get('/', (req, res) => {
	const { userId } = req.user;
	// const { userId } = req.params;
	return Event
		.find( { 'guests': {'userId': userId } } )
		.then(events => res.json(events));

	// find( { size: { h: 14, w: 21, uom: "cm" } } )
});

module.exports = { router };