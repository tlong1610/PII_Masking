import { describe, expect, it } from 'vitest';
import { AUDIT_FILTERS, describeAuditEvent, parseDecisionChanges, parseKeyValues } from './auditDescribe';

const firstSave =
  "count=3; changes=[customers.customer_id[v1]: NEW -> HMAC (reason: 'DPO accepted suggested HMAC policy for customer_id'); " +
  "customers.full_name[v1]: NEW -> MASK (reason: 'DPO accepted suggested MASK policy for full_name'); " +
  "customers.phone[v1]: NEW -> DROP (reason: 'DPO changed policy to DROP for phone')]";

const revision =
  "count=2; changes=[customers.customer_id[v2]: HMAC -> MASK (reason: 'Không cần nối bảng; che là đủ'); " +
  "customers.full_name[v2]: MASK -> MASK (reason: 'DPO accepted suggested MASK policy for full_name')]";

describe('parseDecisionChanges', () => {
  it('reads every column, including reasons containing semicolons', () => {
    const changes = parseDecisionChanges(revision);
    expect(changes).toEqual([
      { column: 'customers.customer_id', version: 2, from: 'HMAC', to: 'MASK', note: 'Không cần nối bảng; che là đủ' },
      { column: 'customers.full_name', version: 2, from: 'MASK', to: 'MASK', note: 'Theo đề xuất' },
    ]);
  });

  it('marks first decisions and translates scanner notes', () => {
    const [first, , third] = parseDecisionChanges(firstSave);
    expect(first).toMatchObject({ from: null, to: 'HMAC', note: 'Theo đề xuất' });
    expect(third).toMatchObject({ note: 'DPO tự chọn' });
  });
});

describe('describeAuditEvent', () => {
  it('summarises a first review', () => {
    expect(describeAuditEvent({ action: 'save_decisions', reason: firstSave }).summary).toBe(
      'Duyệt lần đầu 3 cột · 1 cột khác đề xuất',
    );
  });

  it('lists what changed in a later save', () => {
    expect(describeAuditEvent({ action: 'save_decisions', reason: revision }).summary).toBe(
      'Đổi 1 cột — customer_id: Băm HMAC → Che dữ liệu',
    );
  });

  it('explains scans, builds and revokes without jargon', () => {
    expect(
      describeAuditEvent({ action: 'create_run', reason: 'source=sql-demo; scope=customers,orders; scan=pg-ai' }).summary,
    ).toBe('Quét 2 bảng (customers, orders) bằng AI');
    expect(describeAuditEvent({ action: 'build_run', reason: 'build -> VERIFIED (verifier passed)' })).toMatchObject({
      summary: 'Tạo dữ liệu cho Analyst — kiểm định đạt',
      tone: 'success',
    });
    expect(describeAuditEvent({ action: 'build_run', reason: 'build -> FAILED (verifier)' }).tone).toBe('error');
    expect(describeAuditEvent({ action: 'revoke_dataset', reason: 'drop_pg_failed=ModuleNotFoundError' }).tone).toBe('error');
  });

  it('keeps unknown actions readable', () => {
    expect(describeAuditEvent({ action: 'new_action', reason: 'x=1' })).toMatchObject({ title: 'new_action', summary: 'x=1' });
  });
});

describe('parseKeyValues', () => {
  it('splits key=value notes', () => {
    expect(parseKeyValues('source=sql-demo; status=REVOKED; datasets=1')).toEqual({
      source: 'sql-demo',
      status: 'REVOKED',
      datasets: '1',
    });
  });
});

describe('AUDIT_FILTERS', () => {
  it('keeps logins out of the default data activity filter', () => {
    const data = AUDIT_FILTERS.find((filter) => filter.value === 'DATA');
    expect(data?.actions).toContain('publish_dataset');
    expect(data?.actions).not.toContain('login');
  });
});
