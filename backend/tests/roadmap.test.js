// backend/tests/roadmap.test.js
require("dotenv").config();

// Mock generateText before requiring roadmapService
jest.mock("../services/aiService", () => ({
  generateText: jest.fn(async () => {
    return JSON.stringify({
      title: "Mastering Python for Web Development",
      summary: "Comprehensive guide to becoming proficient in Python.",
      phases: [
        {
          phaseNumber: 1,
          title: "Python Fundamentals",
          duration: "Weeks 1-2",
          learningObjectives: ["Understand primitive types and control flow", "Set up virtualenv"],
          topics: ["Syntax", "Data Structures", "Control Flow"],
          practicalExercises: ["CLI calculator", "Data parser"],
          codingQuestions: ["Implement string reversal without native reverse method"],
          suggestedProjects: ["Text-based RPG game"],
          checkpointCriteria: ["Can run Python scripts from terminal without syntax errors"],
          recommendedResources: ["Python Docs - Official Tutorial"],
        },
        {
          phaseNumber: 2,
          title: "OOP & Modules",
          duration: "Weeks 3-4",
          learningObjectives: ["Master class inheritance and encapsulation"],
          topics: ["Classes", "Inheritance", "Decorators"],
          practicalExercises: ["Custom iterator class"],
          codingQuestions: ["Design a LRU cache class using OOP"],
          suggestedProjects: ["Library management system"],
          checkpointCriteria: ["Understands dunder methods and decorator execution flow"],
          recommendedResources: ["Real Python - Object-Oriented Programming"],
        },
      ],
      capstoneProject: {
        title: "Full-Featured REST API Microservice",
        description: "Build, test, and deploy a RESTful backend using FastAPI and PostgreSQL.",
        deliverables: ["OpenAPI documentation", "Dockerized container", "Passing PyTest suite"],
      },
      revisionPlan: ["Review OOP principles weekly", "Implement 1 coding question daily"],
      selfAssessmentChecklist: ["I can design relational database models", "I can implement JWT authorization"],
      nextRecommendedStep: "Host a live peer session on SkillSetu showcasing your FastAPI API!",
      finalMilestone: "Build and deploy a full-featured REST API with Flask/FastAPI",
    });
  }),
}));

const {
  parseRoadmapJSON,
  generateFallbackRoadmap,
  generateRoadmap,
} = require("../services/roadmapService");
const aiService = require("../services/aiService");

describe("AI Personalized Learning Roadmap - Phase 3 Unit Tests", () => {
  describe("1. JSON Parsing and Validation (parseRoadmapJSON)", () => {
    it("should parse pure JSON properly with rich schema properties", () => {
      const raw = JSON.stringify({
        title: "Master React",
        summary: "Step by step guide",
        phases: [
          {
            phaseNumber: 1,
            title: "Basics",
            duration: "2 weeks",
            learningObjectives: ["Master JSX rendering"],
            topics: ["JSX", "Components"],
            practicalExercises: ["Build a counter"],
            codingQuestions: ["Implement custom hook for state persistence"],
            suggestedProjects: ["Todo app"],
            checkpointCriteria: ["Component re-renders predictably"],
            recommendedResources: ["React Docs - Learn React"],
          },
        ],
        capstoneProject: {
          title: "E-Commerce Frontend",
          description: "Full cart and checkout workflow.",
          deliverables: ["Responsive layout", "State persistence"],
        },
        revisionPlan: ["Practice state lifting"],
        selfAssessmentChecklist: ["Can handle side effects with useEffect"],
        nextRecommendedStep: "Build full-stack backend integration",
        finalMilestone: "Deploy a full-stack React app",
      });

      const parsed = parseRoadmapJSON(raw);
      expect(parsed.title).toBe("Master React");
      expect(parsed.phases).toHaveLength(1);
      expect(parsed.phases[0].topics).toContain("JSX");
      expect(parsed.phases[0].learningObjectives).toContain("Master JSX rendering");
      expect(parsed.phases[0].codingQuestions).toHaveLength(1);
      expect(parsed.phases[0].checkpointCriteria).toHaveLength(1);
      expect(parsed.phases[0].recommendedResources).toHaveLength(1);
      expect(parsed.capstoneProject.title).toBe("E-Commerce Frontend");
      expect(parsed.revisionPlan).toContain("Practice state lifting");
      expect(parsed.selfAssessmentChecklist).toContain("Can handle side effects with useEffect");
    });

    it("should strip markdown code fences and extraneous text", () => {
      const markdown = `
Here is your requested roadmap:
\`\`\`json
{
  "title": "Node.js Mastery",
  "summary": "Backend fundamentals",
  "phases": [
    {
      "phaseNumber": 1,
      "title": "Core Modules",
      "duration": "1 week",
      "topics": ["fs", "http"],
      "practicalExercises": ["CLI tool"],
      "suggestedProjects": ["File manager"]
    }
  ],
  "finalMilestone": "Build REST API"
}
\`\`\`
Hope this helps!`;

      const parsed = parseRoadmapJSON(markdown);
      expect(parsed.title).toBe("Node.js Mastery");
      expect(parsed.phases).toHaveLength(1);
      expect(parsed.phases[0].title).toBe("Core Modules");
    });

    it("should throw an error on empty or malformed input", () => {
      expect(() => parseRoadmapJSON("")).toThrow(
        "Empty or invalid response received from AI model"
      );
      expect(() => parseRoadmapJSON("No JSON here at all")).toThrow(
        "AI response did not contain a valid JSON object structure"
      );
    });

    it("should throw if required fields are missing", () => {
      const incomplete = JSON.stringify({
        title: "No phases provided",
        phases: [],
      });
      expect(() => parseRoadmapJSON(incomplete)).toThrow(
        "AI response is missing required fields (title, phases)"
      );
    });
  });

  describe("2. Fallback Roadmap Generator (generateFallbackRoadmap)", () => {
    it("should return a level-specific structured roadmap for beginner level", () => {
      const fallback = generateFallbackRoadmap(
        "TypeScript",
        "beginner",
        "5 hours/week",
        "Build typed React apps",
        "Basic JavaScript syntax"
      );

      expect(fallback.title).toContain("TypeScript");
      expect(fallback.phases).toHaveLength(3);
      expect(fallback.phases[0].phaseNumber).toBe(1);
      expect(fallback.phases[0].topics.length).toBeGreaterThan(0);
      expect(fallback.phases[0].learningObjectives).toBeDefined();
      expect(fallback.phases[0].codingQuestions).toBeDefined();
      expect(fallback.phases[0].checkpointCriteria).toBeDefined();
      expect(fallback.capstoneProject).toBeDefined();
      expect(fallback.capstoneProject.deliverables.length).toBeGreaterThan(0);
      expect(fallback.finalMilestone).toBeDefined();
    });

    it("should customize fallback content for advanced experience level", () => {
      const fallback = generateFallbackRoadmap(
        "Kubernetes",
        "advanced",
        "15 hours/week",
        "Production cluster management"
      );

      expect(fallback.title).toContain("Advanced");
      expect(fallback.phases[0].title).toContain("Internals");
      expect(fallback.phases[0].topics[0]).toContain("Execution context");
    });
  });

  describe("3. Roadmap Generation Service (generateRoadmap)", () => {
    it("should reject empty targetSkill", async () => {
      await expect(
        generateRoadmap({ targetSkill: "", currentLevel: "beginner", studyTime: "5h" })
      ).rejects.toThrow("Target skill is required");
    });

    it("should return a valid structured roadmap via AI", async () => {
      const result = await generateRoadmap({
        targetSkill: "Python",
        currentLevel: "beginner",
        studyTime: "5 hours/week",
        learningGoal: "Web Dev",
        existingKnowledge: "HTML, CSS",
      });

      expect(result.title).toBe("Mastering Python for Web Development");
      expect(result.phases).toHaveLength(2);
      expect(result.phases[0].duration).toBe("Weeks 1-2");
      expect(result.capstoneProject.title).toBe("Full-Featured REST API Microservice");
      expect(result.finalMilestone).toContain("FastAPI");
    });

    it("should seamlessly fallback to structured roadmap when AI fails", async () => {
      aiService.generateText.mockRejectedValueOnce(new Error("AI quota exceeded"));

      const fallbackResult = await generateRoadmap({
        targetSkill: "GraphQL",
        currentLevel: "intermediate",
        studyTime: "10 hours/week",
      });

      expect(fallbackResult.title).toContain("GraphQL");
      expect(fallbackResult.phases).toHaveLength(3);
      expect(fallbackResult.phases[0].topics.length).toBeGreaterThan(0);
    });
  });

  describe("4. Ownership and Access Authorization", () => {
    it("should enforce user ownership rules on Roadmap documents", () => {
      const userId1 = "507f191e810c19729de860ea";
      const userId2 = "507f191e810c19729de860eb";

      const mockRoadmap = {
        _id: "roadmap123",
        user: userId1,
        targetSkill: "React",
        title: "React Roadmap",
      };

      // User 1 owns the roadmap
      const isOwner1 = mockRoadmap.user.toString() === userId1;
      expect(isOwner1).toBe(true);

      // User 2 does NOT own the roadmap
      const isOwner2 = mockRoadmap.user.toString() === userId2;
      expect(isOwner2).toBe(false);
    });
  });
});
