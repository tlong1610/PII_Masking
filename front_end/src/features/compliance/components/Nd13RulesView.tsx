import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { SectionHeader } from '@/shared/ui';
import {
  ND13_KEY_ARTICLES,
  OFFICIAL_LEGAL_DOCUMENTS,
  PII_ACTION_MATRIX,
  PII_CLASSIFICATION_RULES,
  type PiiClassificationRule,
} from '../model/nd13Rules';

function LegalSourcesSection(): JSX.Element {
  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5, p: { xs: 2, md: 2.5 }, bgcolor: 'background.paper' }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MenuBookIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Văn Bản Pháp Luật Nguồn & Dẫn Chứng Trực Tiếp
          </Typography>
          <Chip label="2 Luật Chủ Lực" color="primary" size="small" sx={{ fontWeight: 600, height: 22 }} />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Hệ thống PIIGuard Shield vận hành đối chiếu trực tiếp theo 2 văn bản pháp lý nền tảng của Việt Nam. Người dùng và DPO có thể nhấp vào liên kết để đọc toàn văn trên văn bản chính thức:
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            width: '100%',
          }}
        >
          {OFFICIAL_LEGAL_DOCUMENTS.map((doc) => (
            <Paper
              key={doc.id}
              variant="outlined"
              sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'action.hover',
                borderRadius: 1.5,
              }}
            >
              <Stack spacing={1.5} sx={{ height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {doc.code}
                  </Typography>
                  <Chip
                    label={doc.primaryBadge}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.6875rem', height: 20, fontWeight: 600 }}
                  />
                </Stack>

                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {doc.title}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {doc.summary}
                </Typography>

                <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>
                    Điều khoản trọng tâm: {doc.keyArticles}
                  </Typography>
                </Box>

                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Cơ quan: {doc.promulgatedBy}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      component="a"
                      href={doc.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNewIcon fontSize="small" />}
                      sx={{ minHeight: 36, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                      aria-label={`Đọc toàn văn ${doc.code} trên web`}
                    >
                      Đọc toàn văn trên web
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Stack>
    </Card>
  );
}

function ClassificationCard({ rule }: { rule: PiiClassificationRule }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ p: 2.5, height: '100%', borderRadius: 1.5 }}>
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
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
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
              sx={{ minHeight: 32, fontSize: '0.6875rem', textTransform: 'none', p: 0.5 }}
              aria-label={`Xem nguồn luật cho ${rule.badgeLabel}`}
            >
              Xem nguồn
            </Button>
          </Stack>
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
    rule.legalBasis.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.examples.some((ex) => ex.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArticles = ND13_KEY_ARTICLES.filter((article) =>
    searchQuery === '' ||
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.legalBasis.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.details.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Stack spacing={3}>
      <SectionHeader
        eyebrow="Quy chuẩn & Pháp lý (Regulatory Compliance)"
        title="Quy Định Pháp Luật & Chuẩn Bảo Vệ Dữ Liệu"
        description="Toàn bộ quy tắc phân loại dữ liệu cá nhân (L1, L2, L3), sàn bảo mật kỹ thuật tối thiểu, và điều khoản pháp luật bắt buộc phục vụ hoạt động thẩm định của DPO."
      />

      <LegalSourcesSection />

      <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
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

        {activeTab === 0 && (
          <Box sx={{ p: { xs: 2, md: 2.5 } }}>
            <Grid container spacing={2.5}>
              {filteredRules.map((rule) => (
                <Grid item xs={12} md={4} key={rule.level}>
                  <ClassificationCard rule={rule} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ p: { xs: 2, md: 2.5 } }}>
            <Grid container spacing={2.5}>
              {filteredArticles.map((article) => (
                <Grid item xs={12} md={6} key={article.id}>
                  <Card variant="outlined" sx={{ p: 2.5, height: '100%', borderRadius: 1.5 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={article.articleNumber} color="primary" size="small" sx={{ fontWeight: 700 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {article.title}
                          </Typography>
                        </Stack>
                        <Button
                          size="small"
                          variant="outlined"
                          component="a"
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          endIcon={<OpenInNewIcon fontSize="small" />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', minHeight: 32, fontWeight: 600 }}
                          aria-label={`Xem văn bản gốc ${article.articleNumber}`}
                        >
                          Toàn văn trên web
                        </Button>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {article.summary}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Căn cứ: {article.legalBasis}
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
          </Box>
        )}

        {activeTab === 2 && (
          <TableContainer>
            <Table size="small" aria-label="Ma trận hành động bảo vệ PII">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 700, width: '20%' }}>Cấp độ PII</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '32%' }}>Định nghĩa pháp lý</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: '12%' }}>MASK (Che mờ)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: '12%' }}>HMAC (Băm bí mật)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: '12%' }}>DROP (Loại bỏ)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: '12%' }}>KEEP (Ngoại lệ)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PII_ACTION_MATRIX.map((row) => (
                  <TableRow key={row.level} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={row.level} color={row.badgeColor} size="small" sx={{ fontWeight: 700, minWidth: 32 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {row.levelLabel}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                      {row.definition}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={row.mask.label} color={row.mask.color} size="small" sx={{ minWidth: 72, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={row.hmac.label} color={row.hmac.color} size="small" sx={{ minWidth: 72, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={row.drop.label} color={row.drop.color} size="small" sx={{ minWidth: 72, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={row.keep.label} color={row.keep.color} size="small" sx={{ minWidth: 72, fontWeight: 600 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}
