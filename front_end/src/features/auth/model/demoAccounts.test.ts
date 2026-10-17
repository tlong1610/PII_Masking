import { describe, expect, it } from 'vitest';
import { isDemoLoginEnabled } from './demoAccounts';

describe('isDemoLoginEnabled', () => {
  it('shows demo accounts while developing', () => {
    expect(isDemoLoginEnabled({ DEV: true })).toBe(true);
  });

  it('hides demo accounts in a release build by default', () => {
    expect(isDemoLoginEnabled({ DEV: false })).toBe(false);
    expect(isDemoLoginEnabled({ DEV: false, VITE_ENABLE_DEMO_LOGIN: 'false' })).toBe(false);
  });

  it('can be turned on for an internal demo build', () => {
    expect(isDemoLoginEnabled({ DEV: false, VITE_ENABLE_DEMO_LOGIN: 'true' })).toBe(true);
  });
});
