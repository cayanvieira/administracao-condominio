const openRouterApiKey = process.env.OPENROUTER_API_KEY



if (!openRouterApiKey) {
    throw new Error('One or more required API keys are not set. Run the app with --env-file .env or configure the environment variable.')
}


export type ModelConfig = {
    openRouterApiKey: string;
    httpReferer: string,
    port: number;
    models: string[];
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    appTitle: string;
    provider: {
        sort: {
            by: string,
            partition: string,
        }
    }
}

export const config: ModelConfig = {
    openRouterApiKey,
    httpReferer: '',
    appTitle: 'Answering questions with an LLM',
    port: Number(process.env.PORT) || 3001,
    models: [
        "cohere/north-mini-code:free",
    ],
    temperature: 0.4,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful assistant.',
    provider: {
        sort: {
            by: 'throughput',
            // by: 'latency',
            // by: 'price',
            partition: 'none'
        }
    },
    
}