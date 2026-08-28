const apiKey = process.env.OPENROUTER_API_KEY

if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set. Run the app with --env-file .env or configure the environment variable.')
}

export type ModelConfig = {
    apiKey: string;
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
    apiKey,
    httpReferer: '',
    appTitle: 'Answering questions with an LLM',
    port: Number(process.env.PORT) || 3001,
    models: [
        "cohere/north-mini-code:free",
    ],
    temperature: 0.4,
    maxTokens: 300,
    systemPrompt: 'You are a helpful assistant.',
    provider: {
        sort: {
            by: 'throughput',
            // by: 'latency',
            // by: 'price',
            partition: 'none'
        }
    }
}