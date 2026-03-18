import { render, screen } from "@testing-library/react";
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
          },
        ]}
      />
    );

    expect(screen.getByText("replace")).toBeInTheDocument();
    expect(screen.getByText("aws_instance.example")).toBeInTheDocument();
  });
});
