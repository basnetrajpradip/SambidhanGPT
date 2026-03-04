import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRouter from './api'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api', apiRouter)

export default app
