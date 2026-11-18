import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  type: text('type').notNull().default('PHC'),
  lga: text('lga').notNull().default('Katagum'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const staffMembers = pgTable('staff_members', {
  id: serial('id').primaryKey(),
  staffCode: text('staff_code').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(), // 'oc' | 'asst' | 'nurse' | 'lab' | 'pharm'
  primaryFacility: text('primary_facility').notNull(),
  assignedFacilities: jsonb('assigned_facilities').$type<string[]>().notNull().default([]),
  status: text('status').notNull().default('Active'), // 'Active' | 'Suspended' | 'Terminated' | 'Blocked'
  assistantFullAccess: boolean('assistant_full_access').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  patientCode: text('patient_code').notNull().unique(),
  name: text('name').notNull(),
  sex: text('sex').notNull(),
  age: text('age').notNull(),
  allergy: text('allergy').notNull().default(''),
  bloodGroup: text('blood_group').notNull().default('O+'),
  nin: text('nin').notNull().default(''),
  idVerified: text('id_verified').notNull().default('Not verified'),
  pin: text('pin').notNull().default('1234'),
  phone: text('phone').notNull().default(''),
  lga: text('lga').notNull().default(''),
  address: text('address').notNull().default(''),
  dob: text('dob').notNull().default(''),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const encounters = pgTable('encounters', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  patientCode: text('patient_code')
    .notNull()
    .references(() => patients.patientCode),
  encounterType: text('encounter_type').notNull(),
  timeLabel: text('time_label').notNull(),
  recordedBy: text('recorded_by').notNull(),
  chiefComplaint: text('chief_complaint').notNull().default(''),
  labs: jsonb('labs').$type<string[]>().notNull().default([]),
  results: jsonb('results').$type<string[]>().notNull().default([]),
  diagnosis: text('diagnosis').notNull().default(''),
  diagnosisMethod: text('diagnosis_method').notNull().default(''),
  medications: jsonb('medications').$type<string[]>().notNull().default([]),
  rxStatus: text('rx_status').notNull().default(''),
  outcome: text('outcome').notNull().default(''),
  notes: text('notes').notNull().default(''),
  synced: boolean('synced').notNull().default(true),
  status: text('status').notNull().default(''),
  stage: integer('stage').notNull().default(1),
  bypassReason: text('bypass_reason').notNull().default(''),
  extraFields: jsonb('extra_fields').$type<Record<string, string>>().notNull().default({}),
  facility: text('facility').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const labTasks = pgTable('lab_tasks', {
  id: serial('id').primaryKey(),
  taskUid: text('task_uid').notNull().unique(),
  patientName: text('patient_name').notNull(),
  summaryText: text('summary_text').notNull(),
  items: jsonb('items').$type<string[]>().notNull().default([]),
  encounterUid: text('encounter_uid').notNull().default(''),
  facility: text('facility').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pharmacyTasks = pgTable('pharmacy_tasks', {
  id: serial('id').primaryKey(),
  taskUid: text('task_uid').notNull().unique(),
  patientName: text('patient_name').notNull(),
  summaryText: text('summary_text').notNull(),
  items: jsonb('items').$type<string[]>().notNull().default([]),
  encounterUid: text('encounter_uid').notNull().default(''),
  facility: text('facility').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referralCode: text('referral_code').notNull().unique(),
  patientCode: text('patient_code')
    .notNull()
    .references(() => patients.patientCode),
  patientName: text('patient_name').notNull(),
  fromFacility: text('from_facility').notNull(),
  toFacility: text('to_facility').notNull(),
  reason: text('reason').notNull(),
  urgency: text('urgency').notNull().default('Routine'),
  treatmentGiven: text('treatment_given').notNull().default(''),
  summaryLines: jsonb('summary_lines').$type<string[]>().notNull().default([]),
  status: text('status').notNull().default('Delivered'),
  timeLabel: text('time_label').notNull(),
  feedback: text('feedback').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  notifUid: text('notif_uid').notNull().unique(),
  encounterUid: text('encounter_uid').notNull().default(''),
  patientCode: text('patient_code').notNull(),
  kind: text('kind').notNull(), // 'lab' | 'ph' | 'ref'
  patientName: text('patient_name').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  facility: text('facility').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull().default(''),
  actorName: text('actor_name').notNull().default(''),
  facility: text('facility').notNull().default(''),
  entry: text('entry').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mobileAuthCodes = pgTable('mobile_auth_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  idToken: text('id_token').notNull().default(''),
  accessToken: text('access_token').notNull().default(''),
  email: text('email').notNull().default(''),
  used: boolean('used').notNull().default(false),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  creator: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  encounters: many(encounters),
  referrals: many(referrals),
}));

export const encountersRelations = relations(encounters, ({ one }) => ({
  patient: one(patients, {
    fields: [encounters.patientCode],
    references: [patients.patientCode],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  patient: one(patients, {
    fields: [referrals.patientCode],
    references: [patients.patientCode],
  }),
}));
