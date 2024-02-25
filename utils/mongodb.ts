import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
    throw new Error('env var for mongodb URI missing');
}

const uri = process.env.MONGODB_URI
const options = {}

let client
let mongoClientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!(global as any)._mongoClientPromise) {
        client = new MongoClient(uri, options);
        (global as any)._mongoClientPromise = client.connect()
    }
    mongoClientPromise = (global as any)._mongoClientPromise
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options)
    mongoClientPromise = client.connect()
}

export default mongoClientPromise