import type { Sendungen } from './app';

export type EnrichedSendungen = Sendungen & {
  senderName: string;
};
