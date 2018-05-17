const express = require('express');
const router = express.Router();
const { Collection } = require('../models');

router.get('/', (req, res) => {
	res.json({
		ok: true,
		message: 'you found the collections router'
	});
});

function getCollection(userId) {
	return Collection
		.findOne({ userId });
}

router.get('/:userId', (req, res) => {
	const { userId } = req.params;
	getCollection(userId)
		.then(collection => res.json(collection))
		.catch(err => res.status(500).json({
			error: 'something went wrong retreiving collection'
		}));
});


module.exports = { router };