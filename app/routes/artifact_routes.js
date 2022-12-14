// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for artifacts
const Artifact = require('../models/artifact')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// computational parts of artifact backend that generate ratings
const rateAndValidate = require("../utils/rating/rate-and-validate.js");

// data for the seed route
const seedData = require("../utils/seed/seed.json");

// INDEX
// GET /artifacts
router.get('/artifacts',  requireToken,  (req, res, next) => {
	
	Artifact.find({owner: req.user.id})
		.then((artifacts) => {
			// `artifacts` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return artifacts.map((artifact) => artifact.toObject())
		})
		// respond with status 200 and JSON of the artifacts
		.then((artifacts) => {
			console.log(artifacts)
			res.status(200).json({ artifacts })
		})
		// if an error occurs, pass it to the handler
		.catch(next);
})

// seed
router.get("/artifacts/seed", requireToken, async (req, res, next) => {
	const userId = req.user.id;

	const toSeed = [ ...seedData ];
	for (const seedEntry of toSeed) {
		seedEntry.owner = userId;
		seedEntry.ratings = await rateAndValidate(seedEntry, userId);
		await Artifact.create(seedEntry);
	}

	res.sendStatus(204);
})

// SHOW
// GET /artifacts/5a7db6c74d55bc51bdf39793
router.get('/artifacts/:id', requireToken, (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	Artifact.findOne({_id: req.params.id, owner: req.user.id})
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "artifact" JSON
		.then((artifact) => {
			// requireOwnership(req, artifact)
			res.status(200).json({ artifact: artifact.toObject() })
		})	
		// if an error occurs, pass it to the handler
		.catch(next)
})

// CREATE
// POST /artifacts
router.post('/artifacts', requireToken, (req, res, next) => {
	// set owner of new artifact to be current user
	req.body.artifact.owner = req.user.id

	Artifact.create(req.body.artifact)
		// respond to succesful `create` with status 201 and JSON of new "artifact"
		.then(async (artifact) => {
			artifact.ratings = await rateAndValidate(artifact, req.user.id);
			artifact.save();

			res.status(201).json({ artifact: artifact.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})

// UPDATE
// PATCH /artifacts/5a7db6c74d55bc51bdf39793
router.patch('/artifacts/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.artifact.owner

	const newArtifact = req.body.artifact;
	Artifact.findById(req.params.id)
		.then(handle404)
		.then(async (artifact) => {
			
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, artifact)

			newArtifact.ratings = await rateAndValidate(newArtifact, req.user.id);

			// pass the result of Mongoose's `.update` to the next `.then`
			return artifact.updateOne(newArtifact)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// DESTROY
// DELETE /artifacts/5a7db6c74d55bc51bdf39793
router.delete('/artifacts/:id',  requireToken,  (req, res, next) => {
	Artifact.findById(req.params.id)
		.then(handle404)
		.then((artifact) => {
			// throw an error if current user doesn't own `artifact`
			requireOwnership(req, artifact)
			// delete the artifact ONLY IF the above didn't throw
			artifact.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router