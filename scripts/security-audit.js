/**
 * Security Audit Script
 * 
 * Runs npm audit and dependency vulnerability scanning
 * Part of Priority 3.4: Dependency Scanning
 * 
 * Usage:
 *   node scripts/security-audit.js [--fail-on-high] [--fix]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FAIL_ON_HIGH = process.argv.includes('--fail-on-high');
const AUTO_FIX = process.argv.includes('--fix');

console.log('🔒 WizNote Security Audit\n');
console.log('Running dependency vulnerability scan...\n');

try {
  // Run npm audit
  console.log('📦 Running npm audit...');
  const auditOutput = execSync('npm audit --json', { 
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'pipe']
  }).toString();

  let auditData;
  try {
    auditData = JSON.parse(auditOutput);
  } catch (parseError) {
    // npm audit might output warnings to stderr before JSON
    const jsonMatch = auditOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      auditData = JSON.parse(jsonMatch[0]);
    } else {
      console.error('❌ Failed to parse npm audit output');
      process.exit(1);
    }
  }

  const vulnerabilities = auditData.vulnerabilities || {};
  const summary = auditData.metadata?.vulnerabilities || {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0
  };

  console.log('\n📊 Vulnerability Summary:');
  console.log(`  Info:        ${summary.info}`);
  console.log(`  Low:         ${summary.low}`);
  console.log(`  Moderate:    ${summary.moderate}`);
  console.log(`  High:        ${summary.high}`);
  console.log(`  Critical:    ${summary.critical}`);
  console.log(`  Total:       ${summary.info + summary.low + summary.moderate + summary.high + summary.critical}\n`);

  // List critical and high vulnerabilities
  const criticalHigh = Object.entries(vulnerabilities)
    .filter(([_, vuln]) => vuln.severity === 'critical' || vuln.severity === 'high')
    .map(([name, vuln]) => ({
      name,
      severity: vuln.severity,
      via: vuln.via || [],
      title: vuln.title || name
    }));

  if (criticalHigh.length > 0) {
    console.log('⚠️  Critical & High Vulnerabilities:');
    criticalHigh.forEach(({ name, severity, via, title }) => {
      console.log(`\n  ${severity.toUpperCase()}: ${name}`);
      console.log(`    ${title}`);
      if (via.length > 0 && typeof via[0] === 'object') {
        console.log(`    CVE: ${via[0].cve || 'N/A'}`);
      }
    });
    console.log('');
  }

  // Check if we should fail on high vulnerabilities
  if (FAIL_ON_HIGH && (summary.high > 0 || summary.critical > 0)) {
    console.error('❌ Security audit failed: High or critical vulnerabilities found');
    console.error('   Run with --fix to attempt automatic fixes, or review manually');
    process.exit(1);
  }

  // Attempt auto-fix if requested
  if (AUTO_FIX && (summary.moderate > 0 || summary.high > 0 || summary.critical > 0)) {
    console.log('\n🔧 Attempting to fix vulnerabilities automatically...');
    try {
      execSync('npm audit fix --force', { stdio: 'inherit' });
      console.log('✅ Automatic fixes applied. Please review changes and test.');
    } catch (fixError) {
      console.error('⚠️  Automatic fix failed. Please review vulnerabilities manually.');
      console.error('   Run: npm audit fix');
    }
  }

  // Save audit report
  const reportPath = path.join(process.cwd(), 'security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditData, null, 2));
  console.log(`\n📄 Full audit report saved to: ${reportPath}`);

  // Overall status
  if (summary.critical > 0 || summary.high > 0) {
    console.log('\n⚠️  Action required: High or critical vulnerabilities detected');
    process.exit(FAIL_ON_HIGH ? 1 : 0);
  } else if (summary.moderate > 0) {
    console.log('\n⚠️  Warning: Moderate vulnerabilities detected (recommend review)');
    process.exit(0);
  } else {
    console.log('\n✅ Security audit passed: No high or critical vulnerabilities');
    process.exit(0);
  }

} catch (error) {
  console.error('❌ Security audit failed:', error.message);
  
  // If npm audit command doesn't exist or fails
  if (error.message.includes('npm audit')) {
    console.error('\n💡 Tip: Make sure npm is installed and package.json exists');
  }
  
  process.exit(1);
}



