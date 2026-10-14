import { useState } from 'react';
import Box from '@mui/material/Box';
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
    rule.examples.some((ex) => ex.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArticles = ND13_KEY_ARTICLES.filter((article) =>
    searchQuery === '' ||
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, p: 3 } }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GavelIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Cẩm nang Nghị định 13
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Luật BV DLCN 2025 & NĐ 13/2023/NĐ-CP
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
          <Tab icon={<ShieldOutlinedIcon fontSize="small" />} iconPosition="start" label="Phân loại PII" />
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
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={article.articleNumber} color="primary" size="small" variant="outlined" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {article.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {article.summary}
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
