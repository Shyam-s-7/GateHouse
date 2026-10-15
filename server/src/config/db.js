const mongoose = require('mongoose');

/**
 * Connect to Local MongoDB Community Server
 * Strict direct connection without fallback. Exits with fatal error on connection failure.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gatehouse';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected successfully to: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn.connection;
  } catch (err) {
    console.error('================================================================');
    console.error('FATAL: Local MongoDB service is not running on port 27017!');
    console.error(`Attempted Connection URI: ${uri}`);
    console.error(`Underlying Error: ${err.message}`);
    console.error('Please ensure the Windows MongoDB service is actively running:');
    console.error('  PowerShell (Admin): Start-Service -Name MongoDB');
    console.error('  Or launch services.msc and start "MongoDB Server (MongoDB)"');
    console.error('================================================================');
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
