import { keyframes, styled } from '@mui/material/styles';
import awaiting from '@/assets/mascot/pango-awaiting.webp';
import defaultPose from '@/assets/mascot/pango-default.webp';
import detected from '@/assets/mascot/pango-detected.webp';
import error from '@/assets/mascot/pango-error.webp';
import loading from '@/assets/mascot/pango-loading.webp';
import protectedPose from '@/assets/mascot/pango-protected.webp';
import scanning from '@/assets/mascot/pango-scanning.webp';

/** Poses of Pango, the pangolin mascot. Mirrors the `State` variants of the Figma "Pango" component. */
export type MascotPose = 'default' | 'scanning' | 'detected' | 'awaiting' | 'loading' | 'error' | 'protected';

const SOURCES: Record<MascotPose, string> = {
  default: defaultPose,
  scanning,
  detected,
  awaiting,
  loading,
  error,
  protected: protectedPose,
};

// A real <img> (not Box) so width/height reach the DOM and reserve space before the asset loads.
const Img = styled('img')({});

const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

type MascotProps = {
  pose: MascotPose;
  /** Rendered width and height in px. */
  size?: number;
  /** Alt text. Leave empty when nearby text already says the same thing: the image is then decorative. */
  label?: string;
  /** Gentle bobbing, turned off for users who prefer reduced motion. */
  float?: boolean;
};

export function Mascot({ pose, size = 160, label, float = false }: MascotProps): JSX.Element {
  return (
    <Img
      src={SOURCES[pose]}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      data-pose={pose}
      sx={{
        width: size,
        height: size,
        maxWidth: '100%',
        objectFit: 'contain',
        flexShrink: 0,
        userSelect: 'none',
        ...(float && {
          animation: `${bob} 3s ease-in-out infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }),
      }}
    />
  );
}
