import newman from 'newman';
import { readFileSync } from 'fs';

const collection = JSON.parse(readFileSync(process.env.TEMP + '/coursevia-col.json', 'utf8'));

newman.run({
  collection,
  reporters: ['cli'],
  reporter: { cli: { noSummary: false } },
  timeoutRequest: 10000,
}, (err, summary) => {
  if (err) {
    console.error('Newman error:', err);
    process.exit(1);
  }

  const stats = summary.run.stats;
  const failures = summary.run.failures;

  console.log('\n========== NEWMAN RESULTS ==========');
  console.log(`Requests:   ${stats.requests.total} total, ${stats.requests.failed} failed`);
  console.log(`Tests:      ${stats.assertions.total} total, ${stats.assertions.failed} failed`);

  if (failures.length > 0) {
    console.log('\n--- FAILURES ---');
    failures.forEach((f, i) => {
      console.log(`\n[${i + 1}] ${f.source.name || 'Unknown'}`);
      console.log(`    Error: ${f.error.message}`);
      if (f.error.test) console.log(`    Test:  ${f.error.test}`);
    });
  } else {
    console.log('\nAll tests passed!');
  }

  process.exit(failures.length > 0 ? 1 : 0);
});
