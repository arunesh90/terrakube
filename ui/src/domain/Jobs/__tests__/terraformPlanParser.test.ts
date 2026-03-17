import { parseTerraformPlanOutput } from "../terraformPlanParser";

describe("parseTerraformPlanOutput", () => {
  it("parses resource changes and summary", () => {
    const output = `Terraform will perform the following actions:\n\n  # random_string.first will be created\n  + resource \"random_string\" \"first\" {\n      + id     = (known after apply)\n      + length = 16\n    }\n\n  # random_string.second will be updated in-place\n  ~ resource \"random_string\" \"second\" {\n      ~ length = 8 -> 12\n    }\n\nPlan: 1 to add, 1 to change, 0 to destroy.`;

    const result = parseTerraformPlanOutput(output);

    expect(result?.resources).toHaveLength(2);
    expect(result?.resources[0].address).toBe("random_string.first");
    expect(result?.resources[0].action).toBe("create");
    expect(result?.resources[1].action).toBe("update");
    expect(result?.summary).toEqual({ add: 1, change: 1, destroy: 0 });
  });

  it("returns undefined for non-plan output", () => {
    expect(parseTerraformPlanOutput("Initializing the backend...")).toBeUndefined();
  });
});
