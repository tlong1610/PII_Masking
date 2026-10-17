import { styled } from '@mui/material/styles';
import logo from '@/assets/brand/logo.webp';

const Img = styled('img')({});

/** PIIGuard Shield app mark. Decorative: it always sits next to the product name. */
export function BrandLogo({ size = 32 }: { size?: number }): JSX.Element {
  return (
    <Img
      src={logo}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
      sx={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
