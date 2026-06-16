const express = require('express')
const router = express.Router()
const { getAll, getById, create, update, remove, getTypes } = require('../controllers/tasks')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/types', getTypes)
router.get('/', getAll)
router.get('/:id', getById)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', authorize('admin', 'team_lead'), remove)

module.exports = router
