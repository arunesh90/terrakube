package io.terrakube.executor.service.terraform;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import io.terrakube.executor.service.mode.TerraformJob;
import io.terrakube.executor.service.workspace.security.WorkspaceSecurity;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@AllArgsConstructor
public class PlanStructuredOutputService {

    private static final String TERRAFORM_PLAN_FILE = "terraformLibrary.tfPlan";
    private static final String CONTEXT_PLAN_KEY = "planStructuredOutput";
    private static final String CONTEXT_UI_KEY = "terrakubeUI";

    private final WorkspaceSecurity workspaceSecurity;
    private final ObjectMapper objectMapper;
    @Value("${io.terrakube.api.url}")
    private String terrakubeApiUrl;

    public void publishPlanSummary(TerraformJob terraformJob, File terraformWorkingDir) {
        try {
            String planJson = getPlanAsJson(terraformWorkingDir);
            if (planJson == null || planJson.isBlank()) {
                return;
            }

            List<Map<String, Object>> changes = buildChangesFromPlanJson(planJson);
            Map<String, Object> context = getCurrentContext(terraformJob.getJobId());

            Map<String, Object> planStructuredOutput = toMap(context.get(CONTEXT_PLAN_KEY));
            planStructuredOutput.put(terraformJob.getStepId(), changes);
            context.put(CONTEXT_PLAN_KEY, planStructuredOutput);

            Map<String, Object> terrakubeUi = toMap(context.get(CONTEXT_UI_KEY));
            terrakubeUi.put(terraformJob.getStepId(), "<div data-terrakube-structured-plan=\"true\"></div>");
            context.put(CONTEXT_UI_KEY, terrakubeUi);

            saveContext(terraformJob.getJobId(), objectMapper.writeValueAsString(context));
        } catch (Exception e) {
            log.warn("Unable to publish structured plan output: {}", e.getMessage());
        }
    }

    private String getPlanAsJson(File terraformWorkingDir) throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder("terraform", "show", "-json", TERRAFORM_PLAN_FILE);
        processBuilder.directory(terraformWorkingDir);
        Process process = processBuilder.start();

        String stdout;
        String stderr;
        try (BufferedReader stdoutReader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
             BufferedReader stderrReader = new BufferedReader(new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
            stdout = stdoutReader.lines().reduce("", (acc, line) -> acc + line);
            stderr = stderrReader.lines().reduce("", (acc, line) -> acc + line + "\n");
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            log.warn("terraform show -json returned {}: {}", exitCode, stderr);
            return null;
        }

        return stdout;
    }

    private List<Map<String, Object>> buildChangesFromPlanJson(String json) throws IOException {
        Map<String, Object> plan = objectMapper.readValue(json, new TypeReference<>() {
        });
        List<Map<String, Object>> resourceChanges = (List<Map<String, Object>>) plan.getOrDefault("resource_changes", new ArrayList<>());

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> change : resourceChanges) {
            Map<String, Object> changeBlock = (Map<String, Object>) change.get("change");
            if (changeBlock == null) {
                continue;
            }
            List<String> actions = (List<String>) changeBlock.getOrDefault("actions", List.of());
            String action = actions.isEmpty() ? "unknown" : String.join(",", actions);

            Map<String, Object> entry = new HashMap<>();
            entry.put("address", change.get("address"));
            entry.put("moduleAddress", change.get("module_address"));
            entry.put("resourceType", change.get("type"));
            entry.put("resourceName", change.get("name"));
            entry.put("actions", actions);
            entry.put("action", action);
            entry.put("before", changeBlock.get("before"));
            entry.put("after", changeBlock.get("after"));
            entry.put("afterUnknown", changeBlock.get("after_unknown"));
            result.add(entry);
        }
        return result;
    }

    private Map<String, Object> getCurrentContext(String jobId) {
        try {
            HttpURLConnection connection = buildConnection(terrakubeApiUrl + "/context/v1/" + jobId, "GET");
            int statusCode = connection.getResponseCode();
            if (statusCode >= 400) {
                return new HashMap<>();
            }
            String body;
            try (BufferedReader responseReader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                body = responseReader.lines().reduce("", (acc, line) -> acc + line);
            }
            if (body == null || body.isBlank()) {
                return new HashMap<>();
            }
            return objectMapper.readValue(body, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return new HashMap<>();
        }
    }

    private void saveContext(String jobId, String context) {
        try {
            HttpURLConnection connection = buildConnection(terrakubeApiUrl + "/context/v1/" + jobId, "POST");
            connection.setDoOutput(true);
            byte[] data = context.getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = connection.getOutputStream()) {
                os.write(data);
            }
            connection.getResponseCode();
        } catch (Exception e) {
            log.warn("Unable to save context for job {}", jobId);
        }
    }

    private HttpURLConnection buildConnection(String endpoint, String method) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod(method);
        connection.setRequestProperty("Authorization", "Bearer " + workspaceSecurity.generateAccessToken(5));
        connection.setRequestProperty("Content-Type", "application/json");
        return connection;
    }

    private Map<String, Object> toMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> typed = new HashMap<>();
            map.forEach((k, v) -> typed.put(String.valueOf(k), v));
            return typed;
        }
        return new HashMap<>();
    }
}
