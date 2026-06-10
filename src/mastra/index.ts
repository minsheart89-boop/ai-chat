import { Mastra } from "@mastra/core/mastra";
import { gameAgent } from "@/mastra/agents/gameAgent";

export const mastra = new Mastra({
  agents: { gameAgent },
});
