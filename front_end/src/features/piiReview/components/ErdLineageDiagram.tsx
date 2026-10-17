import { memo, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LinkIcon from '@mui/icons-material/Link';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import TableChartIcon from '@mui/icons-material/TableChart';
import SecurityIcon from '@mui/icons-material/Security';
import SchemaIcon from '@mui/icons-material/Schema';

import {
  Background,
  BackgroundVariant,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { DatasetPreview } from '../api/realPiiReviewApi';

// ============================================================================
// PGADMIN / POSTGRESQL ERD DOMAIN COLOR SCHEMES (White Canvas Theme)
// ============================================================================
const TABLE_COLORS: Record<string, { headerBg: string; border: string; badgeBg: string }> = {
  customers: { headerBg: '#1E40AF', border: '#93C5FD', badgeBg: '#DBEAFE' },
  customer_records: { headerBg: '#1E40AF', border: '#93C5FD', badgeBg: '#DBEAFE' },
  person: { headerBg: '#1E40AF', border: '#93C5FD', badgeBg: '#DBEAFE' },
  orders: { headerBg: '#0284C7', border: '#7DD3FC', badgeBg: '#E0F2FE' },
  order_details: { headerBg: '#0D9488', border: '#5EEAD4', badgeBg: '#CCFBF1' },
  employees: { headerBg: '#059669', border: '#6EE7B7', badgeBg: '#D1FAE5' },
  employee_territories: { headerBg: '#10B981', border: '#A7F3D0', badgeBg: '#ECFDF5' },
  products: { headerBg: '#D97706', border: '#FDE68A', badgeBg: '#FEF3C7' },
  suppliers: { headerBg: '#7C3AED', border: '#C4B5FD', badgeBg: '#EDE9FE' },
  kyc_documents: { headerBg: '#DC2626', border: '#FCA5A5', badgeBg: '#FEE2E2' },
  support_tickets: { headerBg: '#C026D3', border: '#F0ABFC', badgeBg: '#FAE8FF' },
  territories: { headerBg: '#475569', border: '#CBD5E1', badgeBg: '#F1F5F9' },
  region: { headerBg: '#64748B', border: '#E2E8F0', badgeBg: '#F8FAFC' },
  piiguard_vault: { headerBg: '#1B51A4', border: '#93C5FD', badgeBg: '#EFF6FF' },
};

function getTableColor(tableName: string) {
  const normalized = tableName.toLowerCase();
  for (const [key, color] of Object.entries(TABLE_COLORS)) {
    if (normalized.includes(key)) return color;
  }
  return { headerBg: '#334155', border: '#CBD5E1', badgeBg: '#F1F5F9' };
}

// ============================================================================
// COLUMN DEFINITION FOR CUSTOM TABLE NODE
// ============================================================================
export interface TableColumnDef {
  name: string;
  data_type: string;
  transform: 'MASK' | 'REDACT' | 'HMAC' | 'KEEP' | 'DROPPED';
  isPk?: boolean;
  isFk?: boolean;
}

export interface TableNodeData extends Record<string, unknown> {
  tableName: string;
  columns: TableColumnDef[];
}

export type TableNodeType = Node<TableNodeData, 'tableNode'>;

// ============================================================================
// POSTGRESQL / PGADMIN STYLE TABLE NODE (WHITE BACKGROUND)
// ============================================================================
const TableNode = memo(({ data }: NodeProps<TableNodeType>) => {
  const { tableName, columns } = data;
  const theme = getTableColor(tableName);

  return (
    <Card
      sx={{
        width: 300,
        bgcolor: '#FFFFFF',
        color: '#0F172A',
        borderRadius: '8px',
        border: '1.5px solid #CBD5E1',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)',
        overflow: 'visible', // Ensure handles at edges are never clipped
        position: 'relative',
        fontFamily: "'Roboto Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
        fontSize: '0.75rem',
        '&:hover': {
          borderColor: theme.headerBg,
          boxShadow: '0 8px 24px rgba(30, 64, 175, 0.16)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {/* Table-Level Fallback Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="table-target"
        style={{ top: 20, left: -6, width: 8, height: 8, opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="table-source-left"
        style={{ top: 20, left: -6, width: 8, height: 8, opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="table-source"
        style={{ top: 20, right: -6, width: 8, height: 8, opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="table-target-right"
        style={{ top: 20, right: -6, width: 8, height: 8, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Postgres Table Header */}
      <Box
        sx={{
          bgcolor: theme.headerBg,
          color: '#FFFFFF',
          px: 1.5,
          py: 0.9,
          borderTopLeftRadius: '7px',
          borderTopRightRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <TableChartIcon sx={{ fontSize: 16, opacity: 0.95 }} />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#FFFFFF',
              fontFamily: 'inherit',
            }}
          >
            public.{tableName}
          </Typography>
        </Stack>
        <Chip
          label={`${columns.length} cols`}
          size="small"
          sx={{
            height: 18,
            fontSize: '0.625rem',
            bgcolor: 'rgba(255, 255, 255, 0.22)',
            color: '#FFFFFF',
            fontWeight: 700,
            borderRadius: '4px',
          }}
        />
      </Box>

      {/* Column Rows (Postgres ERD style list) */}
      <Box
        sx={{
          maxHeight: 320,
          overflowY: 'auto',
          overflowX: 'visible',
          bgcolor: '#FFFFFF',
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: '4px' },
        }}
      >
        {columns.map((col, idx) => {
          const isHmac = col.transform === 'HMAC';
          const isMasked = col.transform === 'MASK';
          const isDropped = col.transform === 'DROPPED';
          const cleanName = col.name.replace(/_(hmac|masked|raw|hash)$/i, '');

          return (
            <Box
              key={col.name}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.25,
                py: 0.55,
                bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                borderBottom: '1px solid #F1F5F9',
                '&:hover': { bgcolor: '#EFF6FF' },
                transition: 'background-color 0.12s',
              }}
            >
              {/* Left Handles (Target standard, Source fallback) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-target`}
                style={{
                  top: '50%',
                  left: -5,
                  width: 8,
                  height: 8,
                  background: isHmac ? '#0284C7' : '#2563EB',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 0 1px #94A3B8',
                  zIndex: 20,
                }}
              />
              <Handle
                type="source"
                position={Position.Left}
                id={`${col.name}-source-left`}
                style={{
                  top: '50%',
                  left: -5,
                  width: 8,
                  height: 8,
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: 19,
                }}
              />
              {cleanName !== col.name && (
                <>
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`${cleanName}-target`}
                    style={{
                      top: '50%',
                      left: -5,
                      width: 8,
                      height: 8,
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: 18,
                    }}
                  />
                  <Handle
                    type="source"
                    position={Position.Left}
                    id={`${cleanName}-source-left`}
                    style={{
                      top: '50%',
                      left: -5,
                      width: 8,
                      height: 8,
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: 17,
                    }}
                  />
                </>
              )}

              {/* Right Handles (Source standard, Target fallback) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-source`}
                style={{
                  top: '50%',
                  right: -5,
                  width: 8,
                  height: 8,
                  background: isHmac ? '#0284C7' : '#2563EB',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 0 1px #94A3B8',
                  zIndex: 20,
                }}
              />
              <Handle
                type="target"
                position={Position.Right}
                id={`${col.name}-target-right`}
                style={{
                  top: '50%',
                  right: -5,
                  width: 8,
                  height: 8,
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: 19,
                }}
              />
              {cleanName !== col.name && (
                <>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${cleanName}-source`}
                    style={{
                      top: '50%',
                      right: -5,
                      width: 8,
                      height: 8,
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: 18,
                    }}
                  />
                  <Handle
                    type="target"
                    position={Position.Right}
                    id={`${cleanName}-target-right`}
                    style={{
                      top: '50%',
                      right: -5,
                      width: 8,
                      height: 8,
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: 17,
                    }}
                  />
                </>
              )}

              {/* Left Column Section: Key Icon + Column Name */}
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, pr: 1 }}>
                {col.isPk ? (
                  <Tooltip title="Primary Key (PK)">
                    <VpnKeyIcon sx={{ fontSize: 13, color: '#D97706', flexShrink: 0 }} />
                  </Tooltip>
                ) : col.isFk ? (
                  <Tooltip title="Foreign Key (FK) / Join Column">
                    <LinkIcon sx={{ fontSize: 13, color: '#2563EB', flexShrink: 0 }} />
                  </Tooltip>
                ) : (
                  <Box sx={{ width: 13 }} />
                )}

                <Typography
                  sx={{
                    fontFamily: 'inherit',
                    fontSize: '0.725rem',
                    fontWeight: col.isPk || col.isFk ? 700 : 500,
                    color: col.isPk ? '#B45309' : col.isFk ? '#1D4ED8' : '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {col.name}
                </Typography>
              </Stack>

              {/* Right Column Section: PII Security Tag + Data Type */}
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                {isHmac && (
                  <Chip
                    label="HMAC"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      bgcolor: '#E0F2FE',
                      color: '#0284C7',
                      border: '1px solid #BAE6FD',
                      borderRadius: '3px',
                    }}
                  />
                )}
                {isMasked && (
                  <Chip
                    label="MASK"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      bgcolor: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FDE68A',
                      borderRadius: '3px',
                    }}
                  />
                )}
                {isDropped && (
                  <Chip
                    label="DROP"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      bgcolor: '#FEE2E2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      borderRadius: '3px',
                    }}
                  />
                )}

                <Typography
                  sx={{
                    fontFamily: 'inherit',
                    fontSize: '0.66rem',
                    color: '#64748B',
                    minWidth: 46,
                    textAlign: 'right',
                    fontWeight: 500,
                  }}
                >
                  {col.data_type}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Box>

      {/* Card Footer: Security Guarantee Bar */}
      <Box
        sx={{
          bgcolor: '#F8FAFC',
          px: 1.25,
          py: 0.55,
          borderBottomLeftRadius: '7px',
          borderBottomRightRadius: '7px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography sx={{ fontSize: '0.625rem', color: '#64748B', fontWeight: 600 }}>
          Lược đồ quan hệ
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <SecurityIcon sx={{ fontSize: 13, color: '#16A34A' }} />
          <Typography sx={{ fontSize: '0.625rem', color: '#16A34A', fontWeight: 700 }}>
            Protected
          </Typography>
        </Stack>
      </Box>
    </Card>
  );
});

TableNode.displayName = 'TableNode';

const nodeTypes = {
  tableNode: TableNode,
};

// ============================================================================
// INNER CANVAS (POSTGRESQL WHITE THEME)
// ============================================================================
function ErdFlowCanvas({
  preview,
  isFullscreen,
  onToggleFullscreen,
}: {
  preview: DatasetPreview;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // 1. Group columns by table (source_path) and detect PK / FK
  const tablesMap = useMemo(() => {
    const map = new Map<string, TableColumnDef[]>();

    preview.columns.forEach((col) => {
      const tbl = col.source_path || preview.dataset_name || 'dataset';
      const existing = map.get(tbl) ?? [];
      const cleanName = col.name.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '');

      const isPk =
        cleanName === 'id' ||
        cleanName === '_id' ||
        cleanName === `${tbl}_id`.toLowerCase() ||
        (cleanName === 'customer_id' && tbl === 'customers') ||
        (cleanName === 'order_id' && tbl === 'orders') ||
        (cleanName === 'employee_id' && tbl === 'employees') ||
        (cleanName === 'product_id' && tbl === 'products') ||
        (cleanName === 'supplier_id' && tbl === 'suppliers') ||
        (cleanName === 'category_id' && tbl === 'categories') ||
        (cleanName === 'territory_id' && tbl === 'territories') ||
        (cleanName === 'region_id' && tbl === 'region') ||
        (cleanName === 'state_id' && tbl === 'us_states') ||
        (cleanName === 'doc_id' && tbl === 'kyc_documents') ||
        (cleanName === 'ticket_id' && tbl === 'support_tickets');

      const isFk =
        !isPk &&
        (preview.relationships.some((r) => {
          const rSrcClean = r.source_column.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '');
          const rTgtClean = r.target_column.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '');
          return (
            (r.source_table === tbl && (r.source_column === col.name || rSrcClean === cleanName)) ||
            (r.target_table === tbl && (r.target_column === col.name || rTgtClean === cleanName))
          );
        }) || cleanName.endsWith('_id') || cleanName.endsWith('_id_hmac'));

      existing.push({
        name: col.name,
        data_type: col.data_type,
        transform: col.transform,
        isPk,
        isFk,
      });

      map.set(tbl, existing);
    });

    // Handle extra tables referenced in relationships
    preview.relationships.forEach((rel) => {
      if (!map.has(rel.source_table)) {
        map.set(rel.source_table, [
          { name: rel.source_column, data_type: 'uuid', transform: 'HMAC', isFk: true },
        ]);
      }
      if (!map.has(rel.target_table)) {
        map.set(rel.target_table, [
          { name: rel.target_column, data_type: 'uuid', transform: 'HMAC', isPk: true },
        ]);
      }
    });

    return map;
  }, [preview]);

  // 2. 4-Tier Balanced Left-to-Right Relational Layout (pgAdmin ERD style)
  const nodes: TableNodeType[] = useMemo(() => {
    const tableNames = Array.from(tablesMap.keys());

    // Define 4 tiers for clear relational layout
    const tier0 = ['customers', 'employees', 'suppliers', 'categories', 'region'];
    const tier1 = ['shippers', 'territories', 'us_states'];
    const tier2 = ['orders', 'products'];
    const tier3 = ['order_details', 'employee_territories', 'support_tickets', 'kyc_documents'];

    const getTier = (name: string): 0 | 1 | 2 | 3 => {
      const lower = name.toLowerCase();
      if (tier0.some((t) => lower.includes(t))) return 0;
      if (tier3.some((t) => lower.includes(t))) return 3;
      if (tier2.some((t) => lower.includes(t))) return 2;
      if (tier1.some((t) => lower.includes(t))) return 1;
      return 1;
    };

    const tierBuckets: Record<0 | 1 | 2 | 3, string[]> = { 0: [], 1: [], 2: [], 3: [] };
    tableNames.forEach((t) => {
      const tier = getTier(t);
      tierBuckets[tier].push(t);
    });

    const resultNodes: TableNodeType[] = [];
    const TIER_X: Record<0 | 1 | 2 | 3, number> = { 0: 40, 1: 440, 2: 840, 3: 1240 };

    ([0, 1, 2, 3] as const).forEach((tierIndex) => {
      const tablesInTier = tierBuckets[tierIndex] ?? [];
      tablesInTier.forEach((tableName, rowIndex) => {
        resultNodes.push({
          id: `table-${tableName}`,
          type: 'tableNode',
          position: {
            x: TIER_X[tierIndex],
            y: rowIndex * 340 + 40,
          },
          data: {
            tableName,
            columns: tablesMap.get(tableName) ?? [],
          },
        });
      });
    });

    return resultNodes;
  }, [tablesMap]);

  // 3. PostgreSQL Style High-Contrast Orthogonal Edges with Smart Handle Matching
  const edges: Edge[] = useMemo(() => {
    // 3a. Gather relationships from preview, or infer if empty
    let rels = preview.relationships;
    if (!rels || rels.length === 0) {
      rels = [];
      const tableNames = Array.from(tablesMap.keys());
      tableNames.forEach((tblA) => {
        const colsA = tablesMap.get(tblA) ?? [];
        colsA.forEach((colA) => {
          const cleanA = colA.name.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '');
          if (cleanA.endsWith('_id') || cleanA === 'customer_id') {
            const targetEntity = cleanA.endsWith('_id') ? cleanA.slice(0, -3) : cleanA;
            tableNames.forEach((tblB) => {
              if (tblA !== tblB && (tblB === targetEntity || tblB.startsWith(targetEntity) || targetEntity.startsWith(tblB))) {
                const colsB = tablesMap.get(tblB) ?? [];
                const matchB = colsB.find((cb) => {
                  const cbClean = cb.name.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '');
                  return cbClean === cleanA || cbClean === 'id' || cbClean === '_id';
                });
                if (matchB) {
                  rels.push({
                    source_table: tblA,
                    source_column: colA.name,
                    target_table: tblB,
                    target_column: matchB.name,
                  });
                }
              }
            });
          }
        });
      });
    }

    // Node position lookup to decide left or right routing
    const nodePosMap = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      nodePosMap.set(n.id, n.position);
    });

    return rels.map((rel, index) => {
      const srcNodeId = `table-${rel.source_table}`;
      const tgtNodeId = `table-${rel.target_table}`;
      const srcPos = nodePosMap.get(srcNodeId) ?? { x: 0, y: 0 };
      const tgtPos = nodePosMap.get(tgtNodeId) ?? { x: 500, y: 0 };
      const isSrcLeftOfTgt = srcPos.x <= tgtPos.x;

      const srcCols = tablesMap.get(rel.source_table) ?? [];
      const tgtCols = tablesMap.get(rel.target_table) ?? [];

      const cleanSrc = rel.source_column.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '');
      const cleanTgt = rel.target_column.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '');

      const matchedSrc = srcCols.find(
        (c) =>
          c.name.toLowerCase() === rel.source_column.toLowerCase() ||
          c.name.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '') === cleanSrc,
      );
      const matchedTgt = tgtCols.find(
        (c) =>
          c.name.toLowerCase() === rel.target_column.toLowerCase() ||
          c.name.toLowerCase().replace(/_(hmac|masked|raw|hash)$/, '') === cleanTgt,
      );

      // Resolve handle IDs
      const srcColName = matchedSrc ? matchedSrc.name : rel.source_column;
      const tgtColName = matchedTgt ? matchedTgt.name : rel.target_column;

      const sourceHandle = isSrcLeftOfTgt ? `${srcColName}-source` : `${srcColName}-source-left`;
      const targetHandle = isSrcLeftOfTgt ? `${tgtColName}-target` : `${tgtColName}-target-right`;

      return {
        id: `edge-${rel.source_table}-${rel.source_column}-${rel.target_table}-${rel.target_column}-${index}`,
        source: srcNodeId,
        target: tgtNodeId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#1E40AF',
          strokeWidth: 2.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#1E40AF',
          width: 14,
          height: 14,
        },
        label: `${rel.source_column} ➔ ${rel.target_column}`,
        labelStyle: {
          fill: '#0F172A',
          fontWeight: 700,
          fontSize: 9.5,
          fontFamily: "'Roboto Mono', monospace",
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          fillOpacity: 0.95,
          stroke: '#93C5FD',
          strokeWidth: 1.5,
          rx: 4,
          ry: 4,
        },
        labelBgPadding: [6, 3] as [number, number],
      };
    });
  }, [preview.relationships, tablesMap, nodes]);

  return (
    <Box
      sx={{
        position: 'relative',
        height: isFullscreen ? 'calc(100vh - 70px)' : 600,
        bgcolor: '#FFFFFF',
        borderRadius: isFullscreen ? 0 : '8px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Top Floating Controls Bar (Postgres White Theme) */}
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          left: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #CBD5E1',
          borderRadius: '6px',
          px: 1.75,
          py: 0.85,
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <SchemaIcon sx={{ fontSize: 18, color: '#1B51A4' }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>
            Sơ đồ quan hệ giữa các bảng
          </Typography>
        </Stack>
        <Box sx={{ width: 1, height: 16, bgcolor: '#CBD5E1' }} />

        {/* Legend */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <VpnKeyIcon sx={{ fontSize: 14, color: '#D97706' }} />
            <Typography sx={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
              Khoá chính (PK)
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <LinkIcon sx={{ fontSize: 14, color: '#2563EB' }} />
            <Typography sx={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
              Khoá ngoại (FK)
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#0284C7' }} />
            <Typography sx={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700 }}>
              Liên kết HMAC
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {/* Right Action Tools (White Theme) */}
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          right: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #CBD5E1',
          borderRadius: '6px',
          p: 0.5,
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Tooltip title="Phóng to">
          <IconButton size="small" onClick={() => void zoomIn()} sx={{ color: '#334155' }}>
            <ZoomInIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Thu nhỏ">
          <IconButton size="small" onClick={() => void zoomOut()} sx={{ color: '#334155' }}>
            <ZoomOutIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Căn giữa sơ đồ">
          <IconButton size="small" onClick={() => void fitView({ padding: 0.2, duration: 400 })} sx={{ color: '#334155' }}>
            <CenterFocusStrongIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Box sx={{ width: 1, height: 16, bgcolor: '#CBD5E1', mx: 0.5 }} />
        <Tooltip title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}>
          <IconButton size="small" onClick={onToggleFullscreen} sx={{ color: '#1B51A4' }}>
            {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 18 }} /> : <FullscreenIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ReactFlow Canvas with White Dot Grid */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#CBD5E1" />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as TableNodeData;
            return getTableColor(data.tableName).headerBg;
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
          }}
        />
      </ReactFlow>
    </Box>
  );
}

// ============================================================================
// MAIN EXPORT WITH PROVIDER
// ============================================================================
export function ErdLineageDiagram({ preview }: { preview: DatasetPreview }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <ReactFlowProvider>
      <ErdFlowCanvas
        preview={preview}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />
    </ReactFlowProvider>
  );
}
