/**
 * Automated Integration Test Suite for SmartWallet API
 * Simulated deposit, withdrawal, and transfer workflows.
 * Run using: node src/test_wallet.js
 */
const { spawn } = require('child_process');
const path = require('path');

// Configure test port to avoid collision with dev server
const TEST_PORT = '5555';
process.env.PORT = TEST_PORT;
process.env.NODE_ENV = 'test';

const BASE_URL = `http://localhost:${TEST_PORT}`;

// Helper: wait for ms
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: run custom HTTP requests using built-in fetch
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function runTests() {
  console.log('=== Starting SmartWallet Integration Tests ===');

  // 1. Log in as Nguyễn Văn Thuận (has verified KYC)
  console.log('\n[1] Logging in as thuan@smartwallet.com...');
  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'thuan@smartwallet.com',
      password: 'thuan@123456',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }

  const token = loginRes.data.data.accessToken;
  console.log('   ✓ Login successful.');
  console.log(`   ✓ KYC status: ${loginRes.data.data.user.kyc_status}`);
  console.log(`   ✓ Has Transaction PIN: ${loginRes.data.data.user.has_pin}`);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Ensure Transaction PIN is set to '1234'
  console.log('\n[2] Setting Transaction PIN to "1234"...');
  const pinRes = await apiRequest('/api/auth/set-pin', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ pin: '1234' }),
  });

  if (!pinRes.ok) {
    throw new Error(`Failed to set PIN: ${JSON.stringify(pinRes.data)}`);
  }
  console.log('   ✓ PIN configured successfully.');

  // 3. Link Bank Account (Nguyễn Văn Thuận)
  console.log('\n[3] Linking Bank Account (Vietcombank)...');
  const linkRes = await apiRequest('/api/banks/link', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      bank_code: 'Vietcombank',
      account_number: '1234567890',
      account_name: 'Nguyễn Văn Thuận',
    }),
  });

  if (linkRes.status === 409) {
    console.log('   ✓ Bank account already linked. Proceeding.');
  } else if (!linkRes.ok) {
    throw new Error(`Failed to link bank account: ${JSON.stringify(linkRes.data)}`);
  } else {
    console.log('   ✓ Bank account linked successfully.');
  }

  // 4. Retrieve Bank Account ID
  console.log('\n[4] Querying linked bank accounts...');
  const banksRes = await apiRequest('/api/banks/me', {
    method: 'GET',
    headers: authHeaders,
  });

  if (!banksRes.ok) {
    throw new Error(`Failed to fetch linked bank accounts: ${JSON.stringify(banksRes.data)}`);
  }

  const vietcombank = banksRes.data.find(b => b.bank_code === 'Vietcombank');
  if (!vietcombank) {
    throw new Error('Could not find the linked Vietcombank account.');
  }

  const bankAccountId = vietcombank.id;
  console.log(`   ✓ Vietcombank account ID retrieved: ${bankAccountId}`);

  // 5. Query Wallet Stats / Initial Balance
  console.log('\n[5] Fetching initial wallet statistics...');
  const statsBeforeRes = await apiRequest('/api/wallet/stats', {
    method: 'GET',
    headers: authHeaders,
  });

  if (!statsBeforeRes.ok) {
    throw new Error(`Failed to fetch wallet stats: ${JSON.stringify(statsBeforeRes.data)}`);
  }

  const balanceBefore = statsBeforeRes.data.stats.currentBalance;
  console.log(`   ✓ Current available balance: ${balanceBefore.toLocaleString('vi-VN')} ₫`);

  // 6. Perform Wallet Deposit Simulation
  const depositAmount = 250000;
  console.log(`\n[6] Depositing ${depositAmount.toLocaleString('vi-VN')} ₫ from bank account...`);
  const depositRes = await apiRequest('/api/wallet/deposit', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      bankAccountId,
      amount: String(depositAmount),
    }),
  });

  if (!depositRes.ok) {
    throw new Error(`Deposit simulation failed: ${JSON.stringify(depositRes.data)}`);
  }

  console.log('   ✓ Deposit request completed.');
  console.log(`   ✓ Status: ${depositRes.data.status}`);
  console.log(`   ✓ Reference code: ${depositRes.data.referenceCode}`);
  console.log(`   ✓ New balance: ${depositRes.data.wallet.balance.toLocaleString('vi-VN')} ₫`);

  // 7. Perform Wallet Withdrawal Simulation
  const withdrawAmount = 100000;
  console.log(`\n[7] Withdrawing ${withdrawAmount.toLocaleString('vi-VN')} ₫ to bank...`);
  const withdrawRes = await apiRequest('/api/wallet/withdraw', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      amount: String(withdrawAmount),
      bank_code: 'Vietcombank',
      account_number: '1234567890',
      account_name: 'Nguyễn Văn Thuận',
      pin_code: '1234',
      note: 'API integration test withdrawal',
    }),
  });

  if (!withdrawRes.ok) {
    throw new Error(`Withdrawal simulation failed: ${JSON.stringify(withdrawRes.data)}`);
  }

  console.log('   ✓ Withdrawal completed.');
  console.log(`   ✓ Reference code: ${withdrawRes.data.referenceCode}`);
  console.log(`   ✓ Final balance: ${withdrawRes.data.wallet.balance.toLocaleString('vi-VN')} ₫`);

  // 8. Perform Wallet-to-Wallet Transfer Simulation
  const transferAmount = 50000;
  console.log(`\n[8] Transferring ${transferAmount.toLocaleString('vi-VN')} ₫ to duyen@smartwallet.com...`);
  const transferRes = await apiRequest('/api/wallet/transfer', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      dest_email: 'duyen@smartwallet.com',
      amount: String(transferAmount),
      pin_code: '1234',
      note: 'API integration test transfer',
    }),
  });

  if (!transferRes.ok) {
    throw new Error(`Transfer simulation failed: ${JSON.stringify(transferRes.data)}`);
  }

  console.log('   ✓ Transfer completed.');
  console.log(`   ✓ Reference code: ${transferRes.data.reference_code || transferRes.data.referenceCode}`);
  console.log(`   ✓ Sender's new balance: ${transferRes.data.wallet.balance.toLocaleString('vi-VN')} ₫`);

  console.log('\n=== All wallet integration tests passed successfully! ===');
}

// Spawns the SmartWallet backend server dynamically
async function main() {
  console.log('Booting test server on port', TEST_PORT);
  
  const serverPath = path.join(__dirname, 'server.js');
  const serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: TEST_PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverStarted = false;

  // Read stdout to wait for startup confirmation
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server stdout] ${output.trim()}`);
    if (output.includes('Server running on port') || output.includes('listening')) {
      serverStarted = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server stderr] ${data.toString().trim()}`);
  });

  // Give the server time to bind to the port
  for (let i = 0; i < 15; i++) {
    if (serverStarted) break;
    await sleep(200);
  }

  try {
    await runTests();
    process.exitCode = 0;
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    console.log('\nShutting down test server...');
    serverProcess.kill('SIGTERM');
    await sleep(500);
    process.exit(process.exitCode);
  }
}

main();
