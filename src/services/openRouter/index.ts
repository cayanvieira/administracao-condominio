import { OpenRouter } from "@openrouter/sdk";
import { config, type ModelConfig } from "./config.ts";

import { z } from "zod";

export type LLMResponse = {
  model: string;
  content: string | JSON | Record<string, unknown> | any;
};

export function parseJsonResponse(rawContent: string | null | undefined): Record<string, unknown> {
  if (typeof rawContent !== "string") {
    return {};
  }

  const trimmed = rawContent.trim();

  if (!trimmed) {
    return {};
  }

  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const firstBrace = withoutCodeFence.indexOf("{");
  const lastBrace = withoutCodeFence.lastIndexOf("}");
  const candidate =
    firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? withoutCodeFence.slice(firstBrace, lastBrace + 1)
      : withoutCodeFence;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export class OpenRouterService {
  private client: OpenRouter;
  private config: ModelConfig;
  constructor(configOverride?: ModelConfig) {
    this.config = configOverride ?? config;

    this.client = new OpenRouter({
      apiKey: config.openRouterApiKey,
      httpReferer: config.httpReferer,
    });
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodTypeAny,
    stepName: string,
  ): Promise<LLMResponse> {
    const jsonSchema = z.toJSONSchema(schema);

    const response = await this.client.chat.send({
      chatRequest: {
        models: this.config.models,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,

        responseFormat: {
          type: "json_schema",
          jsonSchema: {
            name: "intent_response",
            strict: true,
            schema: jsonSchema,
          },
        },
      },
    });
    if ("choices" in response) {
      const choice = response.choices[0];

      if (choice.finishReason === "length") {
        throw new Error(
          "The response exceeded the token limit before generating the content.",
        );
      }
      const rawContent = response.choices.at(0)?.message.content;
      const parsedContent = parseJsonResponse(rawContent);

      if(stepName === "identifyIntentNode") {
        return {
          model: response.model,
          content: parsedContent?.intent ? parsedContent : { intent: "unknown" },
        };
      }
      if(stepName === "messageGeneratorNode") {
        return {
          model: response.model,
          content: parsedContent
        };
      }

      throw new Error(`Unsupported step name: ${stepName}`);
    } else {
      throw new Error("Invalid response from OpenRouter API");
    }
  }
}
