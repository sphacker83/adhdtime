export type SttEngine = "speech-recognition" | "webkit-speech-recognition" | "unsupported";

export interface SttCapability {
  supported: boolean;
  secureContext: boolean;
  engine: SttEngine;
  canStartRecognition: boolean;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getSpeechRecognitionConstructor(): {
  engine: SttEngine;
  constructorRef: SpeechRecognitionConstructor | null;
} {
  if (typeof window === "undefined") {
    return {
      engine: "unsupported",
      constructorRef: null
    };
  }

  const sttWindow = window as SpeechRecognitionWindow;

  if (typeof sttWindow.SpeechRecognition === "function") {
    return {
      engine: "speech-recognition",
      constructorRef: sttWindow.SpeechRecognition
    };
  }

  if (typeof sttWindow.webkitSpeechRecognition === "function") {
    return {
      engine: "webkit-speech-recognition",
      constructorRef: sttWindow.webkitSpeechRecognition
    };
  }

  return {
    engine: "unsupported",
    constructorRef: null
  };
}

export function getSttCapability(): SttCapability {
  if (typeof window === "undefined") {
    return {
      supported: false,
      secureContext: false,
      engine: "unsupported",
      canStartRecognition: false
    };
  }

  const secureContext = Boolean(window.isSecureContext);
  const { engine, constructorRef } = getSpeechRecognitionConstructor();
  const supported = Boolean(constructorRef);

  return {
    supported,
    secureContext,
    engine,
    canStartRecognition: supported && secureContext
  };
}

export function createSttRecognition(preferredLanguage = "ko-KR"): SpeechRecognitionLike | null {
  const capability = getSttCapability();
  if (!capability.canStartRecognition) {
    return null;
  }

  const { constructorRef } = getSpeechRecognitionConstructor();
  if (!constructorRef) {
    return null;
  }

  const recognition = new constructorRef();
  recognition.lang = preferredLanguage;
  recognition.continuous = false;
  recognition.interimResults = true;

  return recognition;
}
