const fs = require('fs');
const path = require('path');
const http = require('http');

const CERBOS_HOST = process.env.CERBOS_HOST || 'localhost';
const CERBOS_PORT = process.env.CERBOS_PORT || 3592;
const CERBOS_ADMIN_USER = process.env.CERBOS_ADMIN_USER || 'cerbos';
const CERBOS_ADMIN_PASS = process.env.CERBOS_ADMIN_PASS || 'cerbosAdmin';
const POLICIES_DIR = process.env.POLICIES_DIR || path.join(__dirname, '..', 'cerbos-policies');

async function uploadPolicy(policyContent) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ policies: [policyContent] });
    const auth = Buffer.from(`${CERBOS_ADMIN_USER}:${CERBOS_ADMIN_PASS}`).toString('base64');
    
    const options = {
      hostname: CERBOS_HOST,
      port: CERBOS_PORT,
      path: '/admin/policy',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Basic ${auth}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Cerbos Policy Upload Script ===');
  console.log(`Cerbos Server: ${CERBOS_HOST}:${CERBOS_PORT}`);
  console.log(`Policies Directory: ${POLICIES_DIR}`);
  console.log('');

  const yaml = require('yaml');
  
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  // Upload derived roles first
  const derivedRolesDir = path.join(POLICIES_DIR, 'derived_roles');
  if (fs.existsSync(derivedRolesDir)) {
    console.log('Uploading derived roles...');
    const files = fs.readdirSync(derivedRolesDir).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const filePath = path.join(derivedRolesDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const policy = yaml.parse(content);
        await uploadPolicy(policy);
        console.log(`  ✓ ${file}`);
        successCount++;
      } catch (err) {
        console.log(`  ✗ ${file}: ${err.message}`);
        errors.push({ file, error: err.message });
        failCount++;
      }
    }
  }

  // Upload resource policies
  const resourcesDir = path.join(POLICIES_DIR, 'resources');
  if (fs.existsSync(resourcesDir)) {
    console.log('\nUploading resource policies...');
    const files = fs.readdirSync(resourcesDir).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const filePath = path.join(resourcesDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const policy = yaml.parse(content);
        await uploadPolicy(policy);
        console.log(`  ✓ ${file}`);
        successCount++;
      } catch (err) {
        console.log(`  ✗ ${file}: ${err.message}`);
        errors.push({ file, error: err.message });
        failCount++;
      }
    }
  }

  // Upload principal policies
  const principalsDir = path.join(POLICIES_DIR, 'principals');
  if (fs.existsSync(principalsDir)) {
    console.log('\nUploading principal policies...');
    const files = fs.readdirSync(principalsDir).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const filePath = path.join(principalsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const policy = yaml.parse(content);
        await uploadPolicy(policy);
        console.log(`  ✓ ${file}`);
        successCount++;
      } catch (err) {
        console.log(`  ✗ ${file}: ${err.message}`);
        errors.push({ file, error: err.message });
        failCount++;
      }
    }
  }

  console.log('\n=== Upload Summary ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }
}

main().catch(console.error);
