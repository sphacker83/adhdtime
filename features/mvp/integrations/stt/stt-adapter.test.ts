import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSttRecognition,
  getSttCapability,
  type SpeechRecognitionLike
} from "./stt-adapter";

class MockSpeechRecognition implements SpeechRecognitionLike {
  lang = "";
  continuous = true;
  interimResults = false;
  start = vi.fn();
  stop = vi.fn();
  onresult = null;
  onerror = null;
  onend = null;
}

function stubWindow(params: {
  secureContext: boolean;
  speechRecognition?: typeof MockSpeechRecognition;
  webkitSpeechRecognition?: typeof MockSpeechRecognition;
}) {
  const windowStub = {
    isSecureContext: params.secureContext,
    ...(params.speechRecognition ? { SpeechRecognition: params.speechRecognition } : {}),
    ...(params.webkitSpeechRecognition ? { webkitSpeechRecognition: params.webkitSpeechRecognition } : {})
  } as unknown as Window;

  vi.stubGlobal("window", windowStub);
}

describe("stt-adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns unsupported capability when STT constructors are missing", () => {
    const capability = getSttCapability();

    expect(capability).toEqual({
      supported: false,
      secureContext: false,
      engine: "unsupported",
      canStartRecognition: false
    });
  });

  it("detects SpeechRecognition support in secure context", () => {
    stubWindow({
      secureContext: true,
      speechRecognition: MockSpeechRecognition
    });

    const capability = getSttCapability();

    expect(capability).toEqual({
      supported: true,
      secureContext: true,
      engine: "speech-recognition",
      canStartRecognition: true
    });
  });

  it("falls back to webkitSpeechRecognition engine", () => {
    stubWindow({
      secureContext: true,
      webkitSpeechRecognition: MockSpeechRecognition
    });

    const capability = getSttCapability();
    expect(capability.engine).toBe("webkit-speech-recognition");
    expect(capability.canStartRecognition).toBe(true);
  });

  it("returns null recognizer in insecure context", () => {
    stubWindow({
      secureContext: false,
      speechRecognition: MockSpeechRecognition
    });

    expect(createSttRecognition("ko-KR")).toBeNull();
  });

  it("creates recognizer with expected defaults", () => {
    stubWindow({
      secureContext: true,
      speechRecognition: MockSpeechRecognition
    });

    const recognition = createSttRecognition("en-US");
    expect(recognition).toBeInstanceOf(MockSpeechRecognition);
    expect(recognition?.lang).toBe("en-US");
    expect(recognition?.continuous).toBe(false);
    expect(recognition?.interimResults).toBe(true);
  });
});
