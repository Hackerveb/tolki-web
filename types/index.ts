export interface Language {
  code: string;
  name: string;
  flag: string;
  deepgramSupport?: boolean;
}

export type RecordingState = 'idle' | 'connecting' | 'recording';
