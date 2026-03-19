import { fireEvent, render, screen } from "@testing-library/react";
import { StructuredPlanOutput } from "../StructuredPlanOutput";

describe("StructuredPlanOutput", () => {
  it("renders an empty state when there are no changes", () => {
    render(<StructuredPlanOutput changes={[]} />);

    expect(screen.getByText("No resource changes detected.")).toBeInTheDocument();
  });

  it("renders a normalized replacement label", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "aws_instance.example",
            action: "replace",
            actions: ["delete", "create"],
            before: {
              instance_type: "t3.small",
            },
            after: {
              instance_type: "t3.medium",
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /aws_instance\.example/i }));

    expect(screen.getAllByText("replace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("aws_instance.example").length).toBeGreaterThan(0);
    expect(screen.getByText("1 to replace")).toBeInTheDocument();
    expect(screen.getByText("instance_type")).toBeInTheDocument();
    expect(screen.getByText('"t3.small"')).toBeInTheDocument();
    expect(screen.getByText('"t3.medium"')).toBeInTheDocument();
  });

  it("shows hidden unchanged attributes instead of dumping JSON", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "railway_service.img",
            action: "update",
            actions: ["update"],
            before: {
              name: "img",
              regions: {
                num_replicas: 2,
              },
            },
            after: {
              name: "img",
              regions: {
                num_replicas: 1,
              },
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /railway_service\.img/i }));

    expect(screen.getByText(/unchanged attribute/i)).toBeInTheDocument();
    expect(screen.queryByText('"after"')).not.toBeInTheDocument();
  });

  it("expands array items so useful child fields are visible", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "railway_variable_collection.img",
            action: "update",
            actions: ["update"],
            before: {
              variables: [
                {
                  name: "CONSUMER_COUNT",
                  value: "1",
                },
                {
                  name: "UNCHANGED",
                  value: "same",
                },
              ],
            },
            after: {
              variables: [
                {
                  name: "CONSUMER_COUNT",
                  value: "2",
                },
                {
                  name: "UNCHANGED",
                  value: "same",
                },
              ],
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /railway_variable_collection\.img/i }));

    expect(screen.getByText("variables")).toBeInTheDocument();
    expect(screen.getByText("[0] CONSUMER_COUNT")).toBeInTheDocument();
    expect(screen.queryByText(/\[1\] UNCHANGED/i)).not.toBeInTheDocument();
    expect(screen.queryByText('"CONSUMER_COUNT"')).not.toBeInTheDocument();
    expect(screen.getByText('"1"')).toBeInTheDocument();
    expect(screen.getByText('"2"')).toBeInTheDocument();
    expect(screen.getAllByText(/unchanged attribute/i).length).toBeGreaterThan(0);
  });
});
