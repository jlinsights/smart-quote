import { QuoteInput, QuoteResult } from "@/types";

// @ts-expect-error
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class QuoteApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'QuoteApiError';
  }
}

export const fetchQuote = async (input: QuoteInput): Promise<QuoteResult> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/quotes/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new QuoteApiError(response.status, `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as QuoteResult;
  } catch (error) {
    console.error("Failed to fetch quote:", error);
    throw error;
  }
};
