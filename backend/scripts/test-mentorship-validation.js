const Joi = require('joi');

// Test the validation schema
const BaseSchemas = {
  id: Joi.string().uuid().required(),
  notes: Joi.string().max(1000).optional()
};

const MentorshipCreateSchema = Joi.object({
  mentor_id: BaseSchemas.id,
  mentee_id: BaseSchemas.id,
  start_date: Joi.date().iso().required(),
  notes: BaseSchemas.notes
});

// Test data from the frontend
const testData = {
  mentor_id: "066794c1-c2cc-480d-a150-553398c48634",
  mentee_id: "1642d3a1-1ee2-44c8-ad1f-96e6ec041e74",
  start_date: "2025-09-25",
  notes: ""
};

console.log('Testing mentorship validation with data:', testData);
console.log('---');

const result = MentorshipCreateSchema.validate(testData);

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

// Try with a proper ISO date
console.log('\n---\nTesting with ISO 8601 date format:');
const testData2 = {
  ...testData,
  start_date: "2025-09-25T00:00:00.000Z"
};

const result2 = MentorshipCreateSchema.validate(testData2);
if (result2.error) {
  console.log('❌ Validation failed:', result2.error.message);
} else {
  console.log('✅ Validation passed!');
}

// Try with a Date object
console.log('\n---\nTesting with Date object:');
const testData3 = {
  ...testData,
  start_date: new Date("2025-09-25")
};

const result3 = MentorshipCreateSchema.validate(testData3);
if (result3.error) {
  console.log('❌ Validation failed:', result3.error.message);
} else {
  console.log('✅ Validation passed!');
}