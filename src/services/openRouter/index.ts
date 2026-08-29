import { OpenRouter } from "@openrouter/sdk";
import { config, type ModelConfig } from "./config.ts";

import z from "zod/v3";

export type LLMResponse = {
  model: string;
  content: any
};

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
  ): Promise<LLMResponse> {
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
          type: "json_object",
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
      const content = (response.choices.at(0)?.message.content) ?? "" ;
      return {
        model: response.model,
        content : typeof content === "string" ? JSON.parse(content) : {intent: "unknown"},
      };
    } else {
      throw new Error("Invalid response from OpenRouter API");
    }
  }
}
