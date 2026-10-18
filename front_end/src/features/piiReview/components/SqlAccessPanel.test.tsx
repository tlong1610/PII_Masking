import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SqlAccess } from '../api/realPiiReviewApi';
import { SqlAccessPanel } from './SqlAccessPanel';

const access: SqlAccess = {
  enabled: true,
  has_credentials: false,
  host: 'db.example.com',
  port: 5432,
  database: 'piiguard',
  username: 'piiguard_analyst_2',
  sslmode: 'require',
  password: null,
  datasets: [{ dataset_id: 7, dataset_name: 'Khách hàng Q3', schema_name: 'ds_7', tables: ['customers', 'orders'] }],
};

const mutateAsync = vi.fn(() => Promise.resolve({ ...access, has_credentials: true, password: 's3cret-once' }));

vi.mock('../hooks/usePiiReview', () => ({
  useSqlAccess: () => ({ data: access, isLoading: false, isError: false }),
  useIssueSqlCredentials: () => ({ mutateAsync, isPending: false, isError: false }),
}));

describe('SqlAccessPanel', () => {
  it('shows where to connect and how to query this dataset', () => {
    render(<SqlAccessPanel datasetId={7} />);
    expect(screen.getByRole('table', { name: 'Thông tin kết nối SQL' })).toHaveTextContent('db.example.com');
    expect(screen.getByText(/FROM ds_7\.customers/)).toBeInTheDocument();
    expect(screen.getByText('Chưa tạo')).toBeInTheDocument();
  });

  it('shows the new password once with a warning to save it', async () => {
    render(<SqlAccessPanel datasetId={7} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thông tin kết nối' }));
    expect(await screen.findByText('s3cret-once')).toBeInTheDocument();
    expect(screen.getByText(/chỉ hiện một lần/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeInTheDocument();
  });

  it('says when the dataset is not available over SQL', () => {
    render(<SqlAccessPanel datasetId={99} />);
    expect(screen.getByText(/chưa có trong kết nối SQL/)).toBeInTheDocument();
  });
});
