import { describe, it, expect } from "vitest";
import { AiAdapter, NullAiProvider, defaultAiAdapter } from "../services/aiAdapter.js";

describe("aiAdapter — provider-agnostic, safe-by-default", () => {
  it("the default export uses NullAiProvider and always resolves to null", async () => {
    expect(await defaultAiAdapter.classifySymptom("chest pain")).toBeNull();
    expect(await defaultAiAdapter.summarizeForReview({})).toBeNull();
  });

  it("NullAiProvider alone behaves identically", async () => {
    const provider = new NullAiProvider();
    expect(await provider.classifySymptom("x")).toBeNull();
    expect(await provider.summarizeForReview({})).toBeNull();
  });

  it("returns null (never throws) when the provider throws", async () => {
    const adapter = new AiAdapter({
      classifySymptom: async () => {
        throw new Error("provider exploded");
      },
      summarizeForReview: async () => null,
    });
    await expect(adapter.classifySymptom("x")).resolves.toBeNull();
  });

  it("returns null when the provider times out", async () => {
    const adapter = new AiAdapter({
      classifySymptom: () => new Promise(() => {}), // never resolves
      summarizeForReview: async () => null,
    });
    const result = await adapter.classifySymptom("x");
    expect(result).toBeNull();
  }, 6000);

  it("rejects a malformed classifySymptom response (missing category)", async () => {
    const adapter = new AiAdapter({
      classifySymptom: async () => ({ notCategory: "oops" }),
      summarizeForReview: async () => null,
    });
    expect(await adapter.classifySymptom("x")).toBeNull();
  });

  it("strips a summarizeForReview response that smuggles a diagnosis/treatment claim", async () => {
    const adapter = new AiAdapter({
      classifySymptom: async () => null,
      summarizeForReview: async () => "Patient likely has a diagnosis of angina; recommend treatment with nitrates.",
    });
    expect(await adapter.summarizeForReview({})).toBeNull();
  });

  it("passes through a safe, well-formed summary", async () => {
    const adapter = new AiAdapter({
      classifySymptom: async () => null,
      summarizeForReview: async () => "Patient reports chest pain for two days, worse with exertion.",
    });
    expect(await adapter.summarizeForReview({})).toContain("chest pain");
  });
});
