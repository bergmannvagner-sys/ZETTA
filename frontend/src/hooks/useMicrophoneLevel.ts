import Constants from "expo-constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

type MicrophoneLevelStatus = "idle" | "requesting_permission" | "active" | "denied" | "error";

type UseMicrophoneLevelResult = {
  level: number;
  status: MicrophoneLevelStatus;
  isActive: boolean;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

const MIN_METERING_DB = -60;
const MAX_METERING_DB = 0;
const WEB_SAMPLE_INTERVAL_MS = 120;
const WEB_ANALYSER_FFT_SIZE = 256;

function normalizeMetering(metering?: number): number {
  if (metering === undefined || Number.isNaN(metering)) {
    return 0;
  }
  const clamped = Math.min(MAX_METERING_DB, Math.max(MIN_METERING_DB, metering));
  const linear = (clamped - MIN_METERING_DB) / Math.abs(MIN_METERING_DB);
  return Math.min(1, Math.max(0, linear));
}

function getWebErrorMessage(error: unknown): string {
  const errorName = typeof error === "object" && error !== null && "name" in error ? String((error as { name?: unknown }).name) : null;
  if (errorName === "NotAllowedError" || errorName === "SecurityError") {
    return "Permissão de microfone negada.";
  }
  if (errorName === "NotFoundError" || errorName === "NotReadableError") {
    return "Microfone indisponível neste navegador.";
  }
  return "Medição de voz indisponível neste navegador.";
}

export function useMicrophoneLevel(): UseMicrophoneLevelResult {
  const recorderRef = useRef<any>(null);
  const audioModuleRef = useRef<any>(null);
  const webStreamRef = useRef<any>(null);
  const webAudioContextRef = useRef<any>(null);
  const webAnalyserRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<MicrophoneLevelStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearMeteringInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cleanupWebAudio = useCallback(async () => {
    clearMeteringInterval();

    const stream = webStreamRef.current;
    const audioContext = webAudioContextRef.current;

    webStreamRef.current = null;
    webAnalyserRef.current = null;
    webAudioContextRef.current = null;

    if (stream?.getTracks) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    if (audioContext?.close) {
      try {
        await audioContext.close();
      } catch {
        // Ignorado: a limpeza não deve esconder o erro original.
      }
    }
  }, [clearMeteringInterval]);

  const stopNativeAudio = useCallback(async () => {
    try {
      clearMeteringInterval();
      const recorder = recorderRef.current;
      if (recorder?.isRecording) {
        await recorder.stop();
      }
      await audioModuleRef.current?.setAudioModeAsync?.({ allowsRecording: false });
      await audioModuleRef.current?.setIsAudioActiveAsync?.(false);
      recorderRef.current = null;
      setLevel(0);
      setStatus("idle");
      setErrorMessage(null);
    } catch {
      setLevel(0);
      setStatus("error");
      setErrorMessage("Não foi possível desligar o microfone.");
    }
  }, [clearMeteringInterval]);

  const stop = useCallback(async () => {
    if (Platform.OS === "web") {
      await cleanupWebAudio();
      setLevel(0);
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    await stopNativeAudio();
  }, [cleanupWebAudio, stopNativeAudio]);

  const startWebAudio = useCallback(async () => {
    setStatus("requesting_permission");
    setErrorMessage(null);

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setLevel(0);
        setStatus("error");
        setErrorMessage("Medição de voz indisponível neste navegador.");
        return;
      }

      await cleanupWebAudio();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextCtor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioContextCtor) {
        stream.getTracks().forEach((track: any) => track.stop());
        setLevel(0);
        setStatus("error");
        setErrorMessage("Medição de voz indisponível neste navegador.");
        return;
      }

      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = WEB_ANALYSER_FFT_SIZE;
      source.connect(analyser);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      webStreamRef.current = stream;
      webAudioContextRef.current = audioContext;
      webAnalyserRef.current = analyser;

      clearMeteringInterval();
      intervalRef.current = setInterval(() => {
        const currentAnalyser = webAnalyserRef.current;
        if (!currentAnalyser) {
          setLevel(0);
          return;
        }

        const buffer = new Uint8Array(currentAnalyser.fftSize);
        currentAnalyser.getByteTimeDomainData(buffer);

        let sumSquares = 0;
        for (let index = 0; index < buffer.length; index += 1) {
          const centered = (buffer[index] - 128) / 128;
          sumSquares += centered * centered;
        }

        const rms = Math.sqrt(sumSquares / buffer.length);
        setLevel(Math.min(1, rms * 2.2));
      }, WEB_SAMPLE_INTERVAL_MS);

      setLevel(0);
      setStatus("active");
    } catch (error) {
      await cleanupWebAudio();
      setLevel(0);
      setStatus("error");
      setErrorMessage(getWebErrorMessage(error));
    }
  }, [clearMeteringInterval, cleanupWebAudio]);

  const startNativeAudio = useCallback(async () => {
    setStatus("requesting_permission");
    setErrorMessage(null);

    if (Constants.appOwnership === "expo") {
      setLevel(0);
      setStatus("error");
      setErrorMessage("Medição de voz indisponível no Expo Go. Use uma development build para testar microfone.");
      return;
    }

    try {
      const audio = await import("expo-audio");
      const permission = await audio.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        setErrorMessage("Permissão de microfone negada.");
        return;
      }

      const meteringOptions = {
        ...audio.RecordingPresets.LOW_QUALITY,
        isMeteringEnabled: true
      };
      const recorder = new audio.AudioModule.AudioRecorder(meteringOptions);

      audioModuleRef.current = audio;
      recorderRef.current = recorder;

      await audio.setIsAudioActiveAsync(true);
      await audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false
      });
      await recorder.prepareToRecordAsync(meteringOptions);
      recorder.record();
      clearMeteringInterval();
      intervalRef.current = setInterval(() => {
        const current = recorderRef.current?.getStatus?.();
        setLevel(current?.isRecording ? normalizeMetering(current.metering) : 0);
      }, WEB_SAMPLE_INTERVAL_MS);
      setStatus("active");
    } catch {
      clearMeteringInterval();
      setLevel(0);
      setStatus("error");
      setErrorMessage("Medição de voz indisponível neste aparelho.");
      try {
        await audioModuleRef.current?.setIsAudioActiveAsync?.(false);
      } catch {
        // Falha de limpeza de áudio não deve esconder o erro original.
      }
    }
  }, [clearMeteringInterval]);

  const start = useCallback(async () => {
    if (Platform.OS === "web") {
      await startWebAudio();
      return;
    }

    await startNativeAudio();
  }, [startNativeAudio, startWebAudio]);

  useEffect(() => {
    return () => {
      clearMeteringInterval();

      if (Platform.OS === "web") {
        const stream = webStreamRef.current;
        const audioContext = webAudioContextRef.current;

        webStreamRef.current = null;
        webAnalyserRef.current = null;
        webAudioContextRef.current = null;

        if (stream?.getTracks) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
        }

        void audioContext?.close?.();
        return;
      }

      void recorderRef.current?.stop?.();
    };
  }, [clearMeteringInterval]);

  return {
    level,
    status,
    isActive: status === "active",
    errorMessage,
    start,
    stop
  };
}
