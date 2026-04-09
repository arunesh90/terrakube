import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
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

    expect(screen.getByText("1 to create")).toBeInTheDocument();
    expect(screen.getByText("1 to destroy")).toBeInTheDocument();
    expect(screen.getByText("Actions: 0 to invoke")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /aws_instance\.example/i }));

    expect(screen.getByText("replace")).toBeInTheDocument();
    expect(screen.getByText("aws_instance.example")).toBeInTheDocument();
    expect(screen.getByText("instance_type")).toBeInTheDocument();
    expect(screen.getByText('"t3.small"')).toBeInTheDocument();
    expect(screen.getByText('"t3.medium"')).toBeInTheDocument();
  });

  it("filters rows by address", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "aws_instance.example",
            action: "update",
            actions: ["update"],
            before: {
              instance_type: "t3.small",
            },
            after: {
              instance_type: "t3.medium",
            },
          },
          {
            address: "railway_service.img",
            action: "update",
            actions: ["update"],
            before: {
              name: "img",
            },
            after: {
              name: "img-api",
            },
          },
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Filter resources by address..."), {
      target: { value: "railway" },
    });

    expect(screen.queryByRole("button", { name: /aws_instance\.example/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /railway_service\.img/i })).toBeInTheDocument();
  });

  it("can show data sources when requested", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "aws_instance.example",
            action: "update",
            actions: ["update"],
            before: {
              instance_type: "t3.small",
            },
            after: {
              instance_type: "t3.medium",
            },
          },
          {
            address: "data.aws_caller_identity.current",
            action: "read",
            actions: ["read"],
            before: {
              account_id: "123456789012",
            },
            after: {
              account_id: "123456789012",
            },
          },
        ]}
      />
    );

    expect(screen.queryByRole("button", { name: /data\.aws_caller_identity\.current/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/show data sources/i));

    expect(screen.getByRole("button", { name: /data\.aws_caller_identity\.current/i })).toBeInTheDocument();
  });

  it("hides data sources on the initial render when managed resources are also present", () => {
    const html = renderToStaticMarkup(
      <StructuredPlanOutput
        changes={[
          {
            address: "aws_instance.example",
            action: "update",
            actions: ["update"],
            before: {
              instance_type: "t3.small",
            },
            after: {
              instance_type: "t3.medium",
            },
          },
          {
            address: "data.aws_caller_identity.current",
            action: "read",
            actions: ["read"],
            before: {
              account_id: "123456789012",
            },
            after: {
              account_id: "123456789012",
            },
          },
        ]}
      />
    );

    expect(html).toContain("aws_instance.example");
    expect(html).not.toContain("data.aws_caller_identity.current");
  });

  it("shows hidden unchanged attributes instead of dumping JSON", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "railway_service.test",
            action: "update",
            actions: ["update"],
            before: {
              name: "test",
              regions: {
                num_replicas: 2,
              },
            },
            after: {
              name: "test",
              regions: {
                num_replicas: 1,
              },
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /railway_service\.test/i }));

    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.queryByText(/unchanged attribute/i)).not.toBeInTheDocument();
    expect(screen.queryByText('"after"')).not.toBeInTheDocument();
  });

  it("shows Terraform important attributes even when only a sensitive field changes", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "cloudflare_zero_trust_access_application.example",
            action: "update",
            actions: ["update"],
            before: {
              account_id: "secret-account-id",
              id: "application-id",
              name: "example.com",
              tags: [],
            },
            beforeSensitive: {
              account_id: true,
            },
            changedSensitive: {
              account_id: true,
            },
            after: {
              account_id: "secret-account-id",
              id: "application-id",
              name: "example.com",
              tags: [],
            },
            afterSensitive: {
              account_id: true,
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cloudflare_zero_trust_access_application\.example/i }));

    expect(screen.getByText("account_id")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("tags")).toBeInTheDocument();
    expect(screen.getByText('"application-id"')).toBeInTheDocument();
    expect(screen.getByText('"example.com"')).toBeInTheDocument();
    expect(screen.getByText("[]")).toBeInTheDocument();
    expect(screen.getByText("1 visible change")).toBeInTheDocument();
  });

  it("renders created resources as nested attribute diffs instead of a single resource summary row", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "cloudflare_custom_hostname.example",
            action: "create",
            actions: ["create"],
            after: {
              custom_origin_server: "origin.example.com",
              hostname: "example.com",
              id: null,
              ssl: {
                certificate_authority: null,
                method: "http",
                settings: {
                  min_tls_version: "1.2",
                },
              },
              wait_for_ssl_pending_validation: false,
            },
            afterUnknown: {
              id: true,
              ssl: {
                certificate_authority: true,
              },
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cloudflare_custom_hostname\.example/i }));

    expect(screen.getByText("custom_origin_server")).toBeInTheDocument();
    expect(screen.getByText("hostname")).toBeInTheDocument();
    expect(screen.getByText("ssl")).toBeInTheDocument();
    expect(screen.getByText("method")).toBeInTheDocument();
    expect(screen.getByText("settings")).toBeInTheDocument();
    expect(screen.getByText("min_tls_version")).toBeInTheDocument();
    expect(screen.getByText('"origin.example.com"')).toBeInTheDocument();
    expect(screen.getByText('"example.com"')).toBeInTheDocument();
    expect(screen.getByText('"http"')).toBeInTheDocument();
    expect(screen.getByText('"1.2"')).toBeInTheDocument();
    expect(screen.getAllByText("known after apply")).toHaveLength(2);
    expect(screen.queryByText(/^resource$/)).not.toBeInTheDocument();
  });

  it("hides unchanged sensitive attributes when they only carry sensitivity metadata", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "aws_secretsmanager_secret_version.example",
            action: "update",
            actions: ["update"],
            before: {
              secret_string: null,
            },
            beforeSensitive: {
              secret_string: true,
            },
            after: {
              secret_string: null,
            },
            afterSensitive: {
              secret_string: true,
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /aws_secretsmanager_secret_version\.example/i }));

    expect(screen.getByText("No visible attribute changes.")).toBeInTheDocument();
    expect(screen.queryByText("secret_string")).not.toBeInTheDocument();
  });

  it("shows changed sensitive attributes when changed metadata is present", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "aws_secretsmanager_secret_version.example",
            action: "update",
            actions: ["update"],
            before: {
              secret_string: null,
            },
            beforeSensitive: {
              secret_string: true,
            },
            changedSensitive: {
              secret_string: true,
            },
            after: {
              secret_string: null,
            },
            afterSensitive: {
              secret_string: true,
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /aws_secretsmanager_secret_version\.example/i }));

    expect(screen.getByText("secret_string")).toBeInTheDocument();
    expect(screen.getAllByText("sensitive value")).toHaveLength(2);
  });

  it("treats a null changedSensitive marker like a missing legacy marker", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "aws_secretsmanager_secret_version.example",
            action: "update",
            actions: ["update"],
            before: {
              secret_string: null,
            },
            beforeSensitive: {
              secret_string: true,
            },
            changedSensitive: null,
            after: {
              secret_string: "known after sanitization drift",
            },
            afterSensitive: {
              secret_string: true,
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /aws_secretsmanager_secret_version\.example/i }));

    expect(screen.getByText("secret_string")).toBeInTheDocument();
    expect(screen.getAllByText("sensitive value")).toHaveLength(2);
  });

  it("expands array items so useful child fields are visible", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "railway_variable_collection.vars",
            action: "update",
            actions: ["update"],
            before: {
              variables: [
                {
                  name: "COUNT",
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
                  name: "COUNT",
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

    fireEvent.click(screen.getByRole("button", { name: /railway_variable_collection\.vars/i }));

    expect(screen.getByText("variables")).toBeInTheDocument();
    expect(screen.getByText("[0] COUNT")).toBeInTheDocument();
    expect(screen.getByText("[1] UNCHANGED")).toBeInTheDocument();
    expect(screen.getByText('"COUNT"')).toBeInTheDocument();
    expect(screen.getByText('"1"')).toBeInTheDocument();
    expect(screen.getByText('"2"')).toBeInTheDocument();
    expect(screen.getByText('"same"')).toBeInTheDocument();
    expect(screen.queryByText(/unchanged attribute/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unchanged element/i)).not.toBeInTheDocument();
  });

  it("shows one unchanged list element before and after a change", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "terraform_data.example",
            action: "update",
            actions: ["update"],
            before: {
              items: ["a", "b", "c", "d", "e"],
            },
            after: {
              items: ["a", "b", "x", "d", "e"],
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /terraform_data\.example/i }));

    expect(screen.getByText("items")).toBeInTheDocument();
    expect(screen.getByText('"b"')).toBeInTheDocument();
    expect(screen.getByText('"c"')).toBeInTheDocument();
    expect(screen.getByText('"x"')).toBeInTheDocument();
    expect(screen.getByText('"d"')).toBeInTheDocument();
    expect(screen.queryByText('"a"')).not.toBeInTheDocument();
    expect(screen.queryByText('"e"')).not.toBeInTheDocument();
    expect(screen.getByText("2 unchanged elements hidden")).toBeInTheDocument();
  });

  it("counts a fully collapsed nested object as one hidden attribute at the parent scope", () => {
    render(
      <StructuredPlanOutput
        changes={[
          {
            address: "terraform_data.example",
            action: "update",
            actions: ["update"],
            before: {
              config: {
                first: "a",
                second: "b",
              },
              input: "old",
            },
            after: {
              config: {
                first: "a",
                second: "b",
              },
              input: "new",
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /terraform_data\.example/i }));

    expect(screen.getByText("1 unchanged attribute hidden")).toBeInTheDocument();
    expect(screen.queryByText("config")).not.toBeInTheDocument();
    expect(screen.getByText("input")).toBeInTheDocument();
  });
});
