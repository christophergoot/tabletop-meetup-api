require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const { DATABASE_URL, PORT } = require('./config');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const { router: usersRouter } = require('./routers/users');
const { router: eventsRouter } = require('./routers/events');
app.use('/api/users/', usersRouter);
app.use('/api/events/', eventsRouter);

app.use(morgan('common'));
app.use(bodyParser.json());
// app.use('*', (req, res) => res.status(404).json({ message: 'Not Found' }));

app.get('/api/', (req, res) => {
	res.json({
		ok: true,
		message: 'you found the API router'
	});
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

module.exports = { app } ;