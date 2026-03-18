import { Collapse, Empty, Space, Tag } from "antd";

type PlanChange = {
  address?: string;
  resourceType?: string;
  resourceName?: string;
  moduleAddress?: string;
  action?: string;
  actions?: string[];
  before?: unknown;
  after?: unknown;
  afterUnknown?: unknown;
};

type Props = {
  changes: PlanChange[];
};

const getActionTagColor = (actions: string[] = []) => {
  if (actions.includes("create")) return "green";
  if (actions.includes("delete")) return "red";
  if (actions.includes("update")) return "blue";
  if (actions.includes("replace")) return "orange";
  return "default";
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
            <Tag color={getActionTagColor(change.actions)}>{(change.actions || []).join(", ") || change.action}</Tag>
            <span>{change.address || `${change.resourceType}.${change.resourceName}`}</span>
          </Space>
        ),
        children: (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(
              {
                moduleAddress: change.moduleAddress,
                before: change.before,
                after: change.after,
                afterUnknown: change.afterUnknown,
              },
              null,
              2
            )}
          </pre>
        ),
      }))}
    />
  );
};
