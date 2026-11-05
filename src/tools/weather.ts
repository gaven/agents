import { Type } from "@earendil-works/pi-ai";
import { defineExtension, type ToolRegistration } from "@earendil-works/pi-durable";

const WEATHER_CONDITIONS = ["sunny", "partly cloudy", "overcast", "light rain"] as const;

export const getWeatherTool = {
  name: "get_weather",
  description: "Get the current weather for a location. Use when the user asks about the weather.",
  parameters: Type.Object({
    location: Type.String({ description: "The city or location to check weather for" }),
  }),
  replay: "safe",
  execute: async ({ location }: { location: string }) => {
    const condition = WEATHER_CONDITIONS[Math.floor(Math.random() * WEATHER_CONDITIONS.length)];
    const temperature = Math.floor(55 + Math.random() * 35);
    const weather = {
      location,
      temperature: `${temperature}°F`,
      condition,
      note: "Mock data; connect a weather MCP server for real forecasts.",
    };
    return {
      output: [{ type: "text" as const, text: JSON.stringify(weather) }],
      details: weather,
    };
  },
} satisfies ToolRegistration;

export const weatherExtension = defineExtension({
  name: "weather",
  tools: [getWeatherTool],
});
