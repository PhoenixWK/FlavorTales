// FR-UM-011: Anonymous tourist session types.
// No personally-identifiable information; sessionId is a random UUID.

export interface TouristSessionData {
  sessionId: string;
  languagePreference: string;
  viewedPoiIds: number[];
  playedAudioIds: number[];
  createdAt: string;
  expiresAt: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  expiresAt: string;
}

export interface UpdateSessionRequest {
  languagePreference?: string;
  viewedPoiIds?: number[];
  playedAudioIds?: number[];
}
