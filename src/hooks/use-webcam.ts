"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices);
    } catch {}
  }, []);

  // Attach stream to video element — retries until the element is available
  // (handles AnimatePresence delayed mount)
  const attachStream = useCallback((mediaStream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      return;
    }
    // Video element not mounted yet — poll until it appears
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        clearInterval(interval);
      } else if (attempts > 20) {
        clearInterval(interval);
      }
    }, 50);
  }, []);

  const startWithDevices = useCallback(
    async (audioId?: string, videoId?: string) => {
      try {
        setError(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: videoId
            ? { deviceId: { exact: videoId }, frameRate: { ideal: 24, max: 30 } }
            : { width: 640, height: 480, facingMode: "user", frameRate: { ideal: 24, max: 30 } },
          audio: audioId ? { deviceId: { exact: audioId } } : true,
        });
        streamRef.current = newStream;
        setStream(newStream);
        attachStream(newStream);
        setIsActive(true);
        setIsMuted(false);
        setIsCamOff(false);

        const audioTrack = newStream.getAudioTracks()[0];
        const videoTrack = newStream.getVideoTracks()[0];
        if (audioTrack?.getSettings().deviceId) {
          setSelectedAudioDevice(audioTrack.getSettings().deviceId!);
        }
        if (videoTrack?.getSettings().deviceId) {
          setSelectedVideoDevice(videoTrack.getSettings().deviceId!);
        }

        await enumerateDevices();
      } catch (err) {
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera access denied — check browser permissions"
            : err instanceof DOMException && err.name === "NotFoundError"
            ? "No camera or microphone found"
            : err instanceof DOMException && err.name === "NotReadableError"
            ? "Camera is in use by another app"
            : "Could not access camera";
        setError(msg);
        setIsActive(false);
      }
    },
    [enumerateDevices, attachStream]
  );

  const start = useCallback(() => {
    return startWithDevices();
  }, [startWithDevices]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  const toggleCam = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCamOff((prev) => !prev);
    }
  }, []);

  const switchAudioDevice = useCallback(
    (deviceId: string) => {
      setSelectedAudioDevice(deviceId);
      if (isActive) startWithDevices(deviceId, selectedVideoDevice);
    },
    [isActive, selectedVideoDevice, startWithDevices]
  );

  const switchVideoDevice = useCallback(
    (deviceId: string) => {
      setSelectedVideoDevice(deviceId);
      if (isActive) startWithDevices(selectedAudioDevice, deviceId);
    },
    [isActive, selectedAudioDevice, startWithDevices]
  );

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    stream,
    isActive,
    isMuted,
    isCamOff,
    error,
    start,
    stop,
    toggleMic,
    toggleCam,
    devices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
  };
}
