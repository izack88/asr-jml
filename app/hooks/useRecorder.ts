"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "denied";

export type RecordingResult = {
  blob: Blob;
  durationSec: number;
};

/** Number of live amplitude bars exposed for the waveform visualizer. */
const BAR_COUNT = 48;

/**
 * Microphone recording with a real-time amplitude readout.
 *
 * Wraps MediaRecorder for capture and an AnalyserNode for the live waveform.
 * `levels` is a rolling array of 0–1 amplitudes the UI can render as bars.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [levels, setLevels] = useState<number[]>(() =>
    new Array(BAR_COUNT).fill(0),
  );
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const levelsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const loopRef = useRef<() => void>(() => {});

  const cleanup = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // The animation loop reads refs and reschedules itself via loopRef, so it can
  // recurse without the callback referencing its own binding.
  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);

    // RMS of the waveform → perceived loudness, normalized to 0–1.
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    const level = Math.min(1, rms * 3.2);

    const next = levelsRef.current.slice(1);
    next.push(level);
    levelsRef.current = next;
    setLevels(next);
    setElapsed((Date.now() - startedAtRef.current) / 1000);

    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, []);

  useEffect(() => {
    loopRef.current = tick;
  }, [tick]);

  const start = useCallback(async () => {
    if (state === "recording" || state === "requesting") return;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      startedAtRef.current = Date.now();
      levelsRef.current = new Array(BAR_COUNT).fill(0);
      setElapsed(0);
      setState("recording");
      rafRef.current = requestAnimationFrame(() => loopRef.current());
    } catch {
      setState("denied");
      cleanup();
    }
  }, [state, cleanup]);

  /** Stop and resolve with the captured audio, or null if nothing was recorded. */
  const stop = useCallback((): Promise<RecordingResult | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || state !== "recording") return Promise.resolve(null);

    const durationSec = (Date.now() - startedAtRef.current) / 1000;
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        cleanup();
        setState("idle");
        setLevels(new Array(BAR_COUNT).fill(0));
        setElapsed(0);
        resolve(blob.size > 0 ? { blob, durationSec } : null);
      };
      recorder.stop();
    });
  }, [state, cleanup]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && state === "recording") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
    setState("idle");
    setLevels(new Array(BAR_COUNT).fill(0));
    setElapsed(0);
  }, [state, cleanup]);

  return { state, levels, elapsed, start, stop, cancel };
}
