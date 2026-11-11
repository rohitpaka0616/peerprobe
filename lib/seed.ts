import { DEVELOPER, type State } from "./model";
export function seed(ownerId = DEVELOPER): State {
  const now = new Date().toISOString();
  return {
    revision: 0,
    projects: [
      {
        id: "nest",
        ownerId,
        name: "Nest • Student living",
        description:
          "A little less searching. A little more feeling at home. Find your next apartment and split the rent with friends.",
      },
    ],
    builds: [
      {
        id: "nest-v1",
        projectId: "nest",
        label: "v1.0",
        url: "/demo/v1",
        createdAt: now,
      },
      {
        id: "nest-v2",
        projectId: "nest",
        label: "v1.1",
        url: "/demo/v2",
        createdAt: now,
      },
    ],
    tasks: [
      {
        id: "rent-split",
        projectId: "nest",
        buildId: "nest-v1",
        feature: "Put our rent calculator to the test",
        mode: "guided",
        goal: "Check that splitting the rent updates the cost for each roommate without changing the total.",
        context:
          "Open the Maple Court apartment. The monthly rent is $2,400 and the calculator starts with two people.",
        minutes: 5,
        device: "Desktop or mobile",
        capacity: 8,
        steps: [
          {
            instruction:
              "Find the rent calculator. Confirm it starts with two people.",
            expected:
              "Total rent is $2,400/month and each person pays $1,200/month.",
          },
          {
            instruction: "Change the number of people from two to three.",
            expected:
              "Total rent stays $2,400/month. Each person now pays $800/month.",
          },
        ],
        createdAt: now,
      },
      {
        id: "find-your-share",
        projectId: "nest",
        buildId: "nest-v2",
        feature: "Find your share of a new home",
        mode: "usability",
        goal: "You and two friends want to split this apartment equally. Use the app to find what each person would pay.",
        context:
          "You are considering the Maple Court apartment. Explore the app as you normally would. No login is needed.",
        minutes: 4,
        device: "Desktop or mobile",
        capacity: 6,
        steps: [],
        createdAt: now,
      },
    ],
    criteria: [
      {
        id: "find-your-share-criteria",
        taskId: "find-your-share",
        ownerId,
        text: "Success: independently use the rent split calculator for 3 people and report $800 per person per month.",
      },
    ],
    sessions: [],
    issues: [],
    attempts: [],
    comments: [],
    uploads: [],
  };
}
