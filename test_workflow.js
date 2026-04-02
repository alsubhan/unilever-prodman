import assert from 'assert';

async function checkStatus(planId, expectedStatus, token) {
  const res = await fetch(`http://localhost:3001/api/production-plans/${planId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(`Status check: Expected '${expectedStatus}', Got '${data.status}'`);
  assert.strictEqual(data.status, expectedStatus, `Plan status is ${data.status} but expected ${expectedStatus}`);
}

async function runWorkflowTest() {
  const BASE_URL = 'http://localhost:3001/api';

  console.log('--- Starting Production Workflow Test ---\n');

  // 1. Authenticate
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
  });
  const { token } = await loginRes.json();
  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  assert(token, 'Failed to authenticate');

  // 2. Fetch dependencies
  const machines = await (await fetch(`${BASE_URL}/packing-machines`, { headers: authHeaders })).json();
  const materials = await (await fetch(`${BASE_URL}/packing-materials`, { headers: authHeaders })).json();
  
  if (!machines.length || !materials.length) throw new Error('Need at least 1 machine and 1 material');
  const machine = machines[0];
  const material = materials[0]; // (Will be one of the Tea/Coffee from previous step)

  console.log(`Using Machine: ${machine.machine_code} - Material: ${material.part_number}\n`);

  // Phase 1: Draft
  const now = new Date();
  const later = new Date(now.getTime() + 60*60*1000);
  console.log('-> Creating Plan (Draft)');
  const createRes = await fetch(`${BASE_URL}/production-plans`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      machine_id: machine.id,
      packing_material_id: material.id,
      start_datetime: now.toISOString(),
      end_datetime: later.toISOString(),
      notes: 'Test end-to-end workflow'
    })
  });
  const plan = await createRes.json();
  if (createRes.status !== 201) throw plan;
  const planId = plan.id;
  await checkStatus(planId, 'draft', token);

  // Phase 2: Submit
  console.log('\n-> Submitting Plan (Pending Approval)');
  await fetch(`${BASE_URL}/production-plans/${planId}/submit`, { method: 'POST', headers: authHeaders });
  await checkStatus(planId, 'pending_approval', token);

  // Phase 3: Approve
  console.log('\n-> Approving Plan (Approved)');
  await fetch(`${BASE_URL}/production-plans/${planId}/approve`, { method: 'POST', headers: authHeaders });
  await checkStatus(planId, 'approved', token);

  // Phase 4: Valid Scan (In Progress)
  console.log('\n-> Scanning Material on Machine (In Progress)');
  const scanRes = await fetch(`${BASE_URL}/scan/validate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      machine_barcode: machine.machine_code,
      material_barcode: material.part_number
    })
  });
  const scanData = await scanRes.json();
  assert(scanData.is_valid, 'Scan should be marked as valid');
  await checkStatus(planId, 'in_progress', token);

  // Phase 5: Complete
  console.log('\n-> Completing Plan (Completed)');
  await fetch(`${BASE_URL}/production-plans/${planId}/complete`, { method: 'POST', headers: authHeaders });
  await checkStatus(planId, 'completed', token);

  console.log(`\n✅ Workflow successfully completed for Plan #${planId}! ALL tests passed.`);
}

runWorkflowTest().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
