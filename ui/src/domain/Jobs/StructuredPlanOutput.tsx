import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Card, Collapse, Empty, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { PlanChange, getPlanChangeActionColor, getPlanChangeActionLabel } from "./structuredPlan";

type Props = {
  changes: PlanChange[];
};

type ActionName = "create" | "update" | "replace" | "delete" | "read" | "unknown";

type DiffRow = {
  key: string;
  label: string;
  kind: "group" | "added" | "removed" | "changed" | "unknown" | "sensitive";
  before?: unknown;
  after?: unknown;
  children?: DiffRow[];
  hiddenCount?: number;
};

type CollectionEntry = {
  identity: string;
  value: unknown;
  unknown: unknown;
  beforeSensitive: unknown;
  afterSensitive: unknown;
};

type ActionSummary = Record<ActionName, number>;

const actionOrder: ActionName[] = ["create", "update", "replace", "delete", "read", "unknown"];

const actionMeta: Record<
  ActionName,
  {
    label: string;
    title: string;
    color: string;
    icon: ReactNode;
    accent: string;
    background: string;
  }
> = {
  create: {
    label: "create",
    title: "to create",
    color: "green",
    icon: <PlusOutlined />,
    accent: "#389e0d",
    background: "#f6ffed",
  },
  update: {
    label: "update",
    title: "to change",
    color: "blue",
    icon: <EditOutlined />,
    accent: "#1677ff",
    background: "#f0f5ff",
  },
  replace: {
    label: "replace",
    title: "to replace",
    color: "orange",
    icon: <SwapOutlined />,
    accent: "#d46b08",
    background: "#fff7e6",
  },
  delete: {
    label: "delete",
    title: "to destroy",
    color: "red",
    icon: <DeleteOutlined />,
    accent: "#cf1322",
    background: "#fff1f0",
  },
  read: {
    label: "read",
    title: "to read",
    color: "default",
    icon: <QuestionCircleOutlined />,
    accent: "#595959",
    background: "#fafafa",
  },
  unknown: {
    label: "unknown",
    title: "unknown",
    color: "default",
    icon: <QuestionCircleOutlined />,
    accent: "#595959",
    background: "#fafafa",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return false;
  }

  if (typeof value !== "object") {
    return false;
  }

  return true;
};

const isPrimitiveValue = (value: unknown) => {
  if (value === null) {
    return true;
  }

  if (value === undefined) {
    return true;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return true;
  }

  return false;
};

const isCollectionValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return true;
  }

  return isRecord(value);
};

const areValuesEqual = (left: unknown, right: unknown) => {
  if (left === right) {
    return true;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const getValuePreview = (value: unknown) => {
  if (value === undefined) {
    return "not set";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    if (value.length <= 48) {
      return `"${value}"`;
    }

    return `"${value.slice(0, 45)}..."`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    if (value.every((item) => isPrimitiveValue(item)) && JSON.stringify(value).length <= 48) {
      return JSON.stringify(value);
    }

    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return "{}";
    }

    return `${keys.length} attribute${keys.length === 1 ? "" : "s"}`;
  }

  return String(value);
};

const getDiffTone = (kind: DiffRow["kind"]) => {
  if (kind === "added") {
    return {
      textColor: "#135200",
      background: "#f6ffed",
      border: "#b7eb8f",
    };
  }

  if (kind === "removed") {
    return {
      textColor: "#820014",
      background: "#fff1f0",
      border: "#ffccc7",
    };
  }

  if (kind === "changed") {
    return {
      textColor: "#10239e",
      background: "#f0f5ff",
      border: "#adc6ff",
    };
  }

  if (kind === "sensitive") {
    return {
      textColor: "#531dab",
      background: "#f9f0ff",
      border: "#d3adf7",
    };
  }

  return {
    textColor: "#ad6800",
    background: "#fffbe6",
    border: "#ffe58f",
  };
};

const renderValueBadge = (
  value: unknown,
  kind: DiffRow["kind"],
  options?: { sensitive?: boolean; unknown?: boolean }
) => {
  const tone = getDiffTone(kind);
  let label = getValuePreview(value);

  if (options?.sensitive) {
    label = "sensitive value";
  }

  if (options?.unknown) {
    label = "known after apply";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "999px",
        fontFamily: "SFMono-Regular, Consolas, Monaco, monospace",
        fontSize: 12,
        color: tone.textColor,
        background: tone.background,
        border: `1px solid ${tone.border}`,
      }}
    >
      {label}
    </span>
  );
};

const countVisibleLeaves = (rows: DiffRow[]): number => {
  return rows.reduce((total, row) => {
    if (!row.children?.length) {
      return total + 1;
    }

    return total + countVisibleLeaves(row.children);
  }, 0);
};

const getCollectionItemLabel = (before: unknown, after: unknown, index: number) => {
  const baseLabel = `[${index}]`;
  const candidate = isRecord(after) ? after : isRecord(before) ? before : null;

  if (!candidate) {
    return baseLabel;
  }

  const identityKeys = ["name", "id", "key", "address", "resourceName", "resourceType"];

  for (const identityKey of identityKeys) {
    const rawValue = candidate[identityKey];

    if (typeof rawValue !== "string") {
      continue;
    }

    if (rawValue.trim().length === 0) {
      continue;
    }

    return `${baseLabel} ${rawValue}`;
  }

  return baseLabel;
};

const getCollectionIdentity = (value: unknown, index: number) => {
  if (!isRecord(value)) {
    return null;
  }

  const identityKeys = ["name", "id", "key", "address", "resourceName", "resourceType"];

  for (const identityKey of identityKeys) {
    const rawValue = value[identityKey];
    if (typeof rawValue !== "string") {
      continue;
    }

    if (rawValue.trim().length === 0) {
      continue;
    }

    return `${identityKey}:${rawValue}`;
  }

  return `index:${index}`;
};

const canMatchCollectionByIdentity = (values: unknown[]) => {
  const identities = values
    .map((value, index) => getCollectionIdentity(value, index))
    .filter((identity): identity is string => identity !== null);

  if (identities.length !== values.length) {
    return false;
  }

  return new Set(identities).size === identities.length;
};

const buildCollectionEntries = (
  values: unknown[],
  unknownValues: unknown[],
  beforeSensitiveValues: unknown[],
  afterSensitiveValues: unknown[]
) => {
  const entries = new Map<string, CollectionEntry>();

  values.forEach((value, index) => {
    const identity = getCollectionIdentity(value, index) || `index:${index}`;
    entries.set(identity, {
      identity,
      value,
      unknown: unknownValues[index],
      beforeSensitive: beforeSensitiveValues[index],
      afterSensitive: afterSensitiveValues[index],
    });
  });

  return entries;
};

const buildDiffRows = (
  before: unknown,
  after: unknown,
  afterUnknown: unknown,
  beforeSensitive: unknown,
  afterSensitive: unknown,
  label = "resource"
): { rows: DiffRow[]; hiddenCount: number } => {
  const isSensitive = beforeSensitive === true || afterSensitive === true;
  const isUnknown = afterUnknown === true;

  if (isSensitive) {
    return {
      rows: [
        {
          key: label,
          label,
          kind: "sensitive",
          before,
          after,
        },
      ],
      hiddenCount: 0,
    };
  }

  if (isUnknown) {
    return {
      rows: [
        {
          key: label,
          label,
          kind: "unknown",
          before,
          after,
        },
      ],
      hiddenCount: 0,
    };
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    const beforeArray = Array.isArray(before) ? before : [];
    const afterArray = Array.isArray(after) ? after : [];
    const unknownArray = Array.isArray(afterUnknown) ? afterUnknown : [];
    const beforeSensitiveArray = Array.isArray(beforeSensitive) ? beforeSensitive : [];
    const afterSensitiveArray = Array.isArray(afterSensitive) ? afterSensitive : [];

    const rows: DiffRow[] = [];
    let hiddenCount = 0;

    const canUseIdentityMatching =
      beforeArray.every((item) => isRecord(item)) &&
      afterArray.every((item) => isRecord(item)) &&
      canMatchCollectionByIdentity(beforeArray) &&
      canMatchCollectionByIdentity(afterArray);

    if (canUseIdentityMatching) {
      const beforeEntries = buildCollectionEntries(beforeArray, [], beforeSensitiveArray, []);
      const afterEntries = buildCollectionEntries(afterArray, unknownArray, [], afterSensitiveArray);
      const orderedIdentities = Array.from(new Set([...beforeEntries.keys(), ...afterEntries.keys()]));

      orderedIdentities.forEach((identity, index) => {
        const beforeEntry = beforeEntries.get(identity);
        const afterEntry = afterEntries.get(identity);
        const itemLabel = `[${index}]`;
        const itemDisplayLabel = getCollectionItemLabel(beforeEntry?.value, afterEntry?.value, index);
        const childDiff = buildDiffRows(
          beforeEntry?.value,
          afterEntry?.value,
          afterEntry?.unknown,
          beforeEntry?.beforeSensitive,
          afterEntry?.afterSensitive,
          itemLabel
        );

        hiddenCount += childDiff.hiddenCount;

        if (childDiff.rows.length === 0) {
          return;
        }

        if (
          childDiff.rows.length === 1 &&
          !childDiff.rows[0].children?.length &&
          childDiff.rows[0].label === itemLabel
        ) {
          rows.push(childDiff.rows[0]);
          return;
        }

        rows.push({
          key: identity,
          label: itemDisplayLabel,
          kind: "group",
          children: childDiff.rows,
          hiddenCount: childDiff.hiddenCount,
        });
      });
    } else {
      const maxLength = Math.max(beforeArray.length, afterArray.length);

      for (let index = 0; index < maxLength; index += 1) {
        const itemLabel = `[${index}]`;
        const itemDisplayLabel = getCollectionItemLabel(beforeArray[index], afterArray[index], index);
        const childDiff = buildDiffRows(
          beforeArray[index],
          afterArray[index],
          unknownArray[index],
          beforeSensitiveArray[index],
          afterSensitiveArray[index],
          itemLabel
        );

        hiddenCount += childDiff.hiddenCount;

        if (childDiff.rows.length === 0) {
          continue;
        }

        if (
          childDiff.rows.length === 1 &&
          !childDiff.rows[0].children?.length &&
          childDiff.rows[0].label === itemLabel
        ) {
          rows.push(childDiff.rows[0]);
          continue;
        }

        rows.push({
          key: itemLabel,
          label: itemDisplayLabel,
          kind: "group",
          children: childDiff.rows,
          hiddenCount: childDiff.hiddenCount,
        });
      }
    }

    return {
      rows,
      hiddenCount,
    };
  }

  const treatAsLeaf = isPrimitiveValue(before) || isPrimitiveValue(after);
  if (treatAsLeaf) {
    if (areValuesEqual(before, after)) {
      return {
        rows: [],
        hiddenCount: 1,
      };
    }

    let kind: DiffRow["kind"] = "changed";
    if (before === undefined) {
      kind = "added";
    } else if (after === undefined) {
      kind = "removed";
    }

    return {
      rows: [
        {
          key: label,
          label,
          kind,
          before,
          after,
        },
      ],
      hiddenCount: 0,
    };
  }

  const beforeRecord = isRecord(before) ? before : {};
  const afterRecord = isRecord(after) ? after : {};
  const unknownRecord = isRecord(afterUnknown) ? afterUnknown : {};
  const beforeSensitiveRecord = isRecord(beforeSensitive) ? beforeSensitive : {};
  const afterSensitiveRecord = isRecord(afterSensitive) ? afterSensitive : {};

  const keys = Array.from(new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])).sort();
  const rows: DiffRow[] = [];
  let hiddenCount = 0;

  keys.forEach((key) => {
    const childDiff = buildDiffRows(
      beforeRecord[key],
      afterRecord[key],
      unknownRecord[key],
      beforeSensitiveRecord[key],
      afterSensitiveRecord[key],
      key
    );

    hiddenCount += childDiff.hiddenCount;

    if (childDiff.rows.length === 0) {
      return;
    }

    if (
      childDiff.rows.length === 1 &&
      !childDiff.rows[0].children?.length &&
      childDiff.rows[0].label === key &&
      !isCollectionValue(beforeRecord[key]) &&
      !isCollectionValue(afterRecord[key])
    ) {
      rows.push(childDiff.rows[0]);
      return;
    }

    rows.push({
      key,
      label: key,
      kind: "group",
      children: childDiff.rows,
      hiddenCount: childDiff.hiddenCount,
    });
  });

  return {
    rows,
    hiddenCount,
  };
};

const renderDiffRows = (rows: DiffRow[], depth = 0): ReactNode => {
  return rows.map((row) => {
    const key = `${depth}-${row.key}`;

    if (row.children?.length) {
      return (
        <div
          key={key}
          style={{
            marginTop: depth === 0 ? 0 : 10,
            padding: "12px 14px",
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#262626", marginBottom: 10 }}>{row.label}</div>
          <div style={{ paddingLeft: 12, borderLeft: "2px solid #f0f0f0" }}>
            {renderDiffRows(row.children, depth + 1)}
          </div>
          {row.hiddenCount ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#8c8c8c" }}>
              {row.hiddenCount} unchanged attribute{row.hiddenCount === 1 ? "" : "s"} hidden
            </div>
          ) : null}
        </div>
      );
    }

    const tone = getDiffTone(row.kind);
    const showUnknown = row.kind === "unknown";
    const showSensitive = row.kind === "sensitive";

    let valueContent: ReactNode = renderValueBadge(row.after, row.kind);

    if (row.kind === "removed") {
      valueContent = renderValueBadge(row.before, row.kind);
    }

    if (row.kind === "changed" || row.kind === "unknown" || row.kind === "sensitive") {
      valueContent = (
        <Space size={8} wrap>
          {renderValueBadge(row.before, row.kind, { sensitive: showSensitive })}
          <ArrowRightOutlined style={{ color: "#8c8c8c" }} />
          {renderValueBadge(row.after, row.kind, { sensitive: showSensitive, unknown: showUnknown })}
        </Space>
      );
    }

    return (
      <div
        key={key}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 260px) 1fr",
          gap: 12,
          alignItems: "center",
          padding: "10px 12px",
          marginTop: depth === 0 ? 0 : 8,
          borderRadius: 10,
          background: tone.background,
          border: `1px solid ${tone.border}`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: tone.textColor }}>{row.label}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{valueContent}</div>
      </div>
    );
  });
};

const buildResourceDiff = (change: PlanChange) => {
  const actionName = getPlanChangeActionLabel(change.actions, change.action) as ActionName;

  if (actionName === "create") {
    return buildDiffRows(undefined, change.after, change.afterUnknown, undefined, change.afterSensitive);
  }

  if (actionName === "delete") {
    return buildDiffRows(change.before, undefined, undefined, change.beforeSensitive, undefined);
  }

  return buildDiffRows(change.before, change.after, change.afterUnknown, change.beforeSensitive, change.afterSensitive);
};

const buildSummary = (changes: PlanChange[]): ActionSummary => {
  return changes.reduce<ActionSummary>(
    (summary, change) => {
      const action = getPlanChangeActionLabel(change.actions, change.action) as ActionName;
      summary[action] += 1;
      return summary;
    },
    {
      create: 0,
      update: 0,
      replace: 0,
      delete: 0,
      read: 0,
      unknown: 0,
    }
  );
};

export const StructuredPlanOutput = ({ changes }: Props) => {
  if (!changes?.length) {
    return <Empty description="No resource changes detected." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const sortedChanges = [...changes].sort((left, right) => {
    const leftAction = getPlanChangeActionLabel(left.actions, left.action) as ActionName;
    const rightAction = getPlanChangeActionLabel(right.actions, right.action) as ActionName;

    const leftOrder = actionOrder.indexOf(leftAction);
    const rightOrder = actionOrder.indexOf(rightAction);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftLabel = left.address || `${left.resourceType}.${left.resourceName}`;
    const rightLabel = right.address || `${right.resourceType}.${right.resourceName}`;
    return leftLabel.localeCompare(rightLabel);
  });

  const summary = buildSummary(sortedChanges);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {actionOrder
          .filter((action) => summary[action] > 0)
          .map((action) => {
            const meta = actionMeta[action];

            return (
              <div
                key={action}
                style={{
                  minWidth: 160,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: meta.background,
                  border: `1px solid ${meta.accent}22`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: meta.accent, fontWeight: 700 }}>
                  {meta.icon}
                  <span>
                    {summary[action]} {meta.title}
                  </span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#595959" }}>
                  {summary[action]} resource{summary[action] === 1 ? "" : "s"} marked for {meta.label}
                </div>
              </div>
            );
          })}
      </div>

      <Collapse
        items={sortedChanges.map((change, index) => {
          const action = getPlanChangeActionLabel(change.actions, change.action) as ActionName;
          const actionDetails = actionMeta[action];
          const diff = buildResourceDiff(change);
          const visibleChanges = countVisibleLeaves(diff.rows);
          const hiddenCount = diff.hiddenCount;
          const resourceLabel = change.address || `${change.resourceType}.${change.resourceName}`;

          return {
            key: `${resourceLabel}-${index}`,
            label: (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Space size={10} wrap>
                  <Tag color={getPlanChangeActionColor(change.actions, change.action)}>
                    {getPlanChangeActionLabel(change.actions, change.action)}
                  </Tag>
                  <span style={{ fontWeight: 600, color: "#262626" }}>{resourceLabel}</span>
                  {change.moduleAddress ? <Tag>{change.moduleAddress}</Tag> : null}
                </Space>
                <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                  {visibleChanges} visible change{visibleChanges === 1 ? "" : "s"}
                </span>
              </div>
            ),
            children: (
              <Card
                variant="borderless"
                style={{
                  background: "#fafafa",
                  boxShadow: "none",
                }}
                styles={{ body: { padding: 18 } }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {resourceLabel}
                    </Typography.Title>
                    <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Tag color={actionDetails.color}>{actionDetails.label}</Tag>
                      {change.resourceType ? <Tag>{change.resourceType}</Tag> : null}
                      {change.moduleAddress ? <Tag>{change.moduleAddress}</Tag> : null}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: "#8c8c8c", fontSize: 12 }}>
                    <div>
                      {visibleChanges} visible change{visibleChanges === 1 ? "" : "s"}
                    </div>
                    {hiddenCount ? (
                      <div>
                        {hiddenCount} unchanged attribute{hiddenCount === 1 ? "" : "s"} hidden
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid #f0f0f0",
                  }}
                >
                  {diff.rows.length ? (
                    renderDiffRows(diff.rows)
                  ) : (
                    <Empty description="No visible attribute changes." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </div>
              </Card>
            ),
          };
        })}
      />
    </div>
  );
};
