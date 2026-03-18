import express from 'express'
import { getAISuggestions } from '../controllers/ai.controller.js'
import { isAuthenticated } from '../middlewares/auth.js'

const router = express.Router()


router.post('/suggestions', isAuthenticated, getAISuggestions)

export default router