import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps): JSX.Element {
  return (
    <Stack spacing={1} sx={{ maxWidth: 820 }}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 800 }}>
        {eyebrow}
      </Typography>
      <Typography variant="h1" color="text.primary">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  );
}
