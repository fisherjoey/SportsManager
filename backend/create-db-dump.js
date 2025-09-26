require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'sports_manager'
};

// Create dumps directory if it doesn't exist
const dumpsDir = path.join(__dirname, 'dumps');
if (!fs.existsSync(dumpsDir)) {
  fs.mkdirSync(dumpsDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const dumpFile = path.join(dumpsDir, `sports_manager_dump_${timestamp}.sql`);

// Build pg_dump command
const pgDumpCommand = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} --no-owner --no-acl --if-exists --clean --no-comments`;

console.log('Creating database dump...');
console.log(`Output file: ${dumpFile}`);

// Set PGPASSWORD environment variable for pg_dump
const env = { ...process.env, PGPASSWORD: config.password };

exec(pgDumpCommand, { env }, (error, stdout, stderr) => {
  if (error) {
    console.error('Error creating dump:', error);
    if (stderr) console.error('stderr:', stderr);
    process.exit(1);
  }

  // Write the dump to file
  fs.writeFileSync(dumpFile, stdout);
  console.log(`✓ Database dump created successfully: ${dumpFile}`);
  console.log(`  File size: ${(fs.statSync(dumpFile).size / 1024).toFixed(2)} KB`);

  // Also create a latest.sql for easy access
  const latestFile = path.join(dumpsDir, 'latest.sql');
  fs.copyFileSync(dumpFile, latestFile);
  console.log(`✓ Also saved as: ${latestFile}`);
});