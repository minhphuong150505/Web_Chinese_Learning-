export type Direction = 'VI_TO_ZH' | 'ZH_TO_VI' | 'VI_TO_EN' | 'EN_TO_VI';

export interface TranslationRequest {
  text: string;
  direction: Direction;
}

export interface TranslationResponse {
  translation: string;
}
