import type { VoiceInteraction } from "../types/voice";

/**
 * Storage contract for voice interactions. The module ships an in-memory
 * implementation only. Persisting to a real backend means implementing this
 * interface and injecting it; the UI does not change.
 *
 * Only text is stored. Raw audio is never passed to a repository.
 */
export interface VoiceInteractionRepository {
  readonly id: string;
  save(interaction: VoiceInteraction): Promise<VoiceInteraction>;
  get(id: string): Promise<VoiceInteraction | null>;
  listBySession(sessionId: string): Promise<VoiceInteraction[]>;
  delete(id: string): Promise<void>;
  clearSession(sessionId: string): Promise<void>;
}
