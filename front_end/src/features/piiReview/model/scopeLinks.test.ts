import { describe, expect, it } from 'vitest';
import { analyzeScopeLinks, effectiveLinkScope, type ScopeRelationship } from './scopeLinks';

const rel = (source: string, sourceCol: string, target: string, targetCol: string): ScopeRelationship => ({
  source_table: source,
  source_column: sourceCol,
  target_table: target,
  target_column: targetCol,
});

const ORDERS = rel('orders', 'customer_id', 'customers', 'customer_id');
const USER_ROLES = [rel('user_roles', 'user_id', 'users', 'id'), rel('user_roles', 'role_id', 'roles', 'id')];

describe('analyzeScopeLinks', () => {
  it('flags an unselected parent table referenced by a selected FK', () => {
    expect(analyzeScopeLinks(['orders'], [], [ORDERS])).toEqual({
      missingParents: [{ table: 'customers', connects: ['orders'] }],
      missingBridges: [],
      missingChildren: [],
    });
  });

  it('only informs about an unselected child table', () => {
    const result = analyzeScopeLinks(['customers'], [], [ORDERS]);
    expect(result.missingParents).toEqual([]);
    expect(result.missingChildren).toEqual(['orders']);
  });

  it('flags a bridge table linking two selected tables', () => {
    const result = analyzeScopeLinks(['users', 'roles'], [], USER_ROLES);
    expect(result.missingBridges).toEqual([{ table: 'user_roles', connects: ['roles', 'users'] }]);
    expect(result.missingChildren).toEqual([]);
  });

  it('reports nothing once the bridge is included as a link table', () => {
    expect(analyzeScopeLinks(['users', 'roles'], ['user_roles'], USER_ROLES)).toEqual({
      missingParents: [],
      missingBridges: [],
      missingChildren: [],
    });
  });
});

describe('analyzeScopeLinks with link tables', () => {
  it("ignores a link table's own FKs to tables outside the scope", () => {
    const regions = rel('customers', 'region_id', 'regions', 'id');
    expect(analyzeScopeLinks(['orders'], ['customers'], [ORDERS, regions]).missingParents).toEqual([]);
  });
});

describe('effectiveLinkScope', () => {
  it('drops link tables that are selected in full or no longer in the scope', () => {
    expect(effectiveLinkScope(['user_roles', 'users', 'gone'], ['users'], ['users', 'user_roles'])).toEqual([
      'user_roles',
    ]);
  });
});
