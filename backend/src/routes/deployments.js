const express = require('express')
const router = express.Router()
const { getAll, getById, create, update, markDeployed, getSystems } = require('../controllers/deployments')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/systems', getSystems)
router.get('/', getAll)
router.get('/:id', getById)
router.post('/', create)
router.put('/:id', update)
router.patch('/:id/deploy', authorize('admin', 'team_lead'), markDeployed)

module.exports = router
