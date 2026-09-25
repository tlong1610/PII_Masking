import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DatasetOutlinedIcon from '@mui/icons-material/DatasetOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { getReviewSummary } from '../model/reviewSummary';
import type { DataSourceKind, ReviewField } from '../model/types';
import { useDataSources, useReviewRun, useVerificationReport } from '../hooks/usePiiReview';
import { SectionHeader, StateNotice } from '@/shared/ui';

type DpoStep = 'source' | 'scan' | 'review' | 'build' | 'report';

const actionLabel: Record<ReviewField['action'], string> = {
  DROP: 'Bỏ trường',
  MASK: 'Che toàn bộ',
  HMAC: 'Tạo mã liên kết',
  KEEP: 'Giữ trường đã duyệt',
};

const classificationLabel: Record<ReviewField['classification'], string> = {
  PERSONAL_BASIC: 'Cá nhân cơ bản',
  PERSONAL_SENSITIVE: 'Cá nhân nhạy cảm',
  NON_PERSONAL: 'Không cá nhân',
  UNKNOWN: 'Chưa rõ',
};

const emptyFields: ReviewField[] = [];

export function DpoReviewExperience(): JSX.Element {
  const [sourceId, setSourceId] = useState<DataSourceKind>('postgresql');
  const [step, setStep] = useState<DpoStep>('source');
  const [selectedFieldId, setSelectedFieldId] = useState('customer-id');
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [revoked, setRevoked] = useState(false);

  const sourcesQuery = useDataSources();
  const runQuery = useReviewRun(sourceId);
  const reportQuery = useVerificationReport();
  const run = runQuery.data;
  const report = reportQuery.data;
  const fields = run?.fields ?? emptyFields;
  const summary = useMemo(() => getReviewSummary(fields), [fields]);
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0];

  const startScan = (): void => {
    setStep('scan');
    window.setTimeout(() => {
      setStep('review');
    }, 700);
  };

  const startBuild = (): void => {
    setBuildDialogOpen(false);
    setStep('build');
    window.setTimeout(() => {
      setStep('report');
    }, 800);
  };

  return (
    <Stack spacing={4}>
      <SectionHeader
        eyebrow="DPO workspace"
        title="Rà soát và phát hành snapshot đã bảo vệ"
        description="Luồng demo bám PRD: chọn nguồn, quét profile đã lọc, duyệt từng trường, tạo snapshot, hậu kiểm rồi phát hành cho Analyst. UI không hiển thị giá trị nguồn thô."
      />

      <WorkflowRail step={step} published={published} />

      {step === 'source' ? (
        <SourceStep
          sourceId={sourceId}
          onSourceChange={setSourceId}
          onStartScan={startScan}
          isLoading={sourcesQuery.isLoading}
          isError={sourcesQuery.isError}
          onRetry={() => {
            void sourcesQuery.refetch();
          }}
          sources={sourcesQuery.data ?? []}
        />
      ) : null}

      {step === 'scan' ? <ProcessingStep kind="scan" sourceName={run?.sourceName ?? 'Nguồn demo'} /> : null}

      {step === 'review' ? (
        <ReviewStep
          fields={fields}
          summary={summary}
          selectedField={selectedField}
          onSelectField={setSelectedFieldId}
          onOpenBuildDialog={() => setBuildDialogOpen(true)}
          isLoading={runQuery.isLoading}
          isError={runQuery.isError}
          onRetry={() => {
            void runQuery.refetch();
          }}
        />
      ) : null}

      {step === 'build' ? <ProcessingStep kind="build" sourceName={run?.sourceName ?? 'Nguồn demo'} /> : null}

      {step === 'report' ? (
        report ? (
          <ReportStep
            report={{ ...report, status: revoked ? 'REVOKED' : published ? 'PUBLISHED' : report.status }}
            onPublish={() => setPublishDialogOpen(true)}
            onRevoke={() => setRevokeDialogOpen(true)}
            onNewRun={() => {
              setPublished(false);
              setRevoked(false);
              setStep('source');
            }}
          />
        ) : reportQuery.isError ? (
          <StateNotice
            kind="error"
            title="Không tải được verifier report"
            description="Không thể phát hành khi báo cáo hậu kiểm chưa đọc được. Hãy thử tải lại hoặc tạo phiên mới."
            actionLabel="Tải lại report"
            onAction={() => {
              void reportQuery.refetch();
            }}
          />
        ) : (
          <LinearProgress aria-label="Đang tải báo cáo hậu kiểm" />
        )
      ) : null}

      <BuildConfirmDialog
        open={buildDialogOpen}
        onClose={() => setBuildDialogOpen(false)}
        onConfirm={startBuild}
        sourceName={run?.sourceName ?? 'Nguồn demo'}
        fixtureVersion={run?.fixtureVersion ?? 'fixture-demo'}
        summary={summary}
      />
      <PublishConfirmDialog
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        onConfirm={() => {
          setPublished(true);
          setRevoked(false);
          setPublishDialogOpen(false);
        }}
        datasetId={report?.datasetId ?? 'dataset-demo'}
      />
      <RevokeConfirmDialog
        open={revokeDialogOpen}
        onClose={() => setRevokeDialogOpen(false)}
        onConfirm={() => {
          setPublished(false);
          setRevoked(true);
          setRevokeDialogOpen(false);
        }}
        datasetId={report?.datasetId ?? 'dataset-demo'}
      />
    </Stack>
  );
}

type SourceStepProps = {
  sourceId: DataSourceKind;
  onSourceChange: (sourceId: DataSourceKind) => void;
  onStartScan: () => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  sources: Array<{
    id: DataSourceKind;
    name: string;
    engineLabel: string;
    scopeLabel: string;
    fieldCount: number;
    recordCount: number;
    unsupportedSummary: string;
    downstreamTask: string;
  }>;
};

function SourceStep({
  sourceId,
  onSourceChange,
  onStartScan,
  isLoading,
  isError,
  onRetry,
  sources,
}: SourceStepProps): JSX.Element {
  if (isError) {
    return (
      <StateNotice
        kind="error"
        title="Không tải được danh sách nguồn"
        description="Kiểm tra API backend hoặc mock boundary rồi thử lại. UI không hiển thị lỗi kỹ thuật có thể chứa secret."
        actionLabel="Thử lại"
        onAction={onRetry}
      />
    );
  }

  if (!isLoading && sources.length === 0) {
    return (
      <StateNotice
        kind="empty"
        title="Chưa có nguồn demo"
        description="DPO cần ít nhất một connector đã cấu hình read-only trước khi bắt đầu scan."
        actionLabel="Làm mới"
        onAction={onRetry}
      />
    );
  }

  return (
    <Grid container spacing={3}>
      {isLoading ? (
        <Grid item xs={12}>
          <LinearProgress aria-label="Đang tải nguồn dữ liệu" />
        </Grid>
      ) : null}
      {sources.map((source) => (
        <Grid item xs={12} md={6} key={source.id}>
          <Card
            variant={sourceId === source.id ? 'elevation' : 'outlined'}
            sx={{
              bgcolor: sourceId === source.id ? 'primary.50' : 'background.paper',
              borderColor: sourceId === source.id ? 'primary.main' : 'divider',
            }}
          >
            <CardActionArea onClick={() => onSourceChange(source.id)}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip label={source.engineLabel} color="primary" variant="outlined" />
                    <Chip label="Read-only verified" color="success" size="small" />
                  </Stack>
                  <Typography variant="h3">{source.name}</Typography>
                  <Typography color="text.secondary">{source.scopeLabel}</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Chip label={`${source.fieldCount} trường`} />
                    <Chip label={`${source.recordCount.toLocaleString('vi-VN')} bản ghi`} />
                  </Stack>
                  <Alert severity="info" icon={<SecurityOutlinedIcon />}>
                    {source.unsupportedSummary}
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    Tác vụ hậu kiểm: {source.downstreamTask}
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Box>
              <Typography variant="h4">Phạm vi P0</Typography>
              <Typography color="text.secondary">
                Không nhập connection string trên trình duyệt; backend giữ credential và khóa phiên
                fixture.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<PlayArrowOutlinedIcon />} onClick={onStartScan}>
              Bắt đầu quét
            </Button>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}

function ReviewStep({
  fields,
  summary,
  selectedField,
  onSelectField,
  onOpenBuildDialog,
  isLoading,
  isError,
  onRetry,
}: {
  fields: ReviewField[];
  summary: ReturnType<typeof getReviewSummary>;
  selectedField?: ReviewField;
  onSelectField: (fieldId: string) => void;
  onOpenBuildDialog: () => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}): JSX.Element {
  if (isError) {
    return (
      <StateNotice
        kind="error"
        title="Phiên scan chưa sẵn sàng"
        description="Không đọc được field profile cho run này. Quay lại kiểm tra nguồn hoặc thử tải lại."
        actionLabel="Tải lại"
        onAction={onRetry}
      />
    );
  }

  if (isLoading || !selectedField) {
    return <LinearProgress aria-label="Đang tải phiên review" />;
  }

  if (fields.length === 0) {
    return (
      <StateNotice
        kind="empty"
        title="Không có field profile"
        description="Nguồn rỗng hoặc phạm vi scan chưa trả trường nào; không cho build dataset rỗng."
      />
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="h3">Review trường và chính sách</Typography>
                <Typography color="text.secondary">
                  {summary.decided}/{summary.total} trường đã có quyết định, {summary.unknownDropped}{' '}
                  trường UNKNOWN sẽ bị loại.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`MASK ${summary.mask}`} color="primary" variant="outlined" />
                <Chip label={`DROP ${summary.drop}`} color="error" variant="outlined" />
                <Chip label={`HMAC ${summary.hmac}`} color="secondary" variant="outlined" />
                <Chip label={`KEEP ${summary.keep}`} variant="outlined" />
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label="Chưa duyệt" />
              <Chip label="Chưa rõ" />
              <Chip label="Bị loại" />
              <Chip label="Ảnh hưởng liên kết" />
            </Stack>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small" aria-label="Danh sách trường cần review">
                <TableHead>
                  <TableRow>
                    <TableCell>Đường dẫn</TableCell>
                    <TableCell>Kiểu</TableCell>
                    <TableCell>Phân loại</TableCell>
                    <TableCell>Độ phủ</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Review</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow
                      key={field.id}
                      hover
                      selected={selectedField.id === field.id}
                      onClick={() => onSelectField(field.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{field.path}</TableCell>
                      <TableCell>{field.dataType}</TableCell>
                      <TableCell>{classificationLabel[field.classification]}</TableCell>
                      <TableCell>{field.coverage.replace('_', ' ')}</TableCell>
                      <TableCell>{actionLabel[field.action]}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={field.reviewState === 'pending' ? 'Cần duyệt' : 'Đã duyệt'}
                          color={field.reviewState === 'pending' ? 'warning' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Alert severity="warning">
              UNKNOWN không tự động thành KEEP. Nếu profile chưa đủ căn cứ, DPO phải DROP hoặc
              chặn để xử lý ngoài demo.
            </Alert>
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} lg={4}>
        <FieldDetailPanel field={selectedField} onOpenBuildDialog={onOpenBuildDialog} />
      </Grid>
    </Grid>
  );
}

function FieldDetailPanel({
  field,
  onOpenBuildDialog,
}: {
  field: ReviewField;
  onOpenBuildDialog: () => void;
}): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, position: { lg: 'sticky' }, top: 104 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 800 }}>
            Chi tiết trường
          </Typography>
          <Typography variant="h3">{field.path}</Typography>
          <Typography color="text.secondary">{field.reason}</Typography>
        </Box>
        <Divider />
        <Stack spacing={1.25}>
          <InfoRow label="Pháp lý" value={`${field.taxonomyLabel} • ${field.legalBasis}`} />
          <InfoRow label="Nguồn đề xuất" value={`${field.suggestionSource.toUpperCase()} • ${field.coverage}`} />
          <InfoRow label="Profile đã lọc" value={field.filteredProfile} />
          <InfoRow label="Action" value={actionLabel[field.action]} />
          <InfoRow label="Ảnh hưởng" value={field.impact} />
        </Stack>
        <Alert severity={field.classification === 'UNKNOWN' ? 'error' : 'info'} icon={<ErrorOutlineIcon />}>
          Không có preview raw value, tooltip raw value hoặc payload lỗi chứa dữ liệu nguồn.
        </Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" fullWidth>
            Bác đề xuất
          </Button>
          <Button variant="outlined" fullWidth>
            Sửa
          </Button>
          <Button variant="contained" fullWidth>
            Chấp nhận
          </Button>
        </Stack>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DatasetOutlinedIcon />}
          onClick={onOpenBuildDialog}
        >
          Xác nhận tạo dataset
        </Button>
      </Stack>
    </Paper>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function ProcessingStep({ kind, sourceName }: { kind: 'scan' | 'build'; sourceName: string }): JSX.Element {
  const scanSteps = ['Đọc schema', 'Đọc phạm vi đã chọn', 'Chạy rule detector', 'AI gợi ý trường mơ hồ', 'Chờ DPO'];
  const buildSteps = ['Áp dụng policy', 'Ghi staging riêng', 'Kiểm tra output', 'Chạy downstream', 'Đối chiếu báo cáo'];
  const steps = kind === 'scan' ? scanSteps : buildSteps;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3">
            {kind === 'scan' ? 'Đang quét profile an toàn' : 'Đang tạo và hậu kiểm snapshot'}
          </Typography>
          <Typography color="text.secondary">
            Nguồn: {sourceName}. Không hiển thị mẫu dữ liệu gốc trong lúc xử lý.
          </Typography>
        </Box>
        <LinearProgress aria-label="Đang xử lý phiên dữ liệu" />
        <List>
          {steps.map((label, index) => (
            <ListItem key={label} disablePadding sx={{ py: 0.75 }}>
              <ListItemIcon>
                <CheckCircleOutlineIcon color={index < 3 ? 'success' : 'disabled'} />
              </ListItemIcon>
              <ListItemText primary={label} secondary={index < 3 ? 'Hoàn tất' : 'Đang chờ'} />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Paper>
  );
}

function ReportStep({
  report,
  onPublish,
  onRevoke,
  onNewRun,
}: {
  report: NonNullable<ReturnType<typeof useVerificationReport>['data']>;
  onPublish: () => void;
  onRevoke: () => void;
  onNewRun: () => void;
}): JSX.Element {
  const isPublished = report.status === 'PUBLISHED';
  const isRevoked = report.status === 'REVOKED';

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
          <Stack spacing={2}>
            <Chip
              icon={<PublishedWithChangesOutlinedIcon />}
              label={report.status}
              color={isRevoked ? 'error' : isPublished ? 'success' : 'primary'}
              sx={{ alignSelf: 'flex-start' }}
            />
            <Typography variant="h3">
              {isRevoked ? 'Dataset đã thu hồi quyền đọc' : 'Đạt các kiểm tra đã khai báo trên fixture này'}
            </Typography>
            <Typography color="text.secondary">
              Dataset {report.datasetId} từ {report.sourceName}, policy {report.policyVersion}.
            </Typography>
            <Alert severity="info">
              Báo cáo không chứa raw value hoặc sample PII; UNKNOWN đã DROP vẫn được ghi nhận là
              chưa phân loại.
            </Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={onNewRun}>
                Tạo phiên mới
              </Button>
              <Button
                variant="contained"
                disabled={isPublished || isRevoked}
                onClick={onPublish}
              >
                {isPublished ? 'Đã phát hành' : isRevoked ? 'Đã thu hồi' : 'Phát hành'}
              </Button>
              {isPublished ? (
                <Button variant="outlined" color="error" onClick={onRevoke}>
                  Thu hồi
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h4">Verifier và downstream</Typography>
            <Grid container spacing={2}>
              {report.verifierChecks.map((check) => (
                <Grid item xs={12} sm={6} key={check.label}>
                  <Alert severity={check.result === 'passed' ? 'success' : 'warning'}>
                    <Typography variant="subtitle2">{check.label}</Typography>
                    {check.detail}
                  </Alert>
                </Grid>
              ))}
            </Grid>
            <TableContainer>
              <Table size="small" aria-label="Kết quả downstream">
                <TableHead>
                  <TableRow>
                    <TableCell>Chỉ số</TableCell>
                    <TableCell>Baseline</TableCell>
                    <TableCell>Snapshot</TableCell>
                    <TableCell>Sai khác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.downstreamMetrics.map((metric) => (
                    <TableRow key={metric.label}>
                      <TableCell>{metric.label}</TableCell>
                      <TableCell>{metric.before}</TableCell>
                      <TableCell>{metric.after}</TableCell>
                      <TableCell>{metric.delta}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}

function WorkflowRail({ step, published }: { step: DpoStep; published: boolean }): JSX.Element {
  const items: Array<{ id: DpoStep; label: string; icon: JSX.Element }> = [
    { id: 'source', label: 'Nguồn', icon: <DatasetOutlinedIcon /> },
    { id: 'scan', label: 'Quét', icon: <FactCheckOutlinedIcon /> },
    { id: 'review', label: 'Review', icon: <SecurityOutlinedIcon /> },
    { id: 'build', label: 'Build', icon: <DatasetOutlinedIcon /> },
    { id: 'report', label: published ? 'Published' : 'Report', icon: <PublishedWithChangesOutlinedIcon /> },
  ];

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap aria-label="Trạng thái quy trình">
      {items.map((item) => (
        <Chip
          key={item.id}
          icon={item.icon}
          label={item.label}
          color={step === item.id ? 'primary' : 'default'}
          variant={step === item.id ? 'filled' : 'outlined'}
        />
      ))}
    </Stack>
  );
}

function BuildConfirmDialog({
  open,
  onClose,
  onConfirm,
  sourceName,
  fixtureVersion,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceName: string;
  fixtureVersion: string;
  summary: ReturnType<typeof getReviewSummary>;
}): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Xác nhận tạo dataset</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="warning">
            Tạo bản dữ liệu theo các quyết định đã duyệt. Bản này chỉ được chia sẻ sau khi kiểm
            tra đạt và bạn xác nhận phát hành.
          </Alert>
          <InfoRow label="Nguồn và phiên dữ liệu" value={`${sourceName} • ${fixtureVersion}`} />
          <InfoRow
            label="Policy output"
            value={`MASK ${summary.mask}, DROP ${summary.drop}, HMAC ${summary.hmac}, KEEP ${summary.keep}`}
          />
          <InfoRow label="UNKNOWN bị loại" value={`${summary.unknownDropped} trường`} />
          <TextField
            label="Lý do tạo snapshot"
            defaultValue="Duyệt phát hành dataset phân tích theo fixture DATA-06."
            multiline
            minRows={2}
            helperText="Lý do được ghi vào audit, không chứa dữ liệu nguồn."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={onConfirm}>
          Xác nhận tạo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PublishConfirmDialog({
  open,
  onClose,
  onConfirm,
  datasetId,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  datasetId: string;
}): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Xác nhận phát hành</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">
            Analyst chỉ đọc snapshot PUBLISHED qua API ứng dụng và chỉ chạy tác vụ mẫu đã được
            kiểm tra.
          </Alert>
          <InfoRow label="Dataset" value={datasetId} />
          <InfoRow label="Vai trò được đọc" value="Analyst demo account" />
          <InfoRow label="Giới hạn" value="Không có SQL editor, không download nguồn, không sửa policy." />
          <Select defaultValue="publish" label="Quyết định">
            <MenuItem value="publish">Phát hành cho Analyst</MenuItem>
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" color="success" onClick={onConfirm}>
          Phát hành cho Analyst
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RevokeConfirmDialog({
  open,
  onClose,
  onConfirm,
  datasetId,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  datasetId: string;
}): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Xác nhận thu hồi</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="warning">
            Thu hồi sẽ ngừng quyền đọc dataset qua ứng dụng cho Analyst. Thao tác này không xóa
            nguồn và không đảm bảo thu hồi các bản sao đã tồn tại ngoài hệ thống.
          </Alert>
          <InfoRow label="Dataset" value={datasetId} />
          <InfoRow label="Trạng thái sau thao tác" value="REVOKED" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Thu hồi dataset
        </Button>
      </DialogActions>
    </Dialog>
  );
}
