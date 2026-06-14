import { randomUUID } from "crypto";
import type { Session, Message } from "../types/index.js";

const sessions = new Map<string, Session>();

export function createSession(): Session {
  const s: Session = { id: randomUUID(), messages: [], createdAt: new Date() };
  sessions.set(s.id, s);
  return s;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function addMessage(sessionId: string, message: Message): void {
  const s = sessions.get(sessionId);
  if (s) s.messages.push(message);
}

export function replaceMessages(sessionId: string, messages: Message[]): void {
  const s = sessions.get(sessionId);
  if (s) s.messages = messages;
}

export function clearSession(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (s) s.messages = [];
}
