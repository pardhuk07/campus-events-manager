import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  createSessionToken,
  verifySessionToken,
  getServerUser,
  requireCore,
  requireExecOrCore,
  CORE_EMAILS,
} from '../lib/auth';
import { NextRequest } from 'next/server';
import { UserRole } from '../lib/constants';

describe('Auth & Session Security Audit Tests', () => {
  describe('Cryptographic Session Token Verification', () => {
    test('creates and verifies a valid HMAC signed session token', () => {
      const email = 'pardhu120907@gmail.com';
      const token = createSessionToken(email);
      assert.ok(token, 'Token should be generated');

      const verifiedEmail = verifySessionToken(token);
      assert.strictEqual(verifiedEmail, email);
    });

    test('rejects tampered session tokens', () => {
      const email = 'student@gmail.com';
      const token = createSessionToken(email);
      const parts = token.split('.');
      // Tamper with payload
      const tamperedToken = `${parts[0]}xyz.${parts[1]}.${parts[2]}`;
      const result = verifySessionToken(tamperedToken);
      assert.strictEqual(result, null, 'Tampered token must be rejected');
    });

    test('rejects forged signature on session token', () => {
      const email = 'pardhu120907@gmail.com';
      const token = createSessionToken(email);
      const parts = token.split('.');
      const forgedToken = `${parts[0]}.${parts[1]}.forged_sig_12345`;
      const result = verifySessionToken(forgedToken);
      assert.strictEqual(result, null, 'Forged signature must be rejected');
    });
  });

  describe('Server-Side Role Determination (Anti-Spoofing)', () => {
    test('core emails in allowlist resolve to CORE_VERIFIER regardless of headers', async () => {
      for (const coreEmail of CORE_EMAILS) {
        const req = new NextRequest('http://localhost:3000/api/events/pending', {
          headers: {
            'x-user-email': coreEmail,
            'x-user-role': 'MEMBER', // Attacker trying to spoof or mislabel
          },
        });
        const user = await getServerUser(req);
        assert.ok(user, `User should be resolved for ${coreEmail}`);
        assert.strictEqual(user?.role, UserRole.CORE_VERIFIER, 'Role must strictly resolve to CORE_VERIFIER from server allowlist');
      }
    });

    test('client sending spoofed x-user-role cannot elevate permissions', async () => {
      // General member attempts to declare themselves CORE_VERIFIER via header
      const req = new NextRequest('http://localhost:3000/api/notifications', {
        headers: {
          'x-user-email': 'student@gmail.com',
          'x-user-role': 'CORE_VERIFIER', // Spoofed header
        },
      });

      const user = await getServerUser(req);
      assert.strictEqual(user?.role, UserRole.MEMBER, 'Server must resolve student to MEMBER and ignore spoofed header');

      const coreAuth = await requireCore(req);
      assert.ok('errorResponse' in coreAuth, 'Should return errorResponse');
      assert.strictEqual(coreAuth.errorResponse.status, 403, 'Must return 403 Forbidden');
    });

    test('unauthenticated request receives 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/events/pending');
      const auth = await requireCore(req);
      assert.ok('errorResponse' in auth);
      assert.strictEqual(auth.errorResponse.status, 401, 'Unauthenticated request must return 401');
    });

    test('member attempting executive action receives 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/expenses', {
        headers: {
          'x-user-email': 'student@gmail.com',
        },
      });
      const auth = await requireExecOrCore(req);
      assert.ok('errorResponse' in auth);
      assert.strictEqual(auth.errorResponse.status, 403, 'Member must receive 403 Forbidden');
    });

    test('executive attempting core review action receives 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/events/123/review', {
        headers: {
          'x-user-email': 'acmexec@gmail.com',
        },
      });
      const auth = await requireCore(req);
      assert.ok('errorResponse' in auth);
      assert.strictEqual(auth.errorResponse.status, 403, 'Executive attempting review must receive 403 Forbidden');
    });

    test('verifies all 10 official SVNIT campus clubs are registered', () => {
      const { CAMPUS_CLUBS } = require('../lib/constants');
      assert.strictEqual(CAMPUS_CLUBS.length, 10, 'Must have exactly 10 official clubs');
      const expectedClubs = [
        'ACM',
        'ChES (Chemical Engineering Society of SVNIT Surat)',
        'CHRD (Dancing, Singing, Arts, Photography)',
        'E-Cell',
        'Phoenix Racing & Phoenix Aero',
        'Drishti',
        'NEXUS',
        'GDGC',
        'CEV (Cutting Edge Visionaries)',
        'CES (Civil Engineering Society)',
      ];
      for (const expected of expectedClubs) {
        assert.ok(
          CAMPUS_CLUBS.some((c: any) => c.name === expected),
          `Club "${expected}" must be present in official clubs list`
        );
      }
    });
  });
});
