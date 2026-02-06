#!/bin/bash

# Run all batches in parallel
# Usage: ./run_validation.sh [number_of_parallel_runs]

PARALLEL_RUNS=${1:-5}  # Default 5 parallel runs

echo "🚀 Running league validation in $PARALLEL_RUNS parallel processes..."
echo ""

# Run each batch in background
for i in $(seq 1 $PARALLEL_RUNS); do
    echo "▶️  Starting run $i/$PARALLEL_RUNS"
    node src/scripts/validate_leagues_batch.js $i $PARALLEL_RUNS > "validation_run_$i.log" 2>&1 &
done

# Wait for all to complete
wait

echo ""
echo "✅ All validation runs completed!"
echo ""
echo "📄 Merging results..."

# Merge all JSON reports
node -e "
const fs = require('fs');
const merged = {
    date: new Date().toISOString(),
    results: { errors: [], warnings: [], finished: [], active: [] },
    summary: { checked: 0, active: 0, finished: 0, warnings: 0, errors: 0 }
};

for (let i = 1; i <= $PARALLEL_RUNS; i++) {
    const file = \`league_validation_batch_\${i}.json\`;
    if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file));
        merged.results.errors.push(...data.results.errors);
        merged.results.warnings.push(...data.results.warnings);
        merged.results.finished.push(...data.results.finished);
        merged.results.active.push(...data.results.active);
        merged.summary.checked += data.summary.checked;
        merged.summary.active += data.summary.active;
        merged.summary.finished += data.summary.finished;
        merged.summary.warnings += data.summary.warnings;
        merged.summary.errors += data.summary.errors;
    }
}

fs.writeFileSync('league_validation_FULL.json', JSON.stringify(merged, null, 2));
console.log('');
console.log('=' .repeat(80));
console.log('📊 FINAL SUMMARY');
console.log('='.repeat(80));
console.log(\`   Total Checked: \${merged.summary.checked}\`);
console.log(\`   Active: \${merged.summary.active}\`);
console.log(\`   Finished: \${merged.summary.finished}\`);
console.log(\`   Warnings: \${merged.summary.warnings}\`);
console.log(\`   Errors: \${merged.summary.errors}\`);
console.log('='.repeat(80));
console.log('');
console.log('💾 Full report: league_validation_FULL.json');
console.log('📋 Individual logs: validation_run_*.log');
console.log('');
"

# Show errors if any
if [ -f league_validation_FULL.json ]; then
    node -e "
const data = JSON.parse(require('fs').readFileSync('league_validation_FULL.json'));
if (data.results.errors.length > 0) {
    console.log('');
    console.log('❌ ERRORS FOUND:');
    data.results.errors.forEach(e => {
        console.log(\`   \${e.name} (\${e.id}) - \${e.country}\`);
        console.log(\`      → \${e.recommendation}\`);
    });
    console.log('');
}
"
fi
