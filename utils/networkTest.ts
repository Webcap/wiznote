// Network connectivity test utility
export const testNetworkConnectivity = async (): Promise<{
  isOnline: boolean;
  supabaseReachable: boolean;
  details: string[];
}> => {
  const details: string[] = [];
  let isOnline = false;
  let supabaseReachable = false;

  try {
    // Test basic internet connectivity
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    isOnline = true;
    details.push('✓ Basic internet connectivity: OK');
  } catch (error) {
    details.push('✗ Basic internet connectivity: FAILED');
    return { isOnline: false, supabaseReachable: false, details };
  }

  try {
    // Test Supabase endpoint (using a generic Supabase URL pattern)
    const supabaseResponse = await fetch('https://supabase.com', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    supabaseReachable = true;
    details.push('✓ Supabase endpoint: REACHABLE');
  } catch (error) {
    details.push('✗ Supabase endpoint: UNREACHABLE');
  }

  try {
    // Test general API connectivity
    const apiResponse = await fetch('https://httpbin.org/get', {
      method: 'GET',
    });
    details.push('✓ General API connectivity: OK');
  } catch (error) {
    details.push('✗ General API connectivity: FAILED');
  }

  return { isOnline, supabaseReachable, details };
};

export const logNetworkStatus = async (): Promise<void> => {
  console.log('=== Network Connectivity Test ===');
  const result = await testNetworkConnectivity();
  
  console.log('Overall Status:', result.isOnline ? 'ONLINE' : 'OFFLINE');
  console.log('Supabase Reachable:', result.supabaseReachable ? 'YES' : 'NO');
  console.log('Details:');
  result.details.forEach(detail => console.log('  ' + detail));
  console.log('================================');
}; 