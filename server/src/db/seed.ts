import { defaultDb } from './database.js';
import crypto from 'node:crypto';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';
import { EnrollmentService } from '../services/enrollmentService.js';
import { hashToBigIntString } from '../services/verifier.js';
import { PrivacyRiskGate } from '../services/privacyGate.js';

export async function seedDatabase() {
  const db = defaultDb;

  // Check if reports already seeded
  const countRow = db.prepare('SELECT COUNT(*) as count FROM reports').get() as { count: number };
  if (countRow.count > 0) {
    console.log('Database already seeded. Skipping initial seed.');
    return;
  }

  console.log('🌱 Seeding Incognito demo data with Real Semaphore V4 Proofs...');

  const enrollmentService = new EnrollmentService(db);
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 2).toISOString();

  // Fictional Demo Seed Items
  const seedItems = [
    {
      studentId: 'STU-DEMO-1001',
      category: 'teaching',
      scopeId: 'teaching:2026-Q4',
      content: 'The lecture slides for Data Structures are missing code examples for Dijkstra algorithm. Having practical code snippets in slides would help students prepare better for lab assignments.',
    },
    {
      studentId: 'STU-DEMO-1002',
      category: 'teaching',
      scopeId: 'teaching:2026-Q4',
      content: 'Office hours for advanced algorithms conflict with core lab schedules. It would be helpful to move Thursday office hours to later in the afternoon.',
    },
    {
      studentId: 'STU-DEMO-1003',
      category: 'teaching',
      scopeId: 'teaching:2026-Q4',
      content: 'Grading rubric for Project 2 was released 3 days after submission deadline. Timely rubric releases would allow us to self-assess our code more effectively.',
    },
    {
      studentId: 'STU-DEMO-1004',
      category: 'administration',
      scopeId: 'administration:2026-Q4',
      content: 'The financial aid office is taking too long to process tuition receipts. Please contact me at john.doe@college.edu or 555-0199 if you need my student ID STU-2026-9999.',
    },
    {
      studentId: 'STU-DEMO-1005',
      category: 'facilities',
      scopeId: 'facilities:2026-Q4',
      content: 'On October 12th at 3:15pm in Room 402, the projector overhead unit melted during CS101. Only 4 students were present during this makeup session.',
    },
    {
      studentId: 'STU-DEMO-1006',
      category: 'safety',
      scopeId: 'safety:2026-Q4',
      content: 'I wish to report verbal harassment and threats made during the lab session by an evaluator. This is a safety concern that requires ethics committee handling.',
    },
    {
      studentId: 'STU-DEMO-1007',
      category: 'facilities',
      scopeId: 'facilities:2026-Q4',
      content: 'The second floor water filter in the main library building is showing a red filter replacement light.',
    },
  ];

  // 1. Create and enroll Semaphore identities for all seed students
  const studentIdentities: { studentId: string; identity: Identity }[] = [];

  for (const item of seedItems) {
    const identity = new Identity();
    enrollmentService.enrollCommitment(item.studentId, identity.commitment.toString());
    studentIdentities.push({ studentId: item.studentId, identity });
  }

  // Also enroll a few additional demo students for the UI demo (Alice & Bob)
  const aliceIdentity = new Identity();
  const bobIdentity = new Identity();
  enrollmentService.enrollCommitment('STU-ALICE-101', aliceIdentity.commitment.toString());
  enrollmentService.enrollCommitment('STU-BOB-202', bobIdentity.commitment.toString());

  // Reconstruct Semaphore Group with all enrolled commitments
  const commitments = enrollmentService.getEnrolledCommitments();
  const group = new Group(commitments);

  // 2. Generate real Semaphore proof & record reports
  for (let i = 0; i < seedItems.length; i++) {
    const item = seedItems[i];
    const identity = studentIdentities[i].identity;

    const messageBigIntStr = hashToBigIntString(item.content);
    const scopeBigIntStr = hashToBigIntString(item.scopeId);

    const proof = await generateProof(identity, group, messageBigIntStr, scopeBigIntStr, 16);

    // Register nullifier
    db.prepare('INSERT INTO nullifiers (id, scope_id, nullifier, created_at) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), item.scopeId, proof.nullifier, pastDate);

    // Analyze content
    const privacyResult = PrivacyRiskGate.analyzeReport(item.content);

    // Save report
    db.prepare(`
      INSERT INTO reports (
        id, category, scope_id, content, sanitized_content, status, privacy_flags, is_serious_allegation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      item.category,
      item.scopeId,
      item.content,
      privacyResult.sanitizedContent || null,
      privacyResult.status,
      JSON.stringify(privacyResult.privacyFlags),
      privacyResult.isSeriousAllegation ? 1 : 0,
      pastDate,
      pastDate
    );
  }

  console.log(`✅ Demo seed data created successfully with ${commitments.length} enrolled Semaphore identities!`);
}

if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase();
}
