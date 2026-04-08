"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  const startWithDevices = useCallback(
    async (audioId?: string, videoId?: string) => {
      try {
        setError(null);
        // Stop existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoId
            ? { deviceId: { exact: videoId } }
            : { width: 640, height: 480, facingMode: "user" },
          audio: audioId ? { deviceId: { exact: audioId } } : true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsActive(true);
        setIsMuted(false);
        setIsCamOff(false);

        // Update selected device IDs from actual tracks
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        if (audioTrack) {
          const settings = audioTrack.getSettings();
          if (settings.deviceId) setSelectedAudioDevice(settings.deviceId);
        }
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.deviceId) setSelectedVideoDevice(settings.deviceId);
        }

        // Re-enumerate to get labels (only available after permission)
        await enumerateDevices();
      } catch {
        setError("Camera access denied");
        setIsActive(false);
      }
    },
    [enumerateDevices]
  );

  const start = useCallback(() => {
    return startWithDevices();
  }, [startWithDevices]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
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
    stream: streamRef.current,
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
