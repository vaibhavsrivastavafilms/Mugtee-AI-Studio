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

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if (route === '/root' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Hello World' }))
    }
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Hello World' }))
    }

    if (route === '/status' && method === 'POST') {
      const body = await request.json()

      if (!body.client_name) {
        return handleCORS(
          NextResponse.json({ error: 'client_name is required' }, { status: 400 })
        )
      }

      const { v4: uuidv4 } = await import('uuid')
      const statusObj = {
        id: uuidv4(),
        client_name: body.client_name,
        timestamp: new Date(),
      }

      await db.collection('status_checks').insertOne(statusObj)
      return handleCORS(NextResponse.json(statusObj))
    }

    if (route === '/status' && method === 'GET') {
      const statusChecks = await db.collection('status_checks').find({}).limit(1000).toArray()
      const cleanedStatusChecks = statusChecks.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedStatusChecks))
    }

    return handleCORS(
      NextResponse.json({ error: `Route ${route} not found` }, { status: 404 })
    )
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
