import { NextResponse } from "next/server";

const CAMPUS_WEATHER = {
  name: "LCUP Malolos",
  latitude: 14.8527,
  longitude: 120.816,
  timezone: "Asia/Manila",
};

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function GET() {
  const params = new URLSearchParams({
    latitude: String(CAMPUS_WEATHER.latitude),
    longitude: String(CAMPUS_WEATHER.longitude),
    timezone: CAMPUS_WEATHER.timezone,
    forecast_days: "16",
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
    ].join(","),
  });

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`, {
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Weather forecast is unavailable." },
      { status: 502 },
    );
  }

  const payload = await response.json();
  const daily = payload.daily || {};
  const dates: string[] = daily.time || [];

  return NextResponse.json({
    source: "Open-Meteo",
    location: CAMPUS_WEATHER.name,
    timezone: payload.timezone || CAMPUS_WEATHER.timezone,
    days: dates.map((date, index) => ({
      date,
      weatherCode: daily.weather_code?.[index] ?? null,
      temperatureMax: daily.temperature_2m_max?.[index] ?? null,
      temperatureMin: daily.temperature_2m_min?.[index] ?? null,
      precipitationProbability:
        daily.precipitation_probability_max?.[index] ?? null,
      precipitationSum: daily.precipitation_sum?.[index] ?? null,
    })),
  });
}
