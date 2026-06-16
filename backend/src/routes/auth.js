const express = require('express')
const router = express.Router()
const { register, login, me } = require('../controllers/auth')
const { authenticate } = require('../middleware/auth')

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, me)

module.exports = router
