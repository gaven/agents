import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import {
  configure,
  createRegistry,
  defineExtension,
  section,
  type HarnessOptions,
} from "@earendil-works/pi-durable";
import { scheduleExtension } from "./tools/schedule/extension.ts";
import { conversationSearchExtension, historySearchExtension } from "./tools/search.ts";
import { weatherExtension } from "./tools/weather.ts";

const models = createModels();
models.setProvider(openrouterProvider());

/** Application-owned, platform-independent agent composition. */
export function createChatHarnessOptions(): HarnessOptions {
  const promptExtension = defineExtension({
    name: "chat",
    sections: [
      section(
        "preamble",
        () =>
          "You are a concise assistant. User messages may begin with a display name in brackets; treat it as speaker attribution.",
        { tag: false },
      ),
      section(
        "clock",
        // Minute precision: finer values would append a system-prompt delta on every request.
        () => `Current time: ${new Date().toISOString().slice(0, 16)}Z.`,
        { tag: false },
      ),
    ],
  });
  // Selected by default. `conversationSearchExtension` is installed but left out, so only search subagents get it.
  const extensions = [promptExtension, weatherExtension, scheduleExtension, historySearchExtension];
  const registry = createRegistry();
  for (const extension of extensions) registry.install(extension);
  registry.install(conversationSearchExtension);
  const defaultAgent = {
    model: { provider: "openrouter", modelId: "deepseek/deepseek-v4.1-flash-1017" },
    thinkingLevel: "off" as const,
  };

  return {
    models,
    registry,
    settings: { extensions },
    conversationCreated: (tx, conversation) =>
      conversation.owner === undefined && conversation.parent === undefined
        ? configure(tx, conversation.id, defaultAgent)
        : undefined,
  };
}
