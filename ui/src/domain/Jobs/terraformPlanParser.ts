import { stripAnsi } from "./stripAnsi";

export type TerraformPlanAction = "create" | "update" | "delete" | "replace" | "read" | "unknown";

export type TerraformPlanResourceChange = {
  address: string;
  action: TerraformPlanAction;
  summary: string;
  details: string[];
};

export type TerraformPlanSummary = {
  add: number;
  change: number;
  destroy: number;
};

export type TerraformPlanView = {
  resources: TerraformPlanResourceChange[];
  summary?: TerraformPlanSummary;
};

const parseAction = (summary: string): TerraformPlanAction => {
  if (summary.includes("created")) return "create";
  if (summary.includes("updated in-place")) return "update";
  if (summary.includes("destroyed and then created") || summary.includes("replaced")) return "replace";
  if (summary.includes("destroyed")) return "delete";
  if (summary.includes("read during apply") || summary.includes("read")) return "read";
  return "unknown";
};

export const parseTerraformPlanOutput = (output: string): TerraformPlanView | undefined => {
  const plainLog = stripAnsi(output);
  const lines = plainLog.split(/\r?\n/);

  const changes: TerraformPlanResourceChange[] = [];
  let currentChange: TerraformPlanResourceChange | undefined;

  for (const line of lines) {
    const header = line.match(/^\s*#\s+(.+?)\s+will be\s+(.+)$/);

    if (header) {
      if (currentChange) {
        changes.push(currentChange);
      }

      const summary = header[2].trim();
      currentChange = {
        address: header[1].trim(),
        action: parseAction(summary),
        summary,
        details: [],
      };
      continue;
    }

    if (currentChange) {
      if (line.match(/^\s*Plan:\s+/) || line.match(/^\s*(Changes to Outputs|Note:)/)) {
        changes.push(currentChange);
        currentChange = undefined;
        continue;
      }

      currentChange.details.push(line);
    }
  }

  if (currentChange) {
    changes.push(currentChange);
  }

  if (changes.length === 0) {
    return undefined;
  }

  const summaryMatch = plainLog.match(/Plan:\s*(\d+)\s+to add,\s*(\d+)\s+to change,\s*(\d+)\s+to destroy\./);
  const summary = summaryMatch
    ? {
        add: Number(summaryMatch[1]),
        change: Number(summaryMatch[2]),
        destroy: Number(summaryMatch[3]),
      }
    : undefined;

  return {
    resources: changes,
    summary,
  };
};
