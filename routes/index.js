const router = require('express').Router()

router.use(require('./user'))
router.use(require('./product'))
router.use(require('./order'))
router.use(require('./review'))
router.use('/admin', require('./admin'))

module.exports = router
