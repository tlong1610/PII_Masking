import Stack from '@mui/material/Stack';
import { SectionHeader } from '@/shared/ui';
import { MaskingSandboxCard } from './MaskingSandboxCard';
import { MaskingMatrixTable } from './MaskingMatrixTable';

export function MaskingDemoView(): JSX.Element {
  return (
    <Stack spacing={3}>
      <SectionHeader
        eyebrow="Bảo mật & tuân thủ"
        title="Demo che dữ liệu"
        description="Xem trực quan bốn cách xử lý dữ liệu cá nhân — giữ nguyên, che mờ (MASK), băm mật mã (HMAC) và loại bỏ (DROP) — theo quy định bảo vệ dữ liệu cá nhân. Mọi giá trị trên trang là dữ liệu giả lập."
      />
      <MaskingSandboxCard />
      <MaskingMatrixTable />
    </Stack>
  );
}
