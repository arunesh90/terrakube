import { Collapse, Empty, Space, Tag } from "antd";
import { PlanChange, getPlanChangeActionColor, getPlanChangeActionLabel } from "./structuredPlan";

type Props = {
  changes: PlanChange[];
};

const buildPlanChangePayload = (change: PlanChange) => {
  const payload: Record<string, unknown> = {
    moduleAddress: change.moduleAddress,
    before: change.before,
    after: change.after,
    afterUnknown: change.afterUnknown,
  };

  if (change.beforeSensitive !== undefined) {
    payload.beforeSensitive = change.beforeSensitive;
  }

  if (change.afterSensitive !== undefined) {
    payload.afterSensitive = change.afterSensitive;
  }

  return payload;
};

export const StructuredPlanOutput = ({ changes }: Props) => {
  if (!changes?.length) {
    return <Empty description="No resource changes detected." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <Collapse
      items={changes.map((change, index) => ({
        key: `${change.address || change.resourceName || "resource"}-${index}`,
        label: (
          <Space>
            <Tag color={getPlanChangeActionColor(change.actions, change.action)}>
              {getPlanChangeActionLabel(change.actions, change.action)}
            </Tag>
            <span>{change.address || `${change.resourceType}.${change.resourceName}`}</span>
          </Space>
        ),
        children: (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(buildPlanChangePayload(change), null, 2)}
          </pre>
        ),
      }))}
    />
  );
};
