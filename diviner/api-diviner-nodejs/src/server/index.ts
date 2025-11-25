import { getEnvFromAws } from '@xylabs/sdk-api-express-ecs'
import cors from 'cors'
import express from 'express'

import { configureDoc } from '../middleware'
import { addErrorHandlers } from './addErrorHandlers'
import { addHealthChecks } from './addHealthChecks'
import { addInMemoryQueue } from './addInMemoryQueue'
import { addLocationRoutes } from './addLocationRoutes'
import { addMiddleware } from './addMiddleware'

const server = async (port = 80) => {
  // If an AWS ARN was supplied for Secrets Manager
  const awsEnvSecret = process.env.AWS_ENV_SECRET_ARN
  if (awsEnvSecret) {
    console.log('Bootstrapping ENV from AWS')
    // Merge the values from AWS into the current ENV
    // with AWS taking precedence
    const awsEnv = await getEnvFromAws(awsEnvSecret)
    Object.assign(process.env, awsEnv)
  }

  const app = express()
  app.set('etag', false)

  if (process.env.CORS_ALLOWED_ORIGINS) {
    // CORS_ALLOWED_ORIGINS can be an array of allowed origins so we support
    // a list of comma delimited CORS origins
    const origin = process.env.CORS_ALLOWED_ORIGINS.split(',')
    app.use(cors({ origin }))
  }

  addMiddleware(app)
  addHealthChecks(app)
  addLocationRoutes(app)
  addInMemoryQueue(app)

  const host = process.env.PUBLIC_ORIGIN || `localhost:${port}`
  await configureDoc(app, { host })

  addErrorHandlers(app)

  // Log all registered routes on startup (if enabled)
  if (process.env.LOG_ROUTES === 'true' || process.env.DEBUG === 'true') {
    console.log('\n=== Registered Routes ===')
    const routes: Array<{ method: string; path: string }> = []
    
    // Helper function to recursively extract routes
    const extractRoutes = (stack: any[], basePath = '') => {
      stack.forEach((layer) => {
        if (layer.route) {
          // Direct route
          const methods = Object.keys(layer.route.methods)
            .filter((m) => layer.route.methods[m])
            .map((m) => m.toUpperCase())
          methods.forEach((method) => {
            routes.push({ method, path: basePath + layer.route.path })
          })
        } else if (layer.name === 'router' && layer.handle?.stack) {
          // Router middleware - recurse into it
          extractRoutes(layer.handle.stack, basePath + (layer.regexp.source.replace('\\/?', '').replace('(?=\\/|$)', '') || ''))
        }
      })
    }
    
    if (app._router?.stack) {
      extractRoutes(app._router.stack)
    }
    
    // Sort routes by method, then path
    routes.sort((a, b) => {
      if (a.method !== b.method) {
        return a.method.localeCompare(b.method)
      }
      return a.path.localeCompare(b.path)
    })
    
    if (routes.length > 0) {
      routes.forEach((route) => {
        console.log(`  ${route.method.padEnd(6)} ${route.path}`)
      })
      console.log(`\nTotal: ${routes.length} route(s)`)
    } else {
      console.log('  (Route introspection not available - routes may be registered dynamically)')
    }
    console.log('\nSwagger UI: http://localhost:' + port + '/doc')
    console.log('Swagger JSON: http://localhost:' + port + '/doc/swagger.json')
    console.log('==========================\n')
  }

  const server = app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
    if (process.env.LOG_ROUTES !== 'true' && process.env.DEBUG !== 'true') {
      console.log('Tip: Set LOG_ROUTES=true or DEBUG=true in .env to see all available routes on startup')
      console.log('Or visit http://localhost:' + port + '/doc for Swagger UI documentation')
    }
  })

  server.setTimeout(3000)
}

export { server }
