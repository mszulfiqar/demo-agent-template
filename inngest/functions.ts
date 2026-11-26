import { inngest } from "./client";

/**
 * Infrastructure smoke test.
 * Invoke this from the Inngest Dev Server to verify that the deployed
 * Next.js endpoint can execute a durable background function.
 */
export const testBackgroundJob = inngest.createFunction(
  {
    id: "test-background-job",
    retries: 3,
    triggers: { event: "app/test.background-job" },
  },
  async ({ event, step }) => {
    const result = await step.run("process-test-event", async () => ({
      message: "Inngest is connected to the HVAC operations dashboard.",
      receivedAt: new Date().toISOString(),
      payload: event.data,
    }));

    return result;
  }
);

export const inngestFunctions = [testBackgroundJob];
