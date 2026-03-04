import { Router } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()
const routesDir = path.join(__dirname, './routes')

fs.readdirSync(routesDir).forEach((file) => {
  if (file.endsWith('-route.ts')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const route = require(path.join(routesDir, file))
    if (route && route.default) {
      router.use(route.default)
    }
  }
})

export default router
