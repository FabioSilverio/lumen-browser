import { AIProviderClient, ChatMessage, ProviderStreamResult } from "../types";
import { formatProviderError, ProviderRequestError, readSSEStream } from "./common";

const OPENCLAW_BASE_URL = process.env.OPENCLAW_BASE_URL?.trim() || "http://127.0.0.1:18789";

function trimTrailingSlash(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

function buildEndpointCandidates(rawBase: string): string[] {
  const base = trimTrailingSlash(rawBase);

  const candidates = new Set<string>();
  candidates.add(base);

  if (!base.endsWith("/v1/chat/completions")) {
    if (base.endsWith("/v1")) {
      candidates.add(`${base}/chat/completions`);
    }

    if (base.endsWith("/chat/completions")) {
      candidates.add(`${base.replace(/\/chat\/completions$/, "")}/v1/chat/completions`);
    } else {
      candidates.add(`${base}/v1/chat/completions`);
      candidates.add(`${base}/chat/completions`);
    }
  }

  return [...candidates];
}

function normalizeOpenClawModel(model: string): { requestModel: string; agentId?: string } {
  const value = model.trim();
  if (!value) {
    return { requestModel: "openclaw", agentId: "main" };
  }

  if (value.startsWith("openclaw:")) {
    const agentId = value.split(":")[1]?.trim() || "main";
    return { requestModel: "openclaw", agentId };
  }

  return { requestModel: value };
}

async function parseProviderError(response: Response): Promise<{ status: number; message: string }> {
  const details = await response.text();
  return {
    status: response.status,
    message: formatProviderError("OpenClaw", response.status, details)
  };
}

export class OpenClawProvider implements AIProviderClient {
  async streamChat(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options: { maxTokens?: number; temperature?: number },
    onToken: (token: string) => void,
    signal: AbortSignal
  ): Promise<ProviderStreamResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const normalizedModel = normalizeOpenClawModel(model);
    if (normalizedModel.agentId) {
      headers["x-openclaw-agent-id"] = normalizedModel.agentId;
    }

    const endpoints = buildEndpointCandidates(OPENCLAW_BASE_URL);
    let lastError: { status: number; message: string } | null = null;

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: "POST",
        signal,
        headers,
        body: JSON.stringify({
          model: normalizedModel.requestModel,
          stream: true,
          messages,
          max_tokens: options.maxTokens,
          temperature: options.temperature ?? 0.4
        })
      });

      if (!response.ok || !response.body) {
        const parsedError = await parseProviderError(response);
        lastError = parsedError;

        if (response.status === 404 || response.status === 405) {
          continue;
        }

        throw new ProviderRequestError(parsedError.message, parsedError.status);
      }

      let usage: ProviderStreamResult["usage"];

      await readSSEStream(
        response.body,
        (payload) => {
          if (payload === "[DONE]") {
            return;
          }

          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: ProviderStreamResult["usage"];
          };

          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            onToken(token);
          }

          if (parsed.usage) {
            usage = parsed.usage;
          }
        },
        signal
      );

      return { usage };
    }

    throw new ProviderRequestError(
      lastError?.message ||
        "OpenClaw request failed. Verify OPENCLAW_BASE_URL and gateway chatCompletions endpoint settings.",
      lastError?.status ?? 500
    );
  }
}
