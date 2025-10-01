const { execSync } = require('child_process');

try {
  console.log('Running leagues import test...');
  const output = execSync('npx jest --testPathPattern=leagues.test.ts --testNamePattern="should be able to import" --verbose 2>&1', {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    timeout: 30000
  });
  console.log('SUCCESS:\n', output);
} catch (error) {
  console.log('FAILED');
  console.log('Exit code:', error.status);
  console.log('Signal:', error.signal);
  console.log('\nSTDOUT:', error.stdout);
  console.log('\nSTDERR:', error.stderr);

  // Look for actual error message
  if (error.stdout && error.stdout.includes('●')) {
    const lines = error.stdout.split('\n');
    let capturing = false;
    console.log('\nERROR DETAILS:');
    for (const line of lines) {
      if (line.includes('● Leagues Routes Integration Tests')) {
        capturing = true;
      }
      if (capturing) {
        console.log(line);
        if (line.trim() === '' && capturing) break;
      }
    }
  }
}