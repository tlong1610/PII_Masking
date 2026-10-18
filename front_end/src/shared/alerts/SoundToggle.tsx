import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import { useAlerts } from './alertsContext';

export function SoundToggle(): JSX.Element {
  const { soundOn, toggleSound } = useAlerts();
  const label = soundOn ? 'Tắt âm báo khi quét xong' : 'Bật âm báo khi quét xong';
  return (
    <Tooltip title={label}>
      <IconButton size="small" onClick={toggleSound} aria-label={label} aria-pressed={soundOn} sx={{ color: 'text.secondary' }}>
        {soundOn ? <NotificationsActiveOutlinedIcon fontSize="small" /> : <NotificationsOffOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
