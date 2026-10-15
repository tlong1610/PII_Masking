import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { SectionHeader } from '@/shared/ui';
import { MaskingSandboxCard } from './MaskingSandboxCard';
import { MaskingMatrixTable } from './MaskingMatrixTable';

export function MaskingDemoView(): JSX.Element {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Stack spacing={3}>
        <SectionHeader
          eyebrow="Security & Compliance"
          title="Demo Che Dữ Liệu (Masking Showcase)"
          description="Trực quan hóa cơ chế bảo vệ PII: Che mờ (MASK ***), Băm bí mật (HMAC SHA-256) và Triệt tiêu (DROP) theo quy chuẩn pháp luật bảo vệ dữ liệu cá nhân"
        />

        {/* Live Interactive Sandbox */}
        <MaskingSandboxCard />

        {/* Unified Matrix Comparison Table (No fragmented sub-tabs) */}
        <MaskingMatrixTable />
      </Stack>
    </Box>
  );
}
