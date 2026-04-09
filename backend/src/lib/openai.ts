import { OpenAI } from "openai";

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes("your-key")) {
      throw new Error("Missing OPENAI_API_KEY — update your .env file");
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}
