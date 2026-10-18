import { describe, expect, it } from 'vitest';
import type { SqlAccess } from '../api/realPiiReviewApi';
import { connectionUrl } from './sqlConnection';

const access: SqlAccess = {
  enabled: true,
  has_credentials: true,
  host: 'db.example.com',
  port: 5432,
  database: 'piiguard',
  username: 'piiguard_analyst_2',
  sslmode: 'require',
  password: null,
  datasets: [],
};

describe('connectionUrl', () => {
  it('leaves the password out when it is not on screen', () => {
    expect(connectionUrl(access, null)).toBe('postgresql://piiguard_analyst_2@db.example.com:5432/piiguard?sslmode=require');
  });

  it('escapes the password', () => {
    expect(connectionUrl(access, 'a/b@c')).toBe(
      'postgresql://piiguard_analyst_2:a%2Fb%40c@db.example.com:5432/piiguard?sslmode=require',
    );
  });
});
