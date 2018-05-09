const express = require('express');
const app = express();
// const router = express.Router();

const PORT = process.env.PORT || 3030;

const { router: usersRouter } = require('./routers/users');
const { router: eventsRouter } = require('./routers/events');
app.use('/api/users/', usersRouter);
app.use('/api/events/', eventsRouter);


app.get('/api/', (req, res) => {
	res.json({
		ok: true,
		message: 'you found the API router'
	});
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

module.exports = { app } ;