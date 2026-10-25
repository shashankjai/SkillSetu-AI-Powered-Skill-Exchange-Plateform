// backend/services/roadmapService.js
// Personalized Learning Roadmap generation service using Gemini LLM.

const { generateText } = require("./aiService");

/**
 * Helper to ensure a value is returned as an array of trimmed strings.
 */
const toStringArray = (val) => {
  if (!Array.isArray(val)) return [];
  return val.map(String).map((s) => s.trim()).filter(Boolean);
};

/**
 * Clean and parse raw LLM text output into structured JSON.
 * Handles markdown formatting, backticks, and extra conversational whitespace.
 *
 * @param {string} rawText
 * @returns {object} parsed JSON object
 */
const parseRoadmapJSON = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty or invalid response received from AI model");
  }

  // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  // Find first { and last } in case of extraneous conversational text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain a valid JSON object structure");
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse AI output as JSON: ${err.message}`);
  }

  // Validate required top-level structure
  if (!parsed.title || !Array.isArray(parsed.phases) || parsed.phases.length === 0) {
    throw new Error("AI response is missing required fields (title, phases)");
  }

  // Sanitize phases with expanded, rich properties
  const sanitizedPhases = parsed.phases.map((phase, idx) => ({
    phaseNumber: typeof phase.phaseNumber === "number" ? phase.phaseNumber : idx + 1,
    title: String(phase.title || `Phase ${idx + 1}`).trim(),
    duration: String(phase.duration || "1-2 weeks").trim(),
    learningObjectives: toStringArray(phase.learningObjectives),
    topics: toStringArray(phase.topics),
    practicalExercises: toStringArray(phase.practicalExercises),
    codingQuestions: toStringArray(phase.codingQuestions),
    suggestedProjects: toStringArray(phase.suggestedProjects),
    checkpointCriteria: toStringArray(phase.checkpointCriteria),
    recommendedResources: toStringArray(phase.recommendedResources),
  }));

  // Sanitize capstone project
  const capstoneRaw = parsed.capstoneProject || {};
  const capstoneProject = {
    title: String(capstoneRaw.title || "").trim(),
    description: String(capstoneRaw.description || "").trim(),
    deliverables: toStringArray(capstoneRaw.deliverables),
  };

  return {
    title: String(parsed.title).trim(),
    summary: String(parsed.summary || "").trim(),
    phases: sanitizedPhases,
    capstoneProject,
    revisionPlan: toStringArray(parsed.revisionPlan),
    selfAssessmentChecklist: toStringArray(parsed.selfAssessmentChecklist),
    nextRecommendedStep: String(parsed.nextRecommendedStep || "").trim(),
    finalMilestone: String(parsed.finalMilestone || "").trim(),
  };
};

/**
 * Fallback roadmap generator when AI provider is unreachable or returns invalid JSON.
 * Generates a level-specific, goal-tailored structured roadmap so user workflow is never blocked.
 */
const generateFallbackRoadmap = (
  targetSkill,
  currentLevel = "beginner",
  studyTime = "5 hours/week",
  learningGoal = "",
  existingKnowledge = ""
) => {
  const levelStr = String(currentLevel).toLowerCase();
  const isBeginner = levelStr === "beginner";
  const isAdvanced = levelStr === "advanced";
  const levelTitle = isBeginner
    ? "Beginner Foundations to Practice"
    : isAdvanced
    ? "Advanced Scalability & Internal Architecture"
    : "Intermediate Architecture & Systems Integration";

  const goalContext = learningGoal
    ? ` Specifically aligned with your goal: "${learningGoal}".`
    : "";
  const priorContext = existingKnowledge
    ? ` Building upon your background in ${existingKnowledge}.`
    : "";

  let phases = [];

  if (isBeginner) {
    phases = [
      {
        phaseNumber: 1,
        title: `Core Fundamentals & Mental Models of ${targetSkill}`,
        duration: "Weeks 1 - 2",
        learningObjectives: [
          `Master core syntax, primitive constructs, and setup toolchain for ${targetSkill}`,
          "Understand key architectural terminology and mental models",
        ],
        topics: [
          `Environment setup, package management, and developer tools for ${targetSkill}`,
          "Foundational syntax, variables, data types, and scope",
          "Control flow, conditionals, loops, and error handling basics",
        ],
        practicalExercises: [
          `Build a simple CLI utility or starter script using ${targetSkill}`,
          "Solve 5 foundational coding exercises focused on control flow and data manipulation",
        ],
        codingQuestions: [
          `Implement a basic function to validate and transform input data in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Interactive Console App / Data Parser in ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Able to write clean, runnable code without syntax errors",
          "Understands standard directory structures and basic execution commands",
        ],
        recommendedResources: [
          `Official ${targetSkill} Getting Started Documentation`,
          `MDN / Official Specs: ${targetSkill} Core Guides`,
        ],
      },
      {
        phaseNumber: 2,
        title: `Practical Application & Modular Concepts`,
        duration: "Weeks 3 - 4",
        learningObjectives: [
          "Structure code into modular, reusable components/functions",
          "Handle asynchronous operations or data persistence cleanly",
        ],
        topics: [
          "Modular programming, imports, exports, and package dependencies",
          "Data structures (arrays, collections, objects, dictionaries)",
          "Asynchronous programming, promises/callbacks, or file I/O",
        ],
        practicalExercises: [
          "Refactor monolithic starter script into modular files",
          "Implement unit tests for core helper functions",
        ],
        codingQuestions: [
          `Write a function that asynchronously fetches or reads data and handles errors gracefully in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Feature-Rich CRUD Application using ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Code is separated into clean, modular files",
          "Handles basic runtime errors without crashing",
        ],
        recommendedResources: [
          `Community Best Practices & Design Patterns for ${targetSkill}`,
        ],
      },
      {
        phaseNumber: 3,
        title: `Real-World Integration & Production Readiness`,
        duration: "Weeks 5 - 6",
        learningObjectives: [
          "Integrate external APIs, databases, or third-party libraries",
          "Apply security and code hygiene standards",
        ],
        topics: [
          "API integration, HTTP requests, and serialization",
          "Error boundaries, logging, and environment variable configuration",
          "Testing fundamentals and basic debugging toolchains",
        ],
        practicalExercises: [
          "Add environment variable validation and structured logging",
          "Write 3 integration tests verifying data flow",
        ],
        codingQuestions: [
          `Build an API handler with retry logic and timeout boundaries in ${targetSkill}`,
        ],
        suggestedProjects: [
          `End-to-End Skill Tracker / Portfolio Web App using ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Application runs locally with clear setup steps and unit tests",
          "Ready to showcase to peers on SkillSetu",
        ],
        recommendedResources: [
          `Testing & Debugging Guides for ${targetSkill}`,
        ],
      },
    ];
  } else if (isAdvanced) {
    phases = [
      {
        phaseNumber: 1,
        title: `Advanced Internals, Memory & Design Patterns`,
        duration: "Weeks 1 - 2",
        learningObjectives: [
          `Deep dive into ${targetSkill} runtime engine, memory management, and concurrency`,
          "Apply enterprise design patterns (Factory, Strategy, Dependency Injection)",
        ],
        topics: [
          `Execution context, memory profiling, and Garbage Collection in ${targetSkill}`,
          "Concurrency models, thread safety, or event loop optimization",
          "Design patterns and architectural separation of concerns",
        ],
        practicalExercises: [
          "Benchmark memory consumption and identify memory leaks",
          "Refactor legacy pattern into decoupled Dependency Injection structure",
        ],
        codingQuestions: [
          `Implement a thread-safe / high-throughput concurrent processing pipeline in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Custom Middleware Engine or High-Performance Cache Component in ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Demonstrates clear understanding of low-level runtime execution",
          "Can articulate trade-offs between different architectural design patterns",
        ],
        recommendedResources: [
          `Advanced Runtime Architecture & Performance Specs for ${targetSkill}`,
        ],
      },
      {
        phaseNumber: 2,
        title: `Microservices, Distributed Systems & Security`,
        duration: "Weeks 3 - 4",
        learningObjectives: [
          "Design scalable, fault-tolerant distributed systems",
          "Enforce zero-trust security and microservice communication patterns",
        ],
        topics: [
          "Distributed system state, gRPC/REST protocols, and message queues",
          "Security auditing, OWASP mitigation, and rate limiting",
          "CI/CD pipelines, containerization (Docker), and cloud deployments",
        ],
        practicalExercises: [
          "Containerize application with multi-stage builds for minimal image size",
          "Set up automated CI workflow with linting, security scans, and test runs",
        ],
        codingQuestions: [
          `Write a rate limiter middleware with sliding window algorithm in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Distributed Microservice Architecture with Event Bus in ${targetSkill}`,
        ],
        checkpointCriteria: [
          "System handles failure graceful degradation and high load scenarios",
          "Automated tests pass in containerized CI environment",
        ],
        recommendedResources: [
          `Distributed Systems Architecture Patterns & OWASP Security Guidelines`,
        ],
      },
      {
        phaseNumber: 3,
        title: `Production Optimization & Architecture Modernization`,
        duration: "Weeks 5 - 6",
        learningObjectives: [
          "Perform load testing, bottleneck elimination, and database indexing",
          "Lead technical reviews and mentor peer developers",
        ],
        topics: [
          "Profiling CPU usage, latency metrics, and database query optimization",
          "Observability: OpenTelemetry metrics, tracing, and log aggregation",
          "System scalability, horizontal scaling strategies, and failover",
        ],
        practicalExercises: [
          "Execute k6 or Apache Bench load test and optimize response times by >40%",
          "Implement distributed tracing across microservices",
        ],
        codingQuestions: [
          `Design a custom connection pool manager with dynamic scaling in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Enterprise-Grade Distributed Analytics & Logging Engine in ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Achieves production-grade throughput and sub-100ms latency",
          "Complete documentation and peer code review readiness",
        ],
        recommendedResources: [
          `System Design Primer & Performance Tuning Case Studies`,
        ],
      },
    ];
  } else {
    // Intermediate
    phases = [
      {
        phaseNumber: 1,
        title: `Intermediate Concepts & Architecture Patterns in ${targetSkill}`,
        duration: "Weeks 1 - 2",
        learningObjectives: [
          `Solidify core intermediate architectural concepts in ${targetSkill}`,
          "Master state management, async execution, and error boundaries",
        ],
        topics: [
          `Advanced scope, closures, interfaces, and state patterns in ${targetSkill}`,
          "Asynchronous event flow, reactive patterns, and data pipelines",
          "Modular software architecture and directory conventions",
        ],
        practicalExercises: [
          "Implement robust state management without global variable pollution",
          "Build a custom error-handling middleware layer",
        ],
        codingQuestions: [
          `Write a resilient data fetcher with caching and cancellation support in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Interactive Dashboard / Analytics Component in ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Demonstrates clean separation of presentation and business logic",
          "Passes all intermediate unit test suites",
        ],
        recommendedResources: [
          `Intermediate Architectural Guides for ${targetSkill}`,
        ],
      },
      {
        phaseNumber: 2,
        title: `API Integration, Security & Performance`,
        duration: "Weeks 3 - 4",
        learningObjectives: [
          "Connect frontend/services to REST or GraphQL backends",
          "Optimize rendering and data fetch cycles for fast loading",
        ],
        topics: [
          "RESTful standards, authentication flow (JWT/OAuth), and CORS",
          "Performance profiling, bundle size optimization, and memoization",
          "Database integration and ORM/ODM query optimization",
        ],
        practicalExercises: [
          "Implement authenticated API routes with token refresh logic",
          "Audit network requests and remove redundant re-renders or queries",
        ],
        codingQuestions: [
          `Implement a debounce and throttle utility for user input events in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Full-Stack Collaborative Peer Platform Module using ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Secure user data flow with valid token authorization",
          "Zero unhandled promise rejections or memory leaks",
        ],
        recommendedResources: [
          `Web Security Best Practices & Performance Optimization Docs`,
        ],
      },
      {
        phaseNumber: 3,
        title: `Testing, Deployment & Production Readiness`,
        duration: "Weeks 5 - 6",
        learningObjectives: [
          "Achieve >80% test coverage with Jest/PyTest/native runner",
          "Deploy application to cloud platforms with CI automation",
        ],
        topics: [
          "Unit, integration, and end-to-end testing strategies",
          "Continuous Integration workflows (GitHub Actions)",
          "Production deployment platforms (Vercel, Render, AWS, Docker)",
        ],
        practicalExercises: [
          "Set up automated GitHub Actions test pipeline",
          "Deploy live working project and configure custom domain/HTTPS",
        ],
        codingQuestions: [
          `Write a suite of unit tests verifying edge cases and error responses in ${targetSkill}`,
        ],
        suggestedProjects: [
          `Production-Grade Capstone Platform with Live Deployment in ${targetSkill}`,
        ],
        checkpointCriteria: [
          "Live URL accessible with full functionality verified",
          "Comprehensive README documenting setup, features, and test coverage",
        ],
        recommendedResources: [
          `CI/CD Automation & Deployment Step-by-Step Manuals`,
        ],
      },
    ];
  }

  const capstoneProject = {
    title: `Real-World ${targetSkill} Production Capstone`,
    description: `A comprehensive end-to-end project integrating all concepts learned across phases.${goalContext}${priorContext}`,
    deliverables: [
      "Modular, well-documented source code repository with clear installation guide",
      "Suite of unit and integration tests passing in automated environment",
      "Live deployed application or demo ready for SkillSetu peer evaluation",
    ],
  };

  return {
    title: `${levelTitle} for ${targetSkill}`,
    summary: `A structured ${currentLevel}-level curriculum tailored for ${targetSkill}, budgeted for ${studyTime} per week.${goalContext}${priorContext}`,
    phases,
    capstoneProject,
    revisionPlan: [
      "Review core concepts at the end of each phase before advancing",
      "Spend 15 minutes daily doing active recall on key terms and syntax",
      "Conduct a peer review exchange on SkillSetu upon completing each phase project",
    ],
    selfAssessmentChecklist: [
      "I can explain core architectural decisions made in my phase projects",
      "I can debug runtime exceptions using debugger tools and log traces",
      "I can write clean, modular, and tested code following community standards",
    ],
    nextRecommendedStep: `Schedule a peer teaching session on SkillSetu to explain ${targetSkill} concepts and gain feedback on your capstone project!`,
    finalMilestone: `Demonstrate your capstone project live and host a peer exchange session on SkillSetu for ${targetSkill}.`,
  };
};

/**
 * Generate a personalized learning roadmap using Gemini LLM.
 *
 * @param {object} params
 * @param {string} params.targetSkill
 * @param {string} params.currentLevel - 'beginner' | 'intermediate' | 'advanced'
 * @param {string} params.studyTime
 * @param {string} [params.learningGoal]
 * @param {string} [params.existingKnowledge]
 * @returns {Promise<object>} Structured roadmap object
 */
const generateRoadmap = async ({
  targetSkill,
  currentLevel = "beginner",
  studyTime = "5 hours/week",
  learningGoal = "",
  existingKnowledge = "",
}) => {
  if (!targetSkill || typeof targetSkill !== "string" || !targetSkill.trim()) {
    throw new Error("Target skill is required");
  }

  const validLevel = ["beginner", "intermediate", "advanced"].includes(
    currentLevel?.toLowerCase()
  )
    ? currentLevel.toLowerCase()
    : "beginner";

  const cleanTime = String(studyTime || "5 hours/week").trim();
  const cleanGoal = String(learningGoal || "").trim();
  const cleanPrior = String(existingKnowledge || "").trim();

  const prompt = `You are a Senior Software Architect and Master Curriculum Director.
Your task is to generate a highly personalized, deeply structured learning roadmap for a student on the SkillSetu peer skill exchange platform.

USER PROFILE & CONSTRAINTS:
- Target Skill to Learn: "${targetSkill.trim()}"
- Current Experience Level: "${validLevel.toUpperCase()}" (Crucial: Adapt topic depth, prerequisites, and exercise difficulty strictly for a ${validLevel})
- Available Study Time: "${cleanTime}" (Crucial: Structure realistic duration estimates matching this weekly commitment)
${cleanGoal ? `- Specific Target Goal: "${cleanGoal}"` : ""}
${cleanPrior ? `- Existing Knowledge / Known Skills: "${cleanPrior}" (Do NOT waste time on concepts the user already knows! Use them as a launchpad)` : ""}

REQUIREMENTS:
1. Construct 3 to 4 logical, sequential learning phases ordered strictly by prerequisite dependency.
2. Adapt difficulty strictly for the specified experience level:
   - BEGINNER: Focus on core syntax, mental models, basic tooling, guided step-by-step exercises, and foundational projects.
   - INTERMEDIATE: Skip basic syntax. Focus on architecture, async patterns, state management, security, testing, and production-grade REST/GraphQL integration.
   - ADVANCED: Focus on runtime engine internals, memory profiling, high-throughput concurrency, microservices, system design, CI/CD, and scalability.
3. For EACH phase, supply:
   - phaseNumber (1, 2, 3, 4)
   - title (descriptive, action-oriented)
   - duration (realistic time estimate based on available study hours, e.g. "Weeks 1-2 (10 hrs total)")
   - learningObjectives (array of 2-3 explicit learning outcomes)
   - topics (array of 3-5 specific subtopics and concepts ordered logically)
   - practicalExercises (array of 2-3 hands-on coding exercises)
   - codingQuestions (array of 1-2 realistic interview/coding challenge questions to solve)
   - suggestedProjects (array of 1-2 actionable projects)
   - checkpointCriteria (array of 2-3 specific self-readiness tests before advancing)
   - recommendedResources (array of 2-3 real, reputable documentation topics/guides to search, NO broken URLs)
4. Supply a comprehensive Capstone Project block (title, description, array of deliverables).
5. Supply revisionPlan (array of 3 practical revision strategies), selfAssessmentChecklist (array of 3 readiness check items), nextRecommendedStep, and finalMilestone.
6. Return ONLY valid JSON matching this exact structure with NO conversational preambles or markdown markdown text outside JSON:

{
  "title": "Structured ${validLevel.charAt(0).toUpperCase() + validLevel.slice(1)} Mastery Path for ${targetSkill.trim()}",
  "summary": "Concise 2-sentence summary explaining how this roadmap achieves the user's target goal within their available study time.",
  "phases": [
    {
      "phaseNumber": 1,
      "title": "Phase title",
      "duration": "Weeks 1-2",
      "learningObjectives": ["Objective 1", "Objective 2"],
      "topics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"],
      "practicalExercises": ["Exercise 1", "Exercise 2"],
      "codingQuestions": ["Question 1"],
      "suggestedProjects": ["Mini Project 1"],
      "checkpointCriteria": ["Checkpoint 1", "Checkpoint 2"],
      "recommendedResources": ["Resource 1", "Resource 2"]
    }
  ],
  "capstoneProject": {
    "title": "Capstone Title",
    "description": "Comprehensive project description combining all phase skills.",
    "deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"]
  },
  "revisionPlan": ["Revision item 1", "Revision item 2"],
  "selfAssessmentChecklist": ["Checklist item 1", "Checklist item 2"],
  "nextRecommendedStep": "Next recommended step after finishing the roadmap",
  "finalMilestone": "Clear milestone or capstone project demonstrating readiness for peer teaching on SkillSetu."
}`;

  try {
    const rawResponse = await generateText(prompt, {
      maxOutputTokens: 4096,
      temperature: 0.4,
      timeout: 15000,
    });

    return parseRoadmapJSON(rawResponse);
  } catch (err) {
    console.warn(
      `[roadmapService] AI generation failed (${err.message}). Using structured fallback.`
    );
    // Use fallback roadmap so users are not blocked
    return generateFallbackRoadmap(
      targetSkill,
      validLevel,
      cleanTime,
      cleanGoal,
      cleanPrior
    );
  }
};

module.exports = {
  generateRoadmap,
  parseRoadmapJSON,
  generateFallbackRoadmap,
};
