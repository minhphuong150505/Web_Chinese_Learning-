import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  readonly results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionOptions {
  onTranscript: (transcript: string) => void;
}

export function useSpeechRecognition({ onTranscript }: SpeechRecognitionOptions) {
  const { text } = useLanguage();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!window.isSecureContext) {
      setError(
        text(
          'Micro chỉ hoạt động qua HTTPS. Hãy mở trang bằng địa chỉ https:// rồi thử lại.',
          'The microphone only works over HTTPS. Open the site using https:// and try again.',
        ),
      );
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError(
        text(
          'Nhập bằng giọng nói cần Chrome hoặc Edge.',
          'Voice input requires Chrome or Edge.',
        ),
      );
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? '';
      }
      onTranscriptRef.current(transcript.trim());
    };
    recognition.onerror = (event) => {
      const message =
        event.error === 'not-allowed'
          ? text(
              'Chrome đang chặn quyền micro. Hãy cho phép Microphone trong cài đặt trang.',
              'Chrome is blocking microphone access. Allow Microphone in the site settings.',
            )
          : event.error === 'no-speech'
            ? text(
                'Không phát hiện giọng nói. Vui lòng thử lại.',
                'No speech was detected. Please try again.',
              )
            : text(
                'Không thể bắt đầu nhập bằng giọng nói. Vui lòng thử lại.',
                'Could not start voice input. Please try again.',
              );
      setError(message);
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch {
      setError(
        text(
          'Không thể bắt đầu nhập bằng giọng nói. Vui lòng thử lại.',
          'Could not start voice input. Please try again.',
        ),
      );
      setIsListening(false);
    }
  }, [text]);

  return { supported, isListening, error, start, stop, cancel };
}
