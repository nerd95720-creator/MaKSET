import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  completeTaskRecord,
  createFacilityRecord,
  createTaskRecord,
  getBootstrapData,
  markNotificationsReadForEncounter,
  recordAuditEntry,
  updateAssistantAccess,
  updateStaffStatusOrFacilities,
  upsertEncounterRecord,
  upsertPatientRecord,
  upsertReferralRecord,
  upsertStaffRecord,
} from './src/db/queries.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '2mb' }));

  // Allow Capacitor Android webview & local origins to call deployed API routes
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || '';
      const name = typeof req.user?.name === 'string' ? req.user.name : '';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const data = await getBootstrapData(uid, email, name);
      if (data.blocked) {
        return res.status(403).json({
          error:
            data.role === 'oc' && data.status === 'Blocked'
              ? 'Access blocked by the administrator.'
              : data.status === 'Terminated'
                ? 'Your access has been terminated. Contact your officer in charge.'
                : 'Your access is suspended. Contact your officer in charge.',
        });
      }
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load clinic data.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/patients', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const { patient, auditEntry } = req.body;
      if (!patient?.id || !patient?.n) {
        return res.status(400).json({ error: 'Patient code and name are required' });
      }
      await upsertPatientRecord(patient, uid, auditEntry);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save patient.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/encounters', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { encounter, patientCode, facility } = req.body;
      if (!encounter?.uid || !patientCode) {
        return res.status(400).json({ error: 'Encounter uid and patientCode are required' });
      }
      await upsertEncounterRecord(encounter, patientCode, facility || '');
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save encounter.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { kind, task, facility } = req.body;
      if ((kind !== 'lab' && kind !== 'ph') || !task?.id) {
        return res.status(400).json({ error: 'Invalid task payload' });
      }
      await createTaskRecord(kind, task, facility || '');
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create task.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/tasks/complete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { kind, taskUid, encounterUid, outcomes, notif } = req.body;
      if ((kind !== 'lab' && kind !== 'ph') || !taskUid) {
        return res.status(400).json({ error: 'Invalid task completion payload' });
      }
      await completeTaskRecord({ kind, taskUid, encounterUid, outcomes: outcomes || [], notif });
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to complete task.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/referrals', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { referral, patientCode, notif } = req.body;
      if (!referral?.id || !patientCode) {
        return res.status(400).json({ error: 'Referral id and patientCode are required' });
      }
      await upsertReferralRecord(referral, patientCode, notif);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save referral.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/notifications/read', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { encounterUid, notifUid } = req.body;
      await markNotificationsReadForEncounter(encounterUid || '', notifUid);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update notifications.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/facilities', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { facility } = req.body;
      if (!facility?.name) {
        return res.status(400).json({ error: 'Facility name is required' });
      }
      await createFacilityRecord(facility);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to register facility.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/staff', requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterEmail = req.user?.email || '';
      const { staff, requireOc } = req.body;
      if (!staff?.id || !staff?.e || !staff?.n) {
        return res.status(400).json({ error: 'Staff details are incomplete' });
      }
      await upsertStaffRecord(staff, requesterEmail, requireOc !== false);
      res.json({ ok: true });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'FORBIDDEN_OC_ONLY') {
        return res.status(403).json({ error: 'Only the Officer in Charge can register new staff' });
      }
      const message = error instanceof Error ? error.message : 'Failed to register staff.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/staff/:staffCode', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { staffCode } = req.params;
      const { status, assignedFacilities } = req.body;
      await updateStaffStatusOrFacilities(staffCode, { status, assignedFacilities });
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update staff.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/staff/assistant-access', requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterEmail = req.user?.email || '';
      const { fullAccess } = req.body;
      await updateAssistantAccess(requesterEmail, Boolean(fullAccess));
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update assistant access.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/audit', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const { actorName, facility, entry } = req.body;
      if (!entry) {
        return res.status(400).json({ error: 'Audit entry required' });
      }
      await recordAuditEntry(uid, actorName || '', facility || '', entry);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save audit log.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const requesterEmail = req.user?.email || '';
      const {
        patientsList = [],
        encountersList = [],
        referralsList = [],
        facilitiesList = [],
        staffList = [],
        facility = '',
      } = req.body;

      for (const f of facilitiesList) {
        if (f?.name) await createFacilityRecord(f);
      }
      for (const s of staffList) {
        if (s?.id && s?.e) {
          try {
            await upsertStaffRecord(s, requesterEmail, true);
          } catch {
            // Skip unauthorized staff enrollment entries safely during batch sync
          }
        }
      }
      for (const p of patientsList) {
        if (p?.id && p?.n) await upsertPatientRecord(p, uid);
      }
      for (const e of encountersList) {
        if (e?.encounter?.uid && e?.patientCode) {
          await upsertEncounterRecord(e.encounter, e.patientCode, facility);
        }
      }
      for (const r of referralsList) {
        if (r?.referral?.id && r?.patientCode) {
          await upsertReferralRecord(r.referral, r.patientCode);
        }
      }

      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync offline records.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MaKSET server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
