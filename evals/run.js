const fs = require('fs');
const path = require('path');

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf-8'));

async function runEval() {
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testCase of cases) {
    try {
      const response = await fetch('http://localhost:3000/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.input)
      });

      const data = await response.json();

      if (data.category === testCase.expected_category) {
        passed++;
        console.log(`✅ PASS — "${testCase.input.title}" → ${data.category}`);
      } else {
        failed++;
        failures.push({
          title: testCase.input.title,
          expected: testCase.expected_category,
          got: data.category
        });
        console.log(`❌ FAIL — "${testCase.input.title}" → expected: ${testCase.expected_category}, got: ${data.category}`);
      }
    } catch (err) {
      failed++;
      console.log(`❌ ERROR — "${testCase.input.title}" → ${err.message}`);
    }
  }

  console.log(`\nResult: ${passed}/${cases.length} passed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f.title}: expected ${f.expected}, got ${f.got}`));
  }
}

runEval();