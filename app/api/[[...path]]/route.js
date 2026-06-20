import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let client
let db

async function connectToMongo() {
  if (!db) {
    const { MongoClient } = await import('mongodb')
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function resolveCorsOrigin(request) {
  const origin = request.headers.get('origin')
  const rawOrigins = process.env.CORS_ORIGINS?.split(',').map((item) => item.trim()).filter(Boolean) ?? []

  if (!origin) {
    return rawOrigins.includes('*') ? '*' : rawOrigins[0] ?? '*'
  }

  if (rawOrigins.length === 0 || rawOrigins.includes('*')) {
    return origin
  }

  return rawOrigins.includes(origin) ? origin : undefined
}

function handleCORS(response, request) {
  const origin = resolveCorsOrigin(request)
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  if (request.headers.get('origin')) {
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  if (origin && origin !== '*') {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  response.headers.set('Access-Control-Expose-Headers', 'Location, X-Total-Count')
  return response
}

export async function OPTIONS(request) {
  return handleCORS(new NextResponse(null, { status: 204 }), request)
}

async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if (route === '/root' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Hello World' }), request)
    }
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Hello World' }), request)
    }

    if (route === '/status' && method === 'POST') {
      const body = await request.json()

      if (!body.client_name) {
        return handleCORS(
          NextResponse.json({ error: 'client_name is required' }, { status: 400 }),
          request
        )
      }

      const { v4: uuidv4 } = await import('uuid')
      const statusObj = {
        id: uuidv4(),
        client_name: body.client_name,
        timestamp: new Date(),
      }

      await db.collection('status_checks').insertOne(statusObj)
      return handleCORS(NextResponse.json(statusObj), request)
    }

    if (route === '/status' && method === 'GET') {
      const statusChecks = await db.collection('status_checks').find({}).limit(1000).toArray()
      const cleanedStatusChecks = statusChecks.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedStatusChecks), request)
    }

    return handleCORS(
      NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }),
      request
    )
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }), request)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
