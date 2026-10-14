import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  MiniMap,
  ReactFlow,
  getSmoothStepPath,
  useNodesState,
  useEdgesState,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dagre from 'dagre';
import type { SourceScope, SourceScopeItem } from '../api/realPiiReviewApi';

// ============================================================================
// CONSTANTS
// ============================================================================

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 32;
const MAX_VISIBLE_ROWS = 14;

// ============================================================================
// TYPES
// ============================================================================

interface TableField {
  name: string;
  data_type: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
}

interface Relationship {
  source: string;
  target: string;
  sourceField: string;
  targetField: string;
}

interface RelationshipEdgeData extends Record<string, unknown> {
  relationship: Relationship;
  active: boolean;
}

interface TableNodeData extends Record<string, unknown> {
  table: SourceScopeItem;
  selected: boolean;
  highlightedFields: Set<string>;
  onFieldHover: (fieldKey: string | null) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeDataType(dataType: string): string {
  return dataType
    .replace(/character varying/gi, 'varchar')
    .replace(/timestamp without time zone/gi, 'timestamp')
    .replace(/timestamp with time zone/gi, 'timestamptz')
    .replace(/double precision/gi, 'float8')
    .replace(/integer/gi, 'int');
}

function calculateNodeHeight(fieldCount: number): number {
  return HEADER_HEIGHT + Math.min(fieldCount, MAX_VISIBLE_ROWS) * ROW_HEIGHT;
}

function getLayoutedElements(
  nodes: Node<TableNodeData>[],
  edges: Edge<RelationshipEdgeData>[],
  direction: 'LR' | 'TB' = 'LR',
): { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 120, nodesep: 60 });

  nodes.forEach((node) => {
    const height = calculateNodeHeight(node.data.table.field_count);
    dagreGraph.setNode(node.id, { width: node.width ?? 280, height });
  });

  edges.forEach((edge) => {
    // Relationship direction is FK -> PK, but layout should read parent -> child.
    dagreGraph.setEdge(edge.target, edge.source);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const height = calculateNodeHeight(node.data.table.field_count);
    return {
      ...node,
      width: 280,
      height,
      position: {
        x: nodeWithPosition.x - 140,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ============================================================================
// CUSTOM NODE
// ============================================================================

function TableNode({ data }: { data: TableNodeData }) {
  const theme = useTheme();
  const { table, selected, highlightedFields, onFieldHover } = data;
  
  const nodeHeight = calculateNodeHeight(table.field_count);

  return (
    <div
      style={{
        width: 280,
        height: nodeHeight,
        position: 'relative',
      }}
    >
      {/* Render Handles ở node level với kích thước và vị trí rõ ràng */}
      {table.fields.map((field: TableField, index: number) => {
        const handleId = `${table.name}-${field.name}`;
        const yOffset = HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
        
        return (
          <div key={handleId}>
            <Handle
              type="source"
              position={Position.Left}
              id={`${handleId}-left`}
              style={{
                position: 'absolute',
                left: -4,
                top: yOffset,
                width: 10,
                height: 10,
                background: field.is_foreign_key ? theme.palette.info.main : theme.palette.grey[300],
                border: `2px solid ${theme.palette.background.paper}`,
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 10,
              }}
            />
            <Handle
              type="target"
              position={Position.Right}
              id={`${handleId}-right`}
              style={{
                position: 'absolute',
                right: -4,
                top: yOffset,
                width: 10,
                height: 10,
                background: field.is_primary_key ? theme.palette.warning.main : theme.palette.grey[300],
                border: `2px solid ${theme.palette.background.paper}`,
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 10,
              }}
            />
          </div>
        );
      })}

      {/* Card UI */}
      <Stack
        spacing={0}
        sx={{
          width: '100%',
          height: '100%',
          border: `2px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden',
          background: theme.palette.background.paper,
          boxShadow: selected ? theme.shadows[4] : theme.shadows[1],
          opacity: selected ? 1 : 0.75,
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.5,
            py: 1,
            height: HEADER_HEIGHT,
            minHeight: HEADER_HEIGHT,
            background: selected
              ? theme.palette.primary.main
              : alpha(theme.palette.primary.main, 0.08),
            color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} noWrap flex={1}>
            {table.name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {table.field_count} fields
          </Typography>
        </Stack>

        {/* Fields - FIX: explicit height để scroll hoạt động */}
        <Stack
          spacing={0}
          sx={{
            height: Math.min(table.field_count, MAX_VISIBLE_ROWS) * ROW_HEIGHT,
            maxHeight: Math.min(table.field_count, MAX_VISIBLE_ROWS) * ROW_HEIGHT,
            pointerEvents: "auto", // FIX Bug 2: Allow scroll inside React Flow
            overflowY: 'auto',
            overflowX: 'hidden',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.divider,
              borderRadius: 3,
            },
          }}
        >
          {table.fields.map((field: TableField, index: number) => {
            const fieldKey = `${table.name}-${field.name}`;
            const highlighted = highlightedFields?.has(fieldKey);
            return (
              <Stack
                key={field.name}
                direction="row"
                alignItems="center"
                spacing={1}
                onMouseEnter={() => onFieldHover?.(fieldKey)}
                onMouseLeave={() => onFieldHover?.(null)}
                sx={{
                  px: 1.5,
                  height: ROW_HEIGHT,
                  minHeight: ROW_HEIGHT,
                  borderBottom:
                    index < table.fields.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.05),
                  },
                  background: highlighted
                    ? alpha(theme.palette.primary.main, 0.14)
                    : 'transparent',
                  position: 'relative',
                }}
              >
                {/* Icon */}
                <Stack sx={{ minWidth: 20 }}>
                  {field.is_primary_key ? (
                    <KeyIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
                  ) : field.is_foreign_key ? (
                    <LinkIcon sx={{ fontSize: 14, color: theme.palette.info.main }} />
                  ) : null}
                </Stack>

                {/* Field name */}
                <Tooltip title={field.name} placement="top">
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontSize={12}
                    flex={1}
                    noWrap
                    sx={{
                      fontWeight: field.is_primary_key || field.is_foreign_key ? 600 : 400,
                      color:
                        field.is_primary_key || field.is_foreign_key
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                    }}
                  >
                    {field.name}
                  </Typography>
                </Tooltip>

                {/* Data type */}
                <Tooltip title={field.data_type} placement="top">
                  <Typography
                    variant="caption"
                    fontFamily="monospace"
                    fontSize={10}
                    sx={{
                      color: theme.palette.text.disabled,
                      minWidth: 70,
                      textAlign: 'right',
                    }}
                    noWrap
                  >
                    {normalizeDataType(field.data_type)}
                  </Typography>
                </Tooltip>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </div>
  );
}

// Hoist nodeTypes ra ngoài component để tránh remount
const nodeTypes = { table: TableNode } satisfies NodeTypes;

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps): JSX.Element {
  const theme = useTheme();
  const relData = data as unknown as RelationshipEdgeData | undefined;
  const relationship = relData?.relationship;
  const active = relData?.active ?? true;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });
  const stroke = active ? theme.palette.primary.main : theme.palette.grey[400];
  const title = relationship
    ? `${relationship.source}.${relationship.sourceField} -> ${relationship.target}.${relationship.targetField}`
    : id;

  const endpointBadge = (label: string, x: number, y: number, side: 'source' | 'target') => (
    <div
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${x + (side === 'source' ? -16 : 16)}px, ${y}px)`,
        pointerEvents: 'none',
        padding: '1px 6px',
        borderRadius: 999,
        background: theme.palette.background.paper,
        border: `1px solid ${stroke}`,
        color: stroke,
        fontSize: 11,
        fontWeight: 800,
        opacity: active ? 1 : 0.35,
        boxShadow: theme.shadows[1],
      }}
      title={title}
    >
      {label}
    </div>
  );

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke,
          strokeWidth: active ? 2.5 : 1.5,
          opacity: active ? 0.95 : 0.2,
        }}
      />
      <EdgeLabelRenderer>
        {endpointBadge('N', sourceX, sourceY, 'source')}
        {endpointBadge('1', targetX, targetY, 'target')}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'auto',
            padding: '3px 8px',
            borderRadius: 999,
            background: active ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.75),
            border: `1px solid ${active ? alpha(theme.palette.primary.main, 0.45) : theme.palette.divider}`,
            color: active ? theme.palette.text.primary : theme.palette.text.disabled,
            fontFamily: 'monospace',
            fontSize: 11,
            whiteSpace: 'nowrap',
            boxShadow: active ? theme.shadows[2] : 'none',
            opacity: active ? 1 : 0.2,
          }}
          title={title}
        >
          {relationship ? `${relationship.sourceField} -> ${relationship.targetField}` : id}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { relationship: RelationshipEdge } satisfies EdgeTypes;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SourceScopePickerDiagramProps {
  items: SourceScopeItem[];
  selectedNames: string[];
  /** Joins reported by the backend (declared FKs, logical keys, inferred Mongo references). */
  relationships: SourceScope['relationships'];
  onToggle: (name: string) => void;
  onSelectAll: () => void;
}

export function SourceScopePickerDiagram({
  items,
  selectedNames,
  relationships: scopeRelationships,
  onToggle,
  onSelectAll,
}: SourceScopePickerDiagramProps): JSX.Element {
  const theme = useTheme();
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<RelationshipEdgeData>>([]);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Tính relationships từ items, không phụ thuộc selection
  const relationships = useMemo(() => {
    const itemByName = new Map(items.map((item) => [item.name, item]));
    const hasField = (tableName: string, fieldName: string): boolean =>
      itemByName.get(tableName)?.fields.some((field) => field.name === fieldName) ?? false;

    return scopeRelationships
      .map<Relationship>((rel) => ({
        source: rel.source_table,
        target: rel.target_table,
        sourceField: rel.source_column,
        targetField: rel.target_column,
      }))
      .filter((rel) => (
        itemByName.has(rel.source) &&
        itemByName.has(rel.target) &&
        hasField(rel.source, rel.sourceField) &&
        hasField(rel.target, rel.targetField)
      ));
  }, [scopeRelationships, items]);

  const highlightedFieldKeys = useMemo(() => {
    const keys = new Set<string>();
    if (hoveredField) {
      keys.add(hoveredField);
      relationships.forEach((rel) => {
        const sourceKey = `${rel.source}-${rel.sourceField}`;
        const targetKey = `${rel.target}-${rel.targetField}`;
        if (hoveredField === sourceKey) keys.add(targetKey);
        if (hoveredField === targetKey) keys.add(sourceKey);
      });
    }
    if (hoveredEdgeId) {
      const rel = relationships.find(
        (item) => `${item.source}-${item.sourceField}-${item.target}-${item.targetField}` === hoveredEdgeId,
      );
      if (rel) {
        keys.add(`${rel.source}-${rel.sourceField}`);
        keys.add(`${rel.target}-${rel.targetField}`);
      }
    }
    return keys;
  }, [hoveredEdgeId, hoveredField, relationships]);

  // Effect 1: Tạo nodes/edges từ schema, KHÔNG phụ thuộc selectedSet
  // FIX Bug 3: Tách creation logic khỏi selection để tránh rebuild
  useEffect(() => {
    const initialNodes: Node<TableNodeData>[] = items.map((item, index) => ({
      id: item.name,
      type: 'table',
      position: { x: (index % 3) * 330, y: Math.floor(index / 3) * 250 },
      width: 280,
      height: calculateNodeHeight(item.field_count),
      data: {
        table: item,
        selected: false, // Để Effect 2 xử lý selection
        highlightedFields: new Set<string>(),
        onFieldHover: setHoveredField,
      },
    }));

    const initialEdges: Edge<RelationshipEdgeData>[] = relationships.map((rel) => {
      return {
        id: `${rel.source}-${rel.sourceField}-${rel.target}-${rel.targetField}`,
        source: rel.source,
        target: rel.target,
        sourceHandle: `${rel.source}-${rel.sourceField}-left`,
        targetHandle: `${rel.target}-${rel.targetField}-right`,
        type: 'relationship',
        animated: false,
        data: {
          relationship: rel,
          active: true,
        } satisfies RelationshipEdgeData,
        style: {
          stroke: theme.palette.primary.main,
          strokeWidth: 2,
          opacity: 0.85,
        },
      };
    });

    setNodes(initialNodes);

    // FIX Bug 1: Delay setting edges AFTER nodes mount
    // Đảm bảo TableNode đã render handles trước khi React Flow tìm chúng
    setTimeout(() => {
      setEdges(initialEdges);
      
      // Auto-layout sau khi edges set
      const layouted = getLayoutedElements(initialNodes, initialEdges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    }, 200); // Tăng lên 200ms
  }, [items, relationships, theme, setNodes, setEdges]); // BỎ selectedSet khỏi deps

  // Effect 2: Chỉ update selection state, KHÔNG rebuild nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: selectedSet.has(node.id),
          highlightedFields: highlightedFieldKeys,
        },
      })),
    );

    setEdges((eds) =>
      eds.map((edge) => {
        if (!edge.data) return edge;
        const sourceSelected = selectedSet.has(edge.source);
        const targetSelected = selectedSet.has(edge.target);
        const selected = sourceSelected && targetSelected;
        const relationship = edge.data?.relationship;
        const directlyHovered =
          hoveredEdgeId === edge.id ||
          (hoveredField !== null &&
            relationship !== undefined &&
            (hoveredField === `${edge.source}-${relationship.sourceField}` ||
              hoveredField === `${edge.target}-${relationship.targetField}`));
        const hasFocus = hoveredEdgeId !== null || hoveredField !== null;
        const active = hasFocus ? directlyHovered : selected;
        return {
          ...edge,
          data: {
            ...edge.data,
            active,
          },
          style: {
            ...edge.style,
            stroke: active ? theme.palette.primary.main : theme.palette.divider,
            strokeWidth: active ? 2.5 : 1.5,
            opacity: active ? 0.95 : 0.2,
          },
        };
      }),
    );
  }, [highlightedFieldKeys, hoveredEdgeId, hoveredField, selectedSet, theme, setNodes, setEdges]);

  // Auto layout callback
  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(nodes, edges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
      {/* Left sidebar */}
      <Paper variant="outlined" sx={{ width: { xs: '100%', lg: 320 }, p: 1.5 }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={800}>
              Chọn bảng
            </Typography>
            <Chip
              label={`${selectedNames.length}/${items.length}`}
              size="small"
              color={selectedNames.length === items.length ? 'primary' : 'default'}
              onClick={onSelectAll}
            />
          </Stack>
          <Divider />
          <Stack spacing={0.5} sx={{ maxHeight: { xs: 220, lg: 520 }, overflowY: 'auto' }}>
            {items.map((item) => (
              <FormControlLabel
                key={item.name}
                control={
                  <Checkbox
                    checked={selectedSet.has(item.name)}
                    onChange={() => onToggle(item.name)}
                    size="small"
                  />
                }
                label={
                  <Stack spacing={0.15}>
                    <Typography variant="body2" fontFamily="monospace">
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.kind} • {item.field_count} fields
                    </Typography>
                  </Stack>
                }
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Diagram canvas */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          height: { xs: 500, md: 700 },
          minWidth: 0,
          overflow: 'hidden',
          bgcolor: 'background.default',
          position: 'relative',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          attributionPosition="bottom-left"
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background gap={16} size={1} color={theme.palette.divider} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) =>
              selectedSet.has(node.id) ? theme.palette.primary.main : theme.palette.grey[400]
            }
            maskColor={alpha(theme.palette.background.paper, 0.6)}
            style={{ background: theme.palette.background.paper }}
          />
        </ReactFlow>

        {/* Auto-layout button */}
        <Stack
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
          }}
        >
          <Chip
            label="Auto Layout"
            size="small"
            onClick={onLayout}
            sx={{
              bgcolor: theme.palette.background.paper,
              boxShadow: theme.shadows[2],
              '&:hover': { boxShadow: theme.shadows[4] },
            }}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
