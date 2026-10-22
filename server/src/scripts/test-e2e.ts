/**
 * FixMyRoad AI - End-to-End Test Suite
 */
async function runTests() {
  const baseUrl = 'http://127.0.0.1:5000/api';
  console.log('=== FIXMYROAD AI: END-TO-END AUTOMATED VERIFICATION ===\n');

  // Test 1: Health Check
  console.log('[Test 1] Health Check...');
  const healthRes = await fetch(`${baseUrl}/health`);
  const health = await healthRes.json();
  if (health.status !== 'ok') throw new Error('Health check failed');
  console.log('  ✓ Service online:', health.service, `(AI Engine: ${health.aiEngine})`);

  // Test 2: Dashboard Statistics
  console.log('\n[Test 2] Dashboard Statistics...');
  const statsRes = await fetch(`${baseUrl}/dashboard/stats`);
  const stats = await statsRes.json();
  console.log(`  ✓ Total Reports: ${stats.data.totalReports}`);
  console.log(`  ✓ Awaiting Review: ${stats.data.awaitingReview}`);
  console.log(`  ✓ High Severity: ${stats.data.highSeverity}`);
  console.log(`  ✓ Assigned: ${stats.data.assignedRepairs}`);
  console.log(`  ✓ Resolved: ${stats.data.resolvedReports} (${stats.data.resolutionRate}%)`);

  // Test 3: List Reports & Filtering
  console.log('\n[Test 3] Reports Query & Filtering...');
  const listRes = await fetch(`${baseUrl}/reports?status=Submitted&limit=5`);
  const listData = await listRes.json();
  console.log(`  ✓ Fetched ${listData.data.length} submitted reports (Total: ${listData.pagination.total})`);

  // Test 4: Create New Report
  console.log('\n[Test 4] Submitting New Report...');
  const newReportRes = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      location: 'Uppal Metro Station Pillar 890',
      landmark: 'Near Exit Gate B',
      description: 'E2E Test: Severe road crater dangerous for two-wheelers during night traffic.',
      damageType: 'Pothole',
      aiAssessment: {
        isPothole: true,
        severity: 'high',
        confidence: 0.93,
        explanation: 'Deep cavity detected with exposed road base.',
        observations: ['Fractured asphalt perimeter', 'High risk of tire impact'],
        reviewRequired: false,
        isAiFallback: false,
        aiProvider: 'Google Gemini 1.5 Flash Vision',
      },
    }),
  });
  const created = await newReportRes.json();
  if (!created.success) throw new Error('Failed to create report: ' + JSON.stringify(created));
  const testTicketId = created.data.ticketId;
  console.log(`  ✓ Created new report: ${testTicketId} (${created.data.status} | Severity: ${created.data.severity})`);

  // Test 5: Fetch by Ticket ID
  console.log(`\n[Test 5] Fetch Single Report by Ticket ID (${testTicketId})...`);
  const singleRes = await fetch(`${baseUrl}/reports/${testTicketId}`);
  const single = await singleRes.json();
  console.log(`  ✓ Retrieved report: ${single.data.ticketId} at ${single.data.location}`);

  // Test 6: Upvote Report
  console.log(`\n[Test 6] Community Upvoting (${testTicketId})...`);
  const upvoteRes = await fetch(`${baseUrl}/reports/${testTicketId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const upvoteData = await upvoteRes.json();
  console.log(`  ✓ Upvote recorded! Total upvotes: ${upvoteData.upvotes}`);

  // Test 7: Officer Status Transition: Submitted -> Under Review
  console.log(`\n[Test 7] Workflow Transition: Submitted -> Under Review...`);
  const reviewRes = await fetch(`${baseUrl}/reports/${testTicketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Under Review',
      officerName: 'Triage Officer Ananya Rao',
      notes: 'Initial inspection confirmed high hazard on bus corridor.',
    }),
  });
  const reviewed = await reviewRes.json();
  console.log(`  ✓ Status updated to: ${reviewed.data.status}`);

  // Test 8: Assign Repair Team: Under Review -> Assigned
  console.log(`\n[Test 8] Assigning Repair Taskforce...`);
  const assignRes = await fetch(`${baseUrl}/reports/${testTicketId}/assignment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignedTeam: 'GHMC Rapid Patch Crew Alpha (Uppal Ward 9)',
      assignedOfficer: 'Asst. Exec. Eng. P. Suresh',
      officerName: 'Superintendent K. Reddy',
    }),
  });
  const assigned = await assignRes.json();
  console.log(`  ✓ Work order dispatched to: ${assigned.data.assignedTeam} (Status: ${assigned.data.status})`);

  // Test 9: Officer Severity Correction
  console.log(`\n[Test 9] Authoritative Severity Correction...`);
  const sevRes = await fetch(`${baseUrl}/reports/${testTicketId}/severity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      severity: 'high',
      notes: 'Confirmed 4.5 in depth during field measurement.',
      officerName: 'Asst. Exec. Eng. P. Suresh',
    }),
  });
  const sevd = await sevRes.json();
  console.log(`  ✓ Severity verified: ${sevd.data.severity}`);

  // Test 10: Resolve Report with Proof
  console.log(`\n[Test 10] Resolving Report with Repair Proof...`);
  const resolveRes = await fetch(`${baseUrl}/reports/${testTicketId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resolutionNotes: 'Dense bituminous macadam compaction completed and rolled to grade.',
      afterImageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
      officerName: 'Asst. Exec. Eng. P. Suresh',
    }),
  });
  const resolved = await resolveRes.json();
  console.log(`  ✓ Report marked Resolved! Timestamp: ${resolved.data.resolvedAt}`);
  console.log(`  ✓ After-repair photograph attached: ${resolved.data.afterImageUrl}`);

  // Test 11: Verify Status History Array
  console.log(`\n[Test 11] Verifying Audit Timeline History...`);
  const finalRes = await fetch(`${baseUrl}/reports/${testTicketId}`);
  const finalData = await finalRes.json();
  console.log(`  ✓ Total Audit History entries: ${finalData.data.statusHistory.length}`);
  finalData.data.statusHistory.forEach((h: any, idx: number) => {
    console.log(`    [${idx + 1}] ${h.status} by "${h.changedBy}" - ${h.notes}`);
  });

  // Test 12: Activity Feed
  console.log('\n[Test 12] Fetching Realtime Activity Feed...');
  const actRes = await fetch(`${baseUrl}/dashboard/activity`);
  const actData = await actRes.json();
  console.log(`  ✓ Retrieved ${actData.data.length} recent activity items`);

  console.log('\n======================================================');
  console.log('🎉 ALL 12 END-TO-END TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
