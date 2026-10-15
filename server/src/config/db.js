const mongoose = require('mongoose');

/**
 * Mask sensitive credentials in MongoDB URI for safe logging
 */
const maskUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/(.*):(.*)@/, '//$1:****@');
};

/**
 * Connect to MongoDB
 * Prioritizes process.env.MONGO_URI (with MONGODB_URI as secondary alias).
 * In production (e.g. Render), prevents falling back to localhost and logs a clear actionable diagnostic.
 */
const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

  // 1. Prioritize process.env.MONGO_URI, with process.env.MONGODB_URI as alias
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  // 2. Production check: If deployed and MONGO_URI is missing, do NOT attempt 127.0.0.1:27017
  if (isProduction && !uri) {
    console.error('================================================================');
    console.error('FATAL: Database configuration error in production deployment!');
    console.error('process.env.MONGO_URI is undefined.');
    console.error('');
    console.error('Render requires you to set the MONGO_URI environment variable:');
    console.error('  1. Open your Render Dashboard -> Select your Web Service');
    console.error('  2. Click the "Environment" tab');
    console.error('  3. Add Environment Variable:');
    console.error('     Key:   MONGO_URI');
    console.error('     Value: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/gatehouse?retryWrites=true&w=majority');
    console.error('  4. Save changes to trigger automatic redeployment.');
    console.error('================================================================');
    process.exit(1);
  }

  // 3. Fallback to local MongoDB only during local development
  const targetUri = uri || 'mongodb://127.0.0.1:27017/gatehouse';

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected successfully to: ${conn.connection.host}:${conn.connection.port || 'default'}/${conn.connection.name}`);
    return conn.connection;
  } catch (err) {
    console.error('================================================================');
    if (isProduction) {
      console.error('FATAL: Unable to connect to MongoDB cluster in production!');
      console.error(`Attempted Connection URI: ${maskUri(targetUri)}`);
      console.error(`Error Details: ${err.message}`);
      console.error('');
      console.error('Common fixes on Render & MongoDB Atlas:');
      console.error('  1. Check Network Access in Atlas: Ensure IP Access List allows "0.0.0.0/0" (anywhere).');
      console.error('  2. Check Database User: Ensure the database user credentials in MONGO_URI are correct.');
      console.error('  3. Check URI formatting: Ensure special characters in password are URL-encoded.');
    } else {
      console.error('FATAL: Local MongoDB service is not running on port 27017!');
      console.error(`Attempted Connection URI: ${targetUri}`);
      console.error(`Underlying Error: ${err.message}`);
      console.error('Please ensure the Windows MongoDB service is actively running:');
      console.error('  PowerShell (Admin): Start-Service -Name MongoDB');
      console.error('  Or launch services.msc and start "MongoDB Server (MongoDB)"');
    }
    console.error('================================================================');
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
