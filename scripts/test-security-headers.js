/**
 * Security Headers Test Script
 * 
 * This script tests if security headers are properly configured on your deployed application.
 * Run this after deploying to verify that all security headers are present and correctly configured.
 * 
 * Usage:
 *   node scripts/test-security-headers.js
 *   node scripts/test-security-headers.js https://your-app.netlify.app
 */

const https = require('https');
const http = require('http');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Expected security headers
const EXPECTED_HEADERS = {
  'content-security-policy': {
    required: true,
    impact: 'HIGH',
    mustContain: ["default-src", "'self'"],
  },
  'strict-transport-security': {
    required: true,
    impact: 'HIGH',
    mustContain: ['max-age'],
  },
  'x-frame-options': {
    required: true,
    impact: 'MEDIUM',
    mustContain: ['DENY', 'SAMEORIGIN'],
    mustContainOne: true,
  },
  'x-content-type-options': {
    required: true,
    impact: 'MEDIUM',
    mustContain: ['nosniff'],
  },
  'x-xss-protection': {
    required: false,
    impact: 'LOW',
    mustContain: ['1'],
  },
  'referrer-policy': {
    required: true,
    impact: 'LOW',
    mustContain: [],
  },
  'permissions-policy': {
    required: false,
    impact: 'MEDIUM',
    mustContain: [],
  },
  'cross-origin-embedder-policy': {
    required: false,
    impact: 'LOW',
    mustContain: [],
  },
  'cross-origin-opener-policy': {
    required: false,
    impact: 'LOW',
    mustContain: [],
  },
  'cross-origin-resource-policy': {
    required: false,
    impact: 'LOW',
    mustContain: [],
  },
};

/**
 * Fetch headers from a URL
 */
function fetchHeaders(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      method: 'HEAD',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'WizNote Security Header Checker',
      },
    };

    const req = protocol.request(options, (res) => {
      resolve({
        status: res.statusCode,
        headers: res.headers,
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Validate a header value
 */
function validateHeader(headerName, headerValue, config) {
  const results = {
    present: !!headerValue,
    valid: false,
    issues: [],
  };

  if (!headerValue) {
    if (config.required) {
      results.issues.push('Header is missing');
    }
    return results;
  }

  // Check if required values are present
  if (config.mustContain && config.mustContain.length > 0) {
    if (config.mustContainOne) {
      // At least one value must be present
      const hasOne = config.mustContain.some(val => 
        headerValue.toLowerCase().includes(val.toLowerCase())
      );
      if (!hasOne) {
        results.issues.push(`Must contain one of: ${config.mustContain.join(', ')}`);
      } else {
        results.valid = true;
      }
    } else {
      // All values must be present
      config.mustContain.forEach(value => {
        if (!headerValue.toLowerCase().includes(value.toLowerCase())) {
          results.issues.push(`Missing: ${value}`);
        }
      });
      results.valid = results.issues.length === 0;
    }
  } else {
    results.valid = true;
  }

  return results;
}

/**
 * Print test results
 */
function printResults(url, headers, testResults) {
  console.log('\n' + colors.bold + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.bold + colors.cyan + '🔒 Security Headers Test Results' + colors.reset);
  console.log(colors.bold + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(`\n${colors.bold}URL:${colors.reset} ${url}\n`);

  let totalScore = 0;
  let maxScore = 0;
  const headerResults = [];

  // Test each expected header
  Object.entries(EXPECTED_HEADERS).forEach(([headerName, config]) => {
    const headerValue = headers[headerName] || headers[headerName.toLowerCase()];
    const validation = validateHeader(headerName, headerValue, config);
    
    const impactScore = {
      'HIGH': 30,
      'MEDIUM': 20,
      'LOW': 10,
    };

    maxScore += impactScore[config.impact];

    let status, color;
    if (validation.present && validation.valid) {
      status = '✅ PASS';
      color = colors.green;
      totalScore += impactScore[config.impact];
    } else if (validation.present && !validation.valid) {
      status = '⚠️  WARN';
      color = colors.yellow;
      totalScore += impactScore[config.impact] / 2;
    } else if (!validation.present && config.required) {
      status = '❌ FAIL';
      color = colors.red;
    } else {
      status = '⚪ SKIP';
      color = colors.reset;
    }

    headerResults.push({
      name: headerName,
      status,
      color,
      validation,
      config,
      value: headerValue,
    });
  });

  // Print header results
  console.log(colors.bold + 'Header Results:' + colors.reset);
  console.log('');

  headerResults.forEach(result => {
    const impact = `[${result.config.impact}]`.padEnd(10);
    const headerName = result.name.padEnd(35);
    
    console.log(`  ${result.color}${result.status}${colors.reset} ${impact} ${headerName}`);
    
    if (result.value) {
      const truncatedValue = result.value.length > 60 
        ? result.value.substring(0, 60) + '...' 
        : result.value;
      console.log(`       ${colors.reset}${truncatedValue}${colors.reset}`);
    }
    
    if (result.validation.issues.length > 0) {
      result.validation.issues.forEach(issue => {
        console.log(`       ${colors.yellow}⚠ ${issue}${colors.reset}`);
      });
    }
    console.log('');
  });

  // Calculate and print score
  const scorePercentage = Math.round((totalScore / maxScore) * 100);
  let grade, gradeColor;

  if (scorePercentage >= 90) {
    grade = 'A+';
    gradeColor = colors.green;
  } else if (scorePercentage >= 80) {
    grade = 'A';
    gradeColor = colors.green;
  } else if (scorePercentage >= 70) {
    grade = 'B';
    gradeColor = colors.yellow;
  } else if (scorePercentage >= 60) {
    grade = 'C';
    gradeColor = colors.yellow;
  } else {
    grade = 'F';
    gradeColor = colors.red;
  }

  console.log(colors.bold + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.bold + `Security Score: ${gradeColor}${scorePercentage}/100 (Grade: ${grade})${colors.reset}`);
  console.log(colors.bold + colors.cyan + '='.repeat(80) + colors.reset);

  // Recommendations
  console.log('\n' + colors.bold + 'Recommendations:' + colors.reset);
  
  const failedHeaders = headerResults.filter(r => r.status.includes('FAIL'));
  const warnHeaders = headerResults.filter(r => r.status.includes('WARN'));

  if (failedHeaders.length === 0 && warnHeaders.length === 0) {
    console.log(`  ${colors.green}✅ All critical security headers are properly configured!${colors.reset}`);
  } else {
    if (failedHeaders.length > 0) {
      console.log(`  ${colors.red}❌ ${failedHeaders.length} critical header(s) missing${colors.reset}`);
      failedHeaders.forEach(h => {
        console.log(`     - ${h.name}`);
      });
    }
    if (warnHeaders.length > 0) {
      console.log(`  ${colors.yellow}⚠️  ${warnHeaders.length} header(s) need improvement${colors.reset}`);
      warnHeaders.forEach(h => {
        console.log(`     - ${h.name}`);
      });
    }
  }

  console.log('\n' + colors.bold + 'Next Steps:' + colors.reset);
  console.log(`  1. Review docs/SECURITY_HEADERS_SETUP.md`);
  console.log(`  2. Test online: https://securityheaders.com/?q=${encodeURIComponent(url)}`);
  console.log(`  3. Check Mozilla Observatory: https://observatory.mozilla.org/analyze/${new URL(url).hostname}`);
  console.log('');

  return scorePercentage >= 70;
}

/**
 * Main test function
 */
async function testSecurityHeaders(url) {
  try {
    console.log(`${colors.cyan}Testing security headers for: ${url}${colors.reset}`);
    console.log('Fetching headers...\n');

    const response = await fetchHeaders(url);

    if (response.status !== 200 && response.status !== 301 && response.status !== 302) {
      console.log(`${colors.yellow}⚠️  Warning: Received status code ${response.status}${colors.reset}`);
    }

    const passed = printResults(url, response.headers, EXPECTED_HEADERS);

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ Error testing security headers:${colors.reset}`, error.message);
    console.log('\nTroubleshooting:');
    console.log('  - Ensure the URL is correct and accessible');
    console.log('  - Check if the site is deployed');
    console.log('  - Verify your network connection');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const testUrl = args[0] || process.env.APP_URL || 'http://localhost:8081';

// Validate URL
try {
  new URL(testUrl);
} catch (error) {
  console.error(`${colors.red}❌ Invalid URL: ${testUrl}${colors.reset}`);
  console.log('\nUsage: node scripts/test-security-headers.js [URL]');
  console.log('Example: node scripts/test-security-headers.js https://your-app.netlify.app');
  process.exit(1);
}

// Run the test
testSecurityHeaders(testUrl);

