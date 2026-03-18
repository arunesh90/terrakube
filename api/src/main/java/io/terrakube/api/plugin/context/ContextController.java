package io.terrakube.api.plugin.context;

import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import io.terrakube.api.plugin.storage.StorageTypeService;
import io.terrakube.api.repository.JobRepository;
import io.terrakube.api.rs.job.Job;
import io.terrakube.api.rs.job.JobStatus;

import java.io.IOException;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/context/v1")
@AllArgsConstructor
public class ContextController {
    private final StorageTypeService storageTypeService;

    private final JobRepository jobRepository;

    private final ObjectMapper objectMapper;

    @GetMapping(value = "/{jobId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getContext(@PathVariable("jobId") int jobId) throws IOException {
        String context = storageTypeService.getContext(jobId);
        if (context == null || context.isBlank()) {
            context = "{}";
        }
        return new ResponseEntity<>(context, HttpStatus.OK);
    }

    @PostMapping(value = "/{jobId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public ResponseEntity<String> saveContext(@PathVariable("jobId") int jobId, @RequestBody String context) throws IOException {
        try {
            objectMapper.readTree(context);
        } catch (JacksonException e) {
            log.warn("Invalid context payload for job {}", jobId, e);
            return new ResponseEntity<>("{}", HttpStatus.BAD_REQUEST);
        }

        Optional<Job> jobOptional = jobRepository.findById(jobId);
        if (jobOptional.isEmpty()) {
            log.warn("Cannot save context for missing job {}", jobId);
            return new ResponseEntity<>("{}", HttpStatus.NOT_FOUND);
        }

        Job job = jobOptional.get();
        if (!JobStatus.running.equals(job.getStatus())) {
            log.warn("Cannot save context for job {} with status {}", jobId, job.getStatus());
            return new ResponseEntity<>("{}", HttpStatus.CONFLICT);
        }

        String savedContext = storageTypeService.saveContext(jobId, context);
        return new ResponseEntity<>(savedContext, HttpStatus.OK);
    }
}
