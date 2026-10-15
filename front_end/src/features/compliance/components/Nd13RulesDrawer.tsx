import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import GavelIcon from '@mui/icons-material/Gavel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { ND13_KEY_ARTICLES, PII_CLASSIFICATION_RULES, type PiiClassificationRule } from '../model/nd13Rules';

export interface Nd13RulesDrawerProps {
  open: boolean;
  onClose: () => void;
}

function ClassificationCard({ rule }: { rule: PiiClassificationRule }): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {rule.categoryName}
          </Typography>
          <Chip label={rule.badgeLabel} color={rule.badgeColor} size="small" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {rule.description}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Ví dụ: {rule.examples.join(', ')}
        </Typography>
        <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, display: 'block' }}>
            Sàn bảo mật: {rule.securityFloor}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {rule.exceptionPolicy}
          </Typography>
          <Divider sx={{ my: 0.75 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Căn cứ: {rule.legalBasis}
            </Typography>
            <Button
              size="small"
              component="a"
              href={rule.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon fontSize="inherit" />}
              sx={{ minHeight: 28, fontSize: '0.6875rem', textTransform: 'none', p: 0.25 }}
              aria-label={`Xem nguồn luật cho ${rule.badgeLabel}`}
            >
              Xem nguồn
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

export function Nd13RulesDrawer({ open, onClose }: Nd13RulesDrawerProps): JSX.Element {
  const [tabIndex, setTabIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRules = PII_CLASSIFICATION_RULES.filter((rule) =>
    searchQuery === '' ||
    rule.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.legalBasis.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.examples.some((ex) => ex.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArticles = ND13_KEY_ARTICLES.filter((article) =>
    searchQuery === '' ||
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.legalBasis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, p: 3 } }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GavelIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Căn cứ pháp lý & Quy định
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Luật BV DLCN & Quy chuẩn bảo vệ dữ liệu cá nhân
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Đóng cẩm nang" edge="end">
            <CloseIcon />
          </IconButton>
        </Stack>

        <TextField
          size="small"
          placeholder="Tìm quy định, loại PII, điều khoản..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          fullWidth
        />

        <Tabs value={tabIndex} onChange={(_, next: number) => setTabIndex(next)} variant="fullWidth">
          <Tab icon={<ShieldOutlinedIcon fontSize="small" />} iconPosition="start" label="Phân loại PII (L1 ➔ L2 ➔ L3)" />
          <Tab icon={<GavelIcon fontSize="small" />} iconPosition="start" label="Điều khoản luật" />
        </Tabs>
        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
          {tabIndex === 0 && (
            <Stack spacing={2}>
              {filteredRules.map((rule) => (
                <ClassificationCard key={rule.level} rule={rule} />
              ))}
            </Stack>
          )}

          {tabIndex === 1 && (
            <Stack spacing={2}>
              {filteredArticles.map((article) => (
                <Paper key={article.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={article.articleNumber} color="primary" size="small" variant="outlined" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {article.title}
                        </Typography>
                      </Stack>
                      <Button
                        size="small"
                        component="a"
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNewIcon fontSize="inherit" />}
                        sx={{ minHeight: 28, fontSize: '0.6875rem', textTransform: 'none', p: 0.25 }}
                        aria-label={`Xem văn bản gốc ${article.articleNumber}`}
                      >
                        Toàn văn
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {article.summary}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Căn cứ: {article.legalBasis}
                    </Typography>
                    <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                      {article.details.map((detail, idx) => (
                        <Typography key={idx} component="li" variant="caption" color="text.secondary">
                          {detail}
                        </Typography>
                      ))}
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Drawer>
  );
}
