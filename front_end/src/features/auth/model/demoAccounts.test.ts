import { describe, expect, it } from 'vitest';
import { isDemoLoginEnabled } from './demoAccounts';

describe('isDemoLoginEnabled', () => {
  it('shows demo accounts while developing and in tests', () => {
    expect(isDemoLoginEnabled({ MODE: 'development' })).toBe(true);
    expect(isDemoLoginEnabled({ MODE: 'test' })).toBe(true);
  });

  it('hides demo accounts in a release build by default', () => {
    expect(isDemoLoginEnabled({ MODE: 'production' })).toBe(false);
    expect(isDemoLoginEnabled({ MODE: 'production', VITE_ENABLE_DEMO_LOGIN: 'false' })).toBe(false);
  });

  it('can be turned on for an internal demo build', () => {
    expect(isDemoLoginEnabled({ MODE: 'production', VITE_ENABLE_DEMO_LOGIN: 'true' })).toBe(true);
  });
});
