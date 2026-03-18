package io.terrakube.executor.service.terraform;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.terrakube.executor.service.workspace.security.WorkspaceSecurity;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlanStructuredOutputServiceTest {

    private PlanStructuredOutputService subject() {
        WorkspaceSecurity workspaceSecurity = Mockito.mock(WorkspaceSecurity.class);
        return new PlanStructuredOutputService(workspaceSecurity, new ObjectMapper(), "http://terrakube-api");
    }

    @Test
    void normalizesReplaceActionsAndPreservesSensitiveMetadata() throws Exception {
        String json = """
                {
                  "resource_changes": [
                    {
                      "address": "aws_instance.example",
                      "type": "aws_instance",
                      "name": "example",
                      "change": {
                        "actions": ["delete", "create"],
                        "before": {"name": "old"},
                        "before_sensitive": {"password": true},
                        "after": {"name": "new"},
                        "after_sensitive": {"password": true},
                        "after_unknown": {"id": true}
                      }
                    }
                  ]
                }
                """;

        List<Map<String, Object>> changes = subject().buildChangesFromPlanJson(json);

        assertEquals(1, changes.size());
        assertEquals("replace", changes.get(0).get("action"));
        assertEquals(List.of("delete", "create"), changes.get(0).get("actions"));
        assertEquals(Map.of("password", true), changes.get(0).get("beforeSensitive"));
        assertEquals(Map.of("password", true), changes.get(0).get("afterSensitive"));
    }

    @Test
    void skipsNoOpResourceChanges() throws Exception {
        String json = """
                {
                  "resource_changes": [
                    {
                      "address": "aws_instance.example",
                      "change": {
                        "actions": ["no-op"]
                      }
                    }
                  ]
                }
                """;

        List<Map<String, Object>> changes = subject().buildChangesFromPlanJson(json);

        assertTrue(changes.isEmpty());
    }

    @Test
    void mergesStructuredPlanDataWithoutDroppingExistingContext() {
        Map<String, Object> context = new HashMap<>();
        context.put("custom", "value");
        context.put("planStructuredOutput", Map.of("existing-step", List.of(Map.of("action", "create"))));
        context.put("terrakubeUI", Map.of("existing-step", "<div>existing</div>"));

        Map<String, Object> updatedContext = subject().updateContext(
                context,
                "new-step",
                List.of(Map.of("action", "replace")));

        assertEquals("value", updatedContext.get("custom"));

        Map<String, Object> planStructuredOutput = (Map<String, Object>) updatedContext.get("planStructuredOutput");
        assertTrue(planStructuredOutput.containsKey("existing-step"));
        assertTrue(planStructuredOutput.containsKey("new-step"));

        Map<String, Object> terrakubeUi = (Map<String, Object>) updatedContext.get("terrakubeUI");
        assertTrue(terrakubeUi.containsKey("existing-step"));
        assertTrue(terrakubeUi.containsKey("new-step"));
    }
}
