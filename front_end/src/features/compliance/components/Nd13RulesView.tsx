import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import SearchIcon from '@mui/icons-material/Search';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { SectionHeader } from '@/shared/ui';
import { ND13_KEY_ARTICLES, PII_CLASSIFICATION_RULES, type PiiClassificationRule } from '../model/nd13Rules';

function ClassificationCard({ rule }: { rule: PiiClassificationRule }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ p: 2.5, height: '100%', borderRadius: 2 }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {rule.categoryName}
          </Typography>
          <Chip label={rule.badgeLabel} color={rule.badgeColor} size="small" sx={{ fontWeight: 600 }} />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {rule.description}
        </Typography>

        <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
            Các trường dữ liệu điển hình:
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {rule.examples.map((ex) => (
              <Chip key={ex} label={ex} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: 'auto', p: 1.5, bgcolor: 'primary.light', borderRadius: 1.5, border: 1, borderColor: 'primary.main' }}>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, display: 'block' }}>
            Sàn bảo mật kỹ thuật: {rule.securityFloor}
          </Typography>
          <Typography variant="caption" color="text.primary" sx={{ display: 'block', mt: 0.5 }}>
            {rule.exceptionPolicy}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

export function Nd13RulesView(): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);
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
    article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.details.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Stack spacing={3}>
      <SectionHeader
        eyebrow="Quy chuẩn & Pháp lý (Regulatory Compliance)"
        title="Quy Định Pháp Luật & Chuẩn Bảo Vệ Dữ Liệu"
        description="Toàn bộ quy tắc phân loại dữ liệu cá nhân (L1, L2, L3), sàn bảo mật kỹ thuật tối thiểu, và điều khoản pháp luật bắt buộc phục vụ hoạt động thẩm định của DPO."
      />

      <Paper variant="outlined">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, val: number) => setActiveTab(val)} aria-label="Nhóm quy tắc pháp lý">
            <Tab icon={<ShieldOutlinedIcon fontSize="small" />} iconPosition="start" label="Phân loại PII (L1 ➔ L2 ➔ L3)" />
            <Tab icon={<GavelIcon fontSize="small" />} iconPosition="start" label="Điều khoản luật trọng yếu" />
            <Tab icon={<FactCheckOutlinedIcon fontSize="small" />} iconPosition="start" label="Ma trận hành động bảo vệ" />
          </Tabs>

          <TextField
            size="small"
            placeholder="Tìm kiếm quy định pháp luật, điều khoản, loại PII..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
        </Stack>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {activeTab === 0 && (
            <Grid container spacing={2.5}>
              {filteredRules.map((rule) => (
                <Grid item xs={12} md={4} key={rule.level}>
                  <ClassificationCard rule={rule} />
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={2.5}>
              {filteredArticles.map((article) => (
                <Grid item xs={12} md={6} key={article.id}>
                  <Card variant="outlined" sx={{ p: 2.5, height: '100%', borderRadius: 2 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={article.articleNumber} color="primary" size="small" sx={{ fontWeight: 700 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {article.title}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {article.summary}
                      </Typography>
                      <Divider />
                      <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                        {article.details.map((detail, idx) => (
                          <Typography key={idx} component="li" variant="body2" color="text.secondary" sx={{ py: 0.25 }}>
                            {detail}
                          </Typography>
                        ))}
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 2 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="Ma trận hành động bảo vệ PII">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Cấp độ PII</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Định nghĩa pháp lý</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>MASK (Che mờ)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>HMAC (Băm bí mật)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>DROP (Loại bỏ)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>KEEP (Ngoại lệ)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>L3 — Nhạy cảm</TableCell>
                    <TableCell>Bệnh án, tài chính, tôn giáo, sinh trắc học</TableCell>
                    <TableCell><Chip label="Bắt buộc" color="success" size="small" /></TableCell>
                    <TableCell><Chip label="Tùy chọn" size="small" /></TableCell>
                    <TableCell><Chip label="Bắt buộc" color="success" size="small" /></TableCell>
                    <TableCell><Chip label="Cấm tuyệt đối" color="error" size="small" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>L2 — Cơ bản</TableCell>
                    <TableCell>Họ tên, SĐT, CCCD, Email, Nơi cư trú</TableCell>
                    <TableCell><Chip label="Khuyến nghị" color="success" size="small" /></TableCell>
                    <TableCell><Chip label="Hợp lệ" color="info" size="small" /></TableCell>
                    <TableCell><Chip label="Hợp lệ" size="small" /></TableCell>
                    <TableCell><Chip label="Có thời hạn" color="warning" size="small" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>L1 — Gián tiếp</TableCell>
                    <TableCell>User ID, Session ID, Khóa nối liên kết</TableCell>
                    <TableCell><Chip label="Tùy chọn" size="small" /></TableCell>
                    <TableCell><Chip label="Khuyến nghị" color="success" size="small" /></TableCell>
                    <TableCell><Chip label="Tùy chọn" size="small" /></TableCell>
                    <TableCell><Chip label="Cho phép" color="info" size="small" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
