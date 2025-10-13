export interface Language {
  code: string;
  name: string;
  flag: string;
}

export type RecordingState = 'idle' | 'connecting' | 'recording';
