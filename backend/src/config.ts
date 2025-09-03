import dotenv from 'dotenv';
dotenv.config();

export type Env = "dev" | "staging" | "production";

export interface Config{
    env: Env;
    databaseUrl: string;
    elevenLabApiKey: string;
    elevenLabAgentId: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string;
    calComApiKey: string;
    port: number;
    jwtSecret: string;
    jwtExpiresIn: string;
}

export const loadConfig = async (): Promise<Config> => {
    const env = process.env.ENV ?? "dev";
    const config: Config = {
        env: env as Env,
        databaseUrl: process.env.DATABASE_URL || "",
        elevenLabApiKey: process.env.ELEVENLABS_API_KEY || "",
        elevenLabAgentId: process.env.ELEVENLABS_AGENT_ID || "",
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
        calComApiKey: process.env.CALCOM_API_KEY || "",
        port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
        jwtSecret: process.env.JWT_SECRET || "",
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    };
    
    if (!config.databaseUrl) {
        throw new Error("DATABASE_URL is required");
    }

    if (!config.elevenLabApiKey) {
        throw new Error("ELEVENLABS_API_KEY is required");
    }

    if (!config.elevenLabAgentId) {
        throw new Error("ELEVENLABS_AGENT_ID is required");
    }
    if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
        throw new Error("Twilio configuration is required");
    }

    if (!config.jwtSecret) {
        throw new Error("JWT_SECRET is required");
    }

    return config;
}