import { VoiceError } from "../errors/VoiceError";
import type { VoiceInteraction } from "../types/voice";
import type { VoiceInteractionRepository } from "./VoiceInteractionRepository";

/**
 * In-memory repository. Data lives only in this JavaScript object: it is not
 * written to localStorage, IndexedDB or the network, and disappears when the
 * page is closed.
 */
export class MockVoiceInteractionRepository implements VoiceInteractionRepository {
  readonly id = "mock-memory-repository";

  /** Flip to true to simulate a storage outage. */
  failSaves = false;

  private readonly items = new Map<string, VoiceInteraction>();

  async save(interaction: VoiceInteraction): Promise<VoiceInteraction> {
    if (this.failSaves) throw new VoiceError("STORAGE_FAILED", "Simulated storage failure");
    const stored = structuredCloneSafe(interaction);
    this.items.set(stored.id, stored);
    return structuredCloneSafe(stored);
  }

  async get(id: string): Promise<VoiceInteraction | null> {
    const found = this.items.get(id);
    return found ? structuredCloneSafe(found) : null;
  }

  async listBySession(sessionId: string): Promise<VoiceInteraction[]> {
    return [...this.items.values()]
      .filter((item) => item.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(structuredCloneSafe);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async clearSession(sessionId: string): Promise<void> {
    for (const [id, item] of this.items) {
      if (item.sessionId === sessionId) this.items.delete(id);
    }
  }
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
