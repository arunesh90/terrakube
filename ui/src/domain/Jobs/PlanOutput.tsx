import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, Collapse, Empty, List, Tag } from "antd";
import { parseTerraformPlanOutput, TerraformPlanAction } from "./terraformPlanParser";

type Props = {
  outputLog: string;
};

const getActionTag = (action: TerraformPlanAction) => {
  switch (action) {
    case "create":
      return <Tag icon={<PlusOutlined />} color="success">create</Tag>;
    case "update":
      return <Tag icon={<EditOutlined />} color="processing">update</Tag>;
    case "delete":
      return <Tag icon={<DeleteOutlined />} color="error">delete</Tag>;
    case "replace":
      return <Tag icon={<SwapOutlined />} color="warning">replace</Tag>;
    case "read":
      return <Tag icon={<EyeOutlined />} color="default">read</Tag>;
    default:
      return <Tag>unknown</Tag>;
  }
};

export const PlanOutput = ({ outputLog }: Props) => {
  const plan = parseTerraformPlanOutput(outputLog);

  if (!plan) {
    return <Empty description="No structured Terraform plan output available." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <>
      {plan.summary ? (
        <Alert
          type="info"
          message={`Plan: ${plan.summary.add} to add, ${plan.summary.change} to change, ${plan.summary.destroy} to destroy.`}
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <List
        dataSource={plan.resources}
        renderItem={(resource, index) => (
          <List.Item key={`${resource.address}-${index}`}>
            <Collapse
              style={{ width: "100%" }}
              defaultActiveKey={[]}
              items={[
                {
                  key: `${resource.address}-${index}`,
                  label: (
                    <span>
                      {getActionTag(resource.action)} <code>{resource.address}</code>
                    </span>
                  ),
                  children: <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{resource.details.join("\n")}</pre>,
                },
              ]}
            />
          </List.Item>
        )}
      />
    </>
  );
};
