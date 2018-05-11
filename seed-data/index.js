'use strict';

const { User } = require('../models');

function seedUsers() {
	return User.insertMany(seedUserData);
}

const seedUserData = [
	{
		'bggId' : '507102',
		'userName' : 'goot',
		'firstName' : 'Christopher',
		'lastName' : 'Gutierrez',
		'associated' : {
			'players' : [
				{
					'userId' : '5af51eaf4e39b29dc1d71697'
				},
				{
					'userId' : '5af51e974e39b29dc1d71693'
				},
				{
					'userId' : '5af51e874e39b29dc1d7168d'
				},
				{
					'userId' : '5af51e784e39b29dc1d71687'
				}
			],
			'events' : [
				{
					'eventId' : 'jilhjd8890jdsaf',
					'date' : 1525395600,
					'eventName' : 'Upcomming Event',
					'rsvp' : 'host'
				},
				{
					'id' : 'jilhjd8890jdsaf',
					'date' : 1519956000,
					'eventName' : 'Old Event',
					'rsvp' : 'confirmed'
				}
			],
			'locations' : [
				{
					'locationId' : 'Christopher\'s Gararge'
				},
				{
					'locationId' : 'Cloud Cap Games'
				},
				{
					'locationId' : 'Juan\'s House'
				}
			]
		}
	},
	{
		'firstName' : 'Emma',
		'lastName' : 'Holland'
	},
	{
		'bggId' : '311230',
		'firstName' : 'Juan',
		'lastName' : 'Gargia',
		'userName' : 'Pastor_Mora'
	},
	{
		'bggId' : '701708',
		'firstName': 'Terry',
		'userName' : 'soltzt'
	},
	{
		'bggId' : '1130617',
		'firstName' : 'Cloyd',
		'userName' : 'Cloyd'
	}
	
];

module.exports = { seedUsers };