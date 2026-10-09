import { describe, expect, it } from 'vitest';
import {
  EMPTY_FIELD_NOTE,
  buildFieldDecisionPayload,
  getFieldKind,
  validateFieldDecision,
} from './fieldDecision';

const today = '2026-10-04';

describe('getFieldKind', () => {
  it.each([
    ['NON_PERSONAL', 'NON_PERSONAL'],
    ['PERSONAL_SENSITIVE', 'SENSITIVE'],
    ['PERSONAL_BASIC', 'PII'],
    ['PERSONAL_CONTEXT', 'PII'],
    ['UNKNOWN', 'UNKNOWN'],
    ['QUASI_IDENTIFIER', 'QUASI'],
  ])('%s -> %s', (classification, kind) => {
    expect(getFieldKind(classification)).toBe(kind);
  });
});

describe('validateFieldDecision', () => {
  it('blocks KEEP on UNKNOWN until confirmed not personal, then needs a reason', () => {
    const base = { kind: 'UNKNOWN' as const, action: 'KEEP' as const, recommendedAction: 'MASK' as const, today };
    expect(validateFieldDecision({ ...base, note: EMPTY_FIELD_NOTE })).toMatch(/xác nhận/);
    expect(validateFieldDecision({ ...base, note: { ...EMPTY_FIELD_NOTE, notPersonal: true } })).toMatch(/lý do/);
    expect(
      validateFieldDecision({ ...base, note: { ...EMPTY_FIELD_NOTE, notPersonal: true, reason: 'Ticket status' } }),
    ).toBeNull();
  });

  it('requires a future deadline and a reason to KEEP a PII field', () => {
    const base = { kind: 'PII' as const, action: 'KEEP' as const, recommendedAction: 'MASK' as const, today };
    expect(validateFieldDecision({ ...base, note: { ...EMPTY_FIELD_NOTE, reason: 'study' } })).toMatch(/thời hạn/);
    expect(
      validateFieldDecision({ ...base, note: { ...EMPTY_FIELD_NOTE, reason: 'study', exceptionUntil: today } }),
    ).toMatch(/tương lai/);
    expect(
      validateFieldDecision({ ...base, note: { ...EMPTY_FIELD_NOTE, reason: 'study', exceptionUntil: '2027-01-01' } }),
    ).toBeNull();
  });

  it('lets a quasi-identifier (L1) be kept without confirmation or exception', () => {
    expect(
      validateFieldDecision({ kind: 'QUASI', action: 'KEEP', recommendedAction: 'KEEP', note: EMPTY_FIELD_NOTE, today }),
    ).toBeNull();
  });

  it('never allows KEEP on sensitive data and accepts recommendations without a reason', () => {
    expect(
      validateFieldDecision({ kind: 'SENSITIVE', action: 'KEEP', recommendedAction: 'MASK', note: EMPTY_FIELD_NOTE, today }),
    ).not.toBeNull();
    expect(
      validateFieldDecision({ kind: 'NON_PERSONAL', action: 'KEEP', recommendedAction: 'KEEP', note: EMPTY_FIELD_NOTE, today }),
    ).toBeNull();
  });
});

describe('buildFieldDecisionPayload', () => {
  it('sends the reclassification for a confirmed UNKNOWN field', () => {
    const payload = buildFieldDecisionPayload({
      fieldProfileId: 7,
      fieldPath: 'status',
      kind: 'UNKNOWN',
      action: 'KEEP',
      recommendedAction: 'MASK',
      note: { reason: 'Ticket status', notPersonal: true, exceptionUntil: '' },
    });
    expect(payload).toMatchObject({
      classification_override: 'NON_PERSONAL',
      is_exception: false,
      exception_until: null,
      reason: 'Ticket status',
    });
  });

  it('sends the exception and its deadline for a PII field kept as is', () => {
    const payload = buildFieldDecisionPayload({
      fieldProfileId: 8,
      fieldPath: 'phone',
      kind: 'PII',
      action: 'KEEP',
      recommendedAction: 'MASK',
      note: { reason: 'Approved study', notPersonal: false, exceptionUntil: '2027-01-01' },
    });
    expect(payload).toMatchObject({
      is_exception: true,
      exception_until: '2027-01-01T23:59:59Z',
      classification_override: null,
    });
  });
});
