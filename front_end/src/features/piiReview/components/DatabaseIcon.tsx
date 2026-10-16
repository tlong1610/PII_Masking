import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Database cylinder (Material Icons has none; StorageOutlined reads as a server rack). */
export function DatabaseIcon(props: SvgIconProps): JSX.Element {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
        <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" />
        <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
      </g>
    </SvgIcon>
  );
}
