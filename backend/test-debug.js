const { execSync } = require('child_process');

try {
  const output = execSync('npm test -- --testPathPattern=leagues.test.ts --testNamePattern="should be able to import" --no-coverage --verbose', {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  console.log(output);
} catch (error) {
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
}