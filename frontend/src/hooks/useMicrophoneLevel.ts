import Constants from "expo-constants";
import { useCallback, useEffect, useRef, useState } from "react";

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

function normalizeMetering(metering?: number): number {
  if (metering === undefined || Number.isNaN(metering)) {
    return 0;
  }
  const clamped = Math.min(MAX_METERING_DB, Math.max(MIN_METERING_DB, metering));
  const linear = (clamped - MIN_METERING_DB) / Math.abs(MIN_METERING_DB);
  return Math.min(1, Math.max(0, linear));
}

export function useMicrophoneLevel(): UseMicrophoneLevelResult {
  const recorderRef = useRef<any>(null);
  const audioModuleRef = useRef<any>(null);
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

  const stop = useCallback(async () => {
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

  const start = useCallback(async () => {
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
        isMeteringEnabled: true,
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
        shouldRouteThroughEarpiece: false,
      });
      await recorder.prepareToRecordAsync(meteringOptions);
      recorder.record();
      clearMeteringInterval();
      intervalRef.current = setInterval(() => {
        const current = recorderRef.current?.getStatus?.();
        setLevel(current?.isRecording ? normalizeMetering(current.metering) : 0);
      }, 120);
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

  useEffect(() => {
    return () => {
      clearMeteringInterval();
      void recorderRef.current?.stop?.();
    };
  }, [clearMeteringInterval]);

  return {
    level,
    status,
    isActive: status === "active",
    errorMessage,
    start,
    stop,
  };
}
