import { randomUUID } from 'node:crypto';
import { db } from './store.js';

const KEY = 'leads';
const MAX_LEADS = 200;

export async function saveLead({ name, contact, message }) {
  const lead = { id: randomUUID(), name, contact, message, createdAt: new Date().toISOString() };
  await db.lpush(KEY, lead);
  await db.ltrim(KEY, 0, MAX_LEADS - 1);
  return lead;
}

export async function listLeads(limit = 100) {
  return db.lrange(KEY, 0, limit - 1);
}
