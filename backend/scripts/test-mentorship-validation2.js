const { MentorshipSchemas } = require('../src/utils/validation-schemas');

// Test data from the frontend
const testData = {
  mentor_id: "066794c1-c2cc-480d-a150-553398c48634",
  mentee_id: "1642d3a1-1ee2-44c8-ad1f-96e6ec041e74",
  start_date: "2025-09-25",
  notes: ""
};

console.log('Testing mentorship validation with data:', testData);
console.log('---');

const result = MentorshipSchemas.create.validate(testData);

if (result.error) {
  console.log('❌ Validation failed:');
  console.log('Error details:', result.error.details);
  result.error.details.forEach(detail => {
    console.log(`  - Field: ${detail.path.join('.')}`);
    console.log(`    Message: ${detail.message}`);
    console.log(`    Type: ${detail.type}`);
  });
} else {
  console.log('✅ Validation passed!');
  console.log('Validated data:', result.value);
}