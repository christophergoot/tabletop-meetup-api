const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.json({
		ok: true,
		message: 'you found the events router'
	});
})

module.exports = { router };