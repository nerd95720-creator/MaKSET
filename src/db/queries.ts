import { asc, desc, eq } from 'drizzle-orm';
import {
  buildSummaryLines,
  createInitialState,
  FACILITIES,
  HOME_FACILITY,
} from '../data/seedData.ts';
import {
  Encounter,
  FacilityInfo,
  LabTask,
  NotificationItem,
  Patient,
  PharmacyTask,
  Referral,
  StaffMember,
} from '../types/caresync.ts';
import { db } from './index.ts';
import {
  auditLogs,
  encounters,
  facilities,
  labTasks,
  notifications,
  patients,
  pharmacyTasks,
  referrals,
  staffMembers,
  users,
} from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName = '') {
  try {
    const cleanEmail = (email || '').trim().toLowerCase() || `${uid}@makset.local`;
    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          ...(displayName ? { displayName } : {}),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function seedInitialPilotDataIfEmpty() {
  try {
    const existing = await db.select({ id: facilities.id }).from(facilities).limit(1);
    if (existing.length > 0) return;

    const seed = createInitialState();

    await db
      .insert(facilities)
      .values(
        FACILITIES.map((f) => ({
          name: f.name,
          type: f.type,
          lga: f.lga,
        })),
      )
      .onConflictDoNothing({ target: facilities.name });

    await db
      .insert(staffMembers)
      .values(
        seed.stf.map((s) => ({
          staffCode: s.id,
          name: s.n,
          email: s.e.toLowerCase(),
          role: s.role,
          primaryFacility: s.fac,
          assignedFacilities: s.facilities || [s.fac],
          status: s.st,
          assistantFullAccess: false,
        })),
      )
      .onConflictDoNothing({ target: staffMembers.email });

    await db
      .insert(patients)
      .values(
        seed.pts.map((p) => ({
          patientCode: p.id,
          name: p.n,
          sex: p.s,
          age: p.a,
          allergy: p.al || '',
          bloodGroup: p.bg || 'O+',
          nin: p.nin || '',
          idVerified: p.idv || 'Not verified',
          pin: p.pin || '1234',
          phone: p.phone || '',
          lga: p.lga || '',
          address: p.address || '',
          dob: p.dob || '',
        })),
      )
      .onConflictDoNothing({ target: patients.patientCode });

    await db
      .insert(encounters)
      .values(
        seed.E.map((e) => ({
          uid: e.uid,
          patientCode: seed.pts[e.pi]?.id || 'MAK-002431',
          encounterType: e.t,
          timeLabel: e.time,
          recordedBy: e.by,
          chiefComplaint: e.cc || '',
          labs: e.labs || [],
          results: e.res || [],
          diagnosis: e.dx || '',
          diagnosisMethod: e.dxm || '',
          medications: e.rx || [],
          rxStatus: e.rxs || '',
          outcome: e.out || '',
          notes: e.notes || '',
          synced: true,
          status: e.status || '',
          stage: e.stage || 1,
          bypassReason: e.bypass || '',
          extraFields: e.x || {},
          facility: HOME_FACILITY,
        })),
      )
      .onConflictDoNothing({ target: encounters.uid });

    await db
      .insert(labTasks)
      .values(
        seed.lab.map((t) => ({
          taskUid: t.id,
          patientName: t.p,
          summaryText: t.t,
          items: t.items || [],
          encounterUid: t.encounterUid || '',
          facility: HOME_FACILITY,
          status: 'pending',
        })),
      )
      .onConflictDoNothing({ target: labTasks.taskUid });

    await db
      .insert(pharmacyTasks)
      .values(
        seed.ph.map((t) => ({
          taskUid: t.id,
          patientName: t.p,
          summaryText: t.t,
          items: t.items || [],
          encounterUid: t.encounterUid || '',
          facility: HOME_FACILITY,
          status: 'pending',
        })),
      )
      .onConflictDoNothing({ target: pharmacyTasks.taskUid });

    await db
      .insert(referrals)
      .values(
        seed.ref.map((r) => ({
          referralCode: r.id,
          patientCode: seed.pts[r.pi]?.id || 'MAK-002431',
          patientName: r.p,
          fromFacility: r.from,
          toFacility: r.to,
          reason: r.reason,
          urgency: r.ur,
          treatmentGiven: r.tx,
          summaryLines: r.sum || [],
          status: r.st,
          timeLabel: r.time,
          feedback: r.fb || '',
        })),
      )
      .onConflictDoNothing({ target: referrals.referralCode });
  } catch (error) {
    console.error('Database query failed in seedInitialPilotDataIfEmpty:', error);
    throw new Error('Failed to initialize pilot clinic records.', { cause: error });
  }
}

export async function getBootstrapData(uid: string, email: string, displayName = '') {
  try {
    const userRow = await getOrCreateUser(uid, email, displayName);
    await seedInitialPilotDataIfEmpty();

    const normalizedEmail = (userRow.email || '').trim().toLowerCase();
    let staffRows = await db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.email, normalizedEmail));

    let currentStaff = staffRows[0];
    if (!currentStaff) {
      const code = `OC-${uid.slice(0, 6).toUpperCase()}`;
      const inserted = await db
        .insert(staffMembers)
        .values({
          staffCode: code,
          name: displayName || normalizedEmail.split('@')[0] || 'Officer in Charge',
          email: normalizedEmail,
          role: 'oc',
          primaryFacility: HOME_FACILITY,
          assignedFacilities: [HOME_FACILITY],
          status: 'Active',
          assistantFullAccess: false,
        })
        .onConflictDoNothing({ target: staffMembers.email })
        .returning();
      currentStaff = inserted[0];
      if (!currentStaff) {
        const retry = await db
          .select()
          .from(staffMembers)
          .where(eq(staffMembers.email, normalizedEmail));
        currentStaff = retry[0];
      }
    }

    if (currentStaff && currentStaff.status !== 'Active') {
      return {
        blocked: true as const,
        status: currentStaff.status,
        role: currentStaff.role,
      };
    }

    const [
      facRows,
      allStaffRows,
      patientRows,
      encounterRows,
      labRows,
      phRows,
      refRows,
      notifRows,
      auditRows,
    ] = await Promise.all([
      db.select().from(facilities).orderBy(asc(facilities.id)),
      db.select().from(staffMembers).orderBy(asc(staffMembers.id)),
      db.select().from(patients).orderBy(asc(patients.id)),
      db.select().from(encounters).orderBy(asc(encounters.id)),
      db.select().from(labTasks).where(eq(labTasks.status, 'pending')).orderBy(desc(labTasks.id)),
      db.select().from(pharmacyTasks).where(eq(pharmacyTasks.status, 'pending')).orderBy(desc(pharmacyTasks.id)),
      db.select().from(referrals).orderBy(desc(referrals.id)),
      db.select().from(notifications).orderBy(desc(notifications.id)),
      db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(40),
    ]);

    const patientIndexByCode = new Map<string, number>();
    const pts: Patient[] = patientRows.map((p, idx) => {
      patientIndexByCode.set(p.patientCode, idx);
      return {
        n: p.name,
        s: p.sex,
        a: p.age,
        id: p.patientCode,
        al: p.allergy,
        bg: p.bloodGroup,
        nin: p.nin || undefined,
        idv: (p.idVerified as Patient['idv']) || 'Not verified',
        pin: p.pin || '1234',
        phone: p.phone || undefined,
        lga: p.lga || undefined,
        address: p.address || undefined,
        dob: p.dob || undefined,
      };
    });

    const mappedEncounters: Encounter[] = encounterRows.map((e) => ({
      uid: e.uid,
      pi: patientIndexByCode.get(e.patientCode) ?? 0,
      t: e.encounterType,
      time: e.timeLabel,
      by: e.recordedBy,
      cc: e.chiefComplaint,
      labs: e.labs || [],
      res: e.results || [],
      dx: e.diagnosis,
      dxm: e.diagnosisMethod,
      rx: e.medications || [],
      rxs: e.rxStatus,
      out: e.outcome,
      notes: e.notes,
      sync: e.synced,
      status: (e.status as Encounter['status']) || '',
      stage: (e.stage === 2 ? 2 : 1) as 1 | 2,
      bypass: e.bypassReason || undefined,
      x: e.extraFields && Object.keys(e.extraFields).length ? e.extraFields : undefined,
    }));

    const mappedFacilities: FacilityInfo[] = facRows.map((f) => ({
      name: f.name,
      type: f.type === 'Hospital' ? 'Hospital' : 'PHC',
      lga: f.lga,
    }));

    const mappedStaff: StaffMember[] = allStaffRows.map((s) => ({
      id: s.staffCode,
      n: s.name,
      e: s.email,
      role: (['oc', 'asst', 'nurse', 'lab', 'pharm'].includes(s.role) ? s.role : 'nurse') as StaffMember['role'],
      fac: s.primaryFacility,
      facilities: Array.from(new Set([s.primaryFacility, ...(s.assignedFacilities || [])])),
      st: (['Active', 'Suspended', 'Terminated', 'Blocked'].includes(s.status)
        ? s.status
        : 'Active') as StaffMember['st'],
    }));

    const mappedLab: LabTask[] = labRows.map((t) => ({
      id: t.taskUid,
      p: t.patientName,
      t: t.summaryText,
      items: t.items || [],
      encounterUid: t.encounterUid || undefined,
    }));

    const mappedPh: PharmacyTask[] = phRows.map((t) => ({
      id: t.taskUid,
      p: t.patientName,
      t: t.summaryText,
      items: t.items || [],
      encounterUid: t.encounterUid || undefined,
    }));

    const mappedReferrals: Referral[] = refRows.map((r) => {
      const pi = patientIndexByCode.get(r.patientCode) ?? 0;
      const st = (['Queued', 'Delivered', 'Accepted', 'Completed'].includes(r.status)
        ? r.status
        : 'Delivered') as Referral['st'];
      const w = st === 'Completed' ? `Feedback: ${r.feedback}` : `${st} to ${r.toFacility}`;
      return {
        id: r.referralCode,
        pi,
        p: r.patientName,
        from: r.fromFacility,
        to: r.toFacility,
        reason: r.reason,
        ur: (['Emergency', 'Urgent', 'Routine'].includes(r.urgency) ? r.urgency : 'Routine') as Referral['ur'],
        tx: r.treatmentGiven,
        sum: r.summaryLines && r.summaryLines.length ? r.summaryLines : buildSummaryLines(pi, pts, mappedEncounters),
        st,
        time: r.timeLabel,
        fb: r.feedback,
        w,
      };
    });

    const mappedNotifs: NotificationItem[] = notifRows.map((n) => ({
      id: n.notifUid,
      encounterUid: n.encounterUid || undefined,
      pi: patientIndexByCode.get(n.patientCode) ?? 0,
      k: (['lab', 'ph', 'ref'].includes(n.kind) ? n.kind : 'lab') as NotificationItem['k'],
      p: n.patientName,
      txt: n.message,
      read: n.read,
    }));

    const registeredFacilities = currentStaff
      ? Array.from(new Set([currentStaff.primaryFacility, ...(currentStaff.assignedFacilities || [])]))
      : [HOME_FACILITY];

    const ocRows = allStaffRows.filter(
      (s) => s.primaryFacility === (currentStaff?.primaryFacility || HOME_FACILITY) && s.role === 'oc',
    );
    const agr = ocRows.some((s) => s.assistantFullAccess) || Boolean(currentStaff?.assistantFullAccess);

    return {
      blocked: false as const,
      user: {
        uid: userRow.uid,
        email: normalizedEmail,
        staffCode: currentStaff?.staffCode || 'OC-0001',
        name: currentStaff?.name || userRow.displayName || normalizedEmail.split('@')[0],
        pos: (currentStaff?.role || 'oc') as StaffMember['role'],
        fac: currentStaff?.primaryFacility || HOME_FACILITY,
        registeredFacilities,
        agr,
      },
      facilities: mappedFacilities,
      stf: mappedStaff,
      pts,
      E: mappedEncounters,
      lab: mappedLab,
      ph: mappedPh,
      ref: mappedReferrals,
      nt: mappedNotifs,
      aud: auditRows.map((a) => a.entry),
    };
  } catch (error) {
    console.error('Database query failed in getBootstrapData:', error);
    throw new Error('Failed to load clinic data.', { cause: error });
  }
}

export async function upsertPatientRecord(patient: Patient, uid: string, auditEntry?: string) {
  try {
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    await db
      .insert(patients)
      .values({
        patientCode: patient.id,
        name: patient.n,
        sex: patient.s,
        age: patient.a,
        allergy: patient.al || '',
        bloodGroup: patient.bg || 'O+',
        nin: patient.nin || '',
        idVerified: patient.idv || 'Not verified',
        pin: patient.pin || '1234',
        phone: patient.phone || '',
        lga: patient.lga || '',
        address: patient.address || '',
        dob: patient.dob || '',
        userId: u?.id ?? null,
      })
      .onConflictDoUpdate({
        target: patients.patientCode,
        set: {
          name: patient.n,
          sex: patient.s,
          age: patient.a,
          allergy: patient.al || '',
          bloodGroup: patient.bg || 'O+',
          nin: patient.nin || '',
          idVerified: patient.idv || 'Not verified',
          phone: patient.phone || '',
          lga: patient.lga || '',
          address: patient.address || '',
          dob: patient.dob || '',
        },
      });
    if (auditEntry) {
      await db.insert(auditLogs).values({
        actorUid: uid,
        entry: auditEntry,
      });
    }
  } catch (error) {
    console.error('Database query failed in upsertPatientRecord:', error);
    throw new Error('Failed to save patient record.', { cause: error });
  }
}

export async function upsertEncounterRecord(
  encounter: Encounter,
  patientCode: string,
  facility: string,
) {
  try {
    await db
      .insert(encounters)
      .values({
        uid: encounter.uid,
        patientCode,
        encounterType: encounter.t,
        timeLabel: encounter.time,
        recordedBy: encounter.by,
        chiefComplaint: encounter.cc || '',
        labs: encounter.labs || [],
        results: encounter.res || [],
        diagnosis: encounter.dx || '',
        diagnosisMethod: encounter.dxm || '',
        medications: encounter.rx || [],
        rxStatus: encounter.rxs || '',
        outcome: encounter.out || '',
        notes: encounter.notes || '',
        synced: true,
        status: encounter.status || '',
        stage: encounter.stage || 1,
        bypassReason: encounter.bypass || '',
        extraFields: encounter.x || {},
        facility,
      })
      .onConflictDoUpdate({
        target: encounters.uid,
        set: {
          chiefComplaint: encounter.cc || '',
          labs: encounter.labs || [],
          results: encounter.res || [],
          diagnosis: encounter.dx || '',
          diagnosisMethod: encounter.dxm || '',
          medications: encounter.rx || [],
          rxStatus: encounter.rxs || '',
          outcome: encounter.out || '',
          notes: encounter.notes || '',
          synced: true,
          status: encounter.status || '',
          stage: encounter.stage || 1,
          bypassReason: encounter.bypass || '',
          extraFields: encounter.x || {},
        },
      });
  } catch (error) {
    console.error('Database query failed in upsertEncounterRecord:', error);
    throw new Error('Failed to save encounter.', { cause: error });
  }
}

export async function createTaskRecord(
  kind: 'lab' | 'ph',
  task: LabTask | PharmacyTask,
  facility: string,
) {
  try {
    const table = kind === 'lab' ? labTasks : pharmacyTasks;
    await db
      .insert(table)
      .values({
        taskUid: task.id,
        patientName: task.p,
        summaryText: task.t,
        items: task.items || [],
        encounterUid: task.encounterUid || '',
        facility,
        status: 'pending',
      })
      .onConflictDoNothing({ target: table.taskUid });
  } catch (error) {
    console.error('Database query failed in createTaskRecord:', error);
    throw new Error('Failed to create department task.', { cause: error });
  }
}

export async function completeTaskRecord(input: {
  kind: 'lab' | 'ph';
  taskUid: string;
  encounterUid?: string;
  outcomes: string[];
  notif?: { id: string; patientCode: string; patientName: string; txt: string; facility: string };
}) {
  try {
    const table = input.kind === 'lab' ? labTasks : pharmacyTasks;
    await db.update(table).set({ status: 'completed' }).where(eq(table.taskUid, input.taskUid));

    if (input.encounterUid) {
      const [enc] = await db
        .select()
        .from(encounters)
        .where(eq(encounters.uid, input.encounterUid))
        .limit(1);
      if (enc) {
        if (input.kind === 'lab') {
          await db
            .update(encounters)
            .set({ results: [...(enc.results || []), ...input.outcomes], synced: true })
            .where(eq(encounters.uid, input.encounterUid));
        } else {
          const nextRxs = (enc.rxStatus ? `${enc.rxStatus}; ` : '') + input.outcomes.join('; ');
          await db
            .update(encounters)
            .set({ rxStatus: nextRxs, synced: true })
            .where(eq(encounters.uid, input.encounterUid));
        }
      }
    }

    if (input.notif) {
      await db
        .insert(notifications)
        .values({
          notifUid: input.notif.id,
          encounterUid: input.encounterUid || '',
          patientCode: input.notif.patientCode,
          kind: input.kind,
          patientName: input.notif.patientName,
          message: input.notif.txt,
          read: false,
          facility: input.notif.facility,
        })
        .onConflictDoNothing({ target: notifications.notifUid });
    }
  } catch (error) {
    console.error('Database query failed in completeTaskRecord:', error);
    throw new Error('Failed to complete task.', { cause: error });
  }
}

export async function upsertReferralRecord(
  referral: Referral,
  patientCode: string,
  notif?: { id: string; message: string; facility: string },
) {
  try {
    await db
      .insert(referrals)
      .values({
        referralCode: referral.id,
        patientCode,
        patientName: referral.p,
        fromFacility: referral.from,
        toFacility: referral.to,
        reason: referral.reason,
        urgency: referral.ur,
        treatmentGiven: referral.tx,
        summaryLines: referral.sum || [],
        status: referral.st === 'Queued' ? 'Delivered' : referral.st,
        timeLabel: referral.time,
        feedback: referral.fb || '',
      })
      .onConflictDoUpdate({
        target: referrals.referralCode,
        set: {
          status: referral.st === 'Queued' ? 'Delivered' : referral.st,
          feedback: referral.fb || '',
        },
      });

    if (notif) {
      await db
        .insert(notifications)
        .values({
          notifUid: notif.id,
          encounterUid: '',
          patientCode,
          kind: 'ref',
          patientName: referral.p,
          message: notif.message,
          read: false,
          facility: notif.facility,
        })
        .onConflictDoNothing({ target: notifications.notifUid });
    }
  } catch (error) {
    console.error('Database query failed in upsertReferralRecord:', error);
    throw new Error('Failed to save referral.', { cause: error });
  }
}

export async function markNotificationsReadForEncounter(encounterUid: string, notifUid?: string) {
  try {
    if (notifUid) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.notifUid, notifUid));
    }
    if (encounterUid) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.encounterUid, encounterUid));
    }
  } catch (error) {
    console.error('Database query failed in markNotificationsReadForEncounter:', error);
    throw new Error('Failed to update notification status.', { cause: error });
  }
}

export async function createFacilityRecord(facility: FacilityInfo) {
  try {
    await db
      .insert(facilities)
      .values({
        name: facility.name,
        type: facility.type,
        lga: facility.lga,
      })
      .onConflictDoNothing({ target: facilities.name });
  } catch (error) {
    console.error('Database query failed in createFacilityRecord:', error);
    throw new Error('Failed to register facility.', { cause: error });
  }
}

export async function upsertStaffRecord(
  staff: StaffMember,
  requesterEmail: string,
  requireOc: boolean,
) {
  try {
    if (requireOc) {
      const [requester] = await db
        .select()
        .from(staffMembers)
        .where(eq(staffMembers.email, requesterEmail.toLowerCase()))
        .limit(1);
      if (!requester || requester.role !== 'oc' || requester.status !== 'Active') {
        throw new Error('FORBIDDEN_OC_ONLY');
      }
    }

    await db
      .insert(staffMembers)
      .values({
        staffCode: staff.id,
        name: staff.n,
        email: staff.e.toLowerCase(),
        role: staff.role,
        primaryFacility: staff.fac,
        assignedFacilities: Array.from(new Set([staff.fac, ...(staff.facilities || [])])),
        status: staff.st,
      })
      .onConflictDoUpdate({
        target: staffMembers.email,
        set: {
          name: staff.n,
          role: staff.role,
          primaryFacility: staff.fac,
          assignedFacilities: Array.from(new Set([staff.fac, ...(staff.facilities || [])])),
          status: staff.st,
        },
      });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'FORBIDDEN_OC_ONLY') {
      throw error;
    }
    console.error('Database query failed in upsertStaffRecord:', error);
    throw new Error('Failed to save staff member.', { cause: error });
  }
}

export async function updateStaffStatusOrFacilities(
  staffCode: string,
  patch: { status?: string; assignedFacilities?: string[] },
) {
  try {
    await db
      .update(staffMembers)
      .set({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.assignedFacilities ? { assignedFacilities: patch.assignedFacilities } : {}),
      })
      .where(eq(staffMembers.staffCode, staffCode));
  } catch (error) {
    console.error('Database query failed in updateStaffStatusOrFacilities:', error);
    throw new Error('Failed to update staff record.', { cause: error });
  }
}

export async function updateAssistantAccess(requesterEmail: string, fullAccess: boolean) {
  try {
    await db
      .update(staffMembers)
      .set({ assistantFullAccess: fullAccess })
      .where(eq(staffMembers.email, requesterEmail.toLowerCase()));
  } catch (error) {
    console.error('Database query failed in updateAssistantAccess:', error);
    throw new Error('Failed to update assistant permissions.', { cause: error });
  }
}

export async function recordAuditEntry(uid: string, actorName: string, facility: string, entry: string) {
  try {
    await db.insert(auditLogs).values({
      actorUid: uid,
      actorName,
      facility,
      entry,
    });
  } catch (error) {
    console.error('Database query failed in recordAuditEntry:', error);
    throw new Error('Failed to save audit log.', { cause: error });
  }
}
