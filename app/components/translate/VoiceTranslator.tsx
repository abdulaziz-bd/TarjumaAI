"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import bufferToWav from "audiobuffer-to-wav";
import { Languages, Loader2, Mic, Square } from "lucide-react";
import React, { useRef, useState } from "react";

const VoiceTranslator: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [translation, setTranslation] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const processCurrentChunks = async (): Promise<void> => {
    if (audioChunks.current.length === 0) return;

    const chunksToProcess = [...audioChunks.current];
    // audioChunks.current = []; // Clear for next batch

    setIsProcessing(true);
    try {
      const audioBlob = new Blob(chunksToProcess, { type: "audio/webm" });
      console.log("Processing audio blob size:", audioBlob.size);

      const wavBlob = await convertToWav(audioBlob);
      console.log("WAV blob size:", wavBlob.size);

      // Verify the audio format
      const verifyBuffer = await wavBlob.arrayBuffer();
      const verifyContext = new AudioContext();
      const verifyAudioBuffer = await verifyContext.decodeAudioData(
        verifyBuffer
      );
      console.log("Final audio format:", {
        sampleRate: verifyAudioBuffer.sampleRate,
        numberOfChannels: verifyAudioBuffer.numberOfChannels,
        duration: verifyAudioBuffer.duration,
      });

      const formData = new FormData();
      formData.append("audio", wavBlob, "recording.wav");
      formData.append("targetLang", "bn");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.transcription && data.transcription.trim()) {
        setTranscript(data.transcription);
        setTranslation(data.translation);
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      setError("Error processing audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      setError(null);
      audioChunks.current = [];

      // Request specific audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.current.addEventListener(
        "dataavailable",
        (event: BlobEvent) => {
          console.log("Data chunk received:", event.data.size, "bytes");
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
            processCurrentChunks();
          }
        }
      );

      mediaRecorder.current.addEventListener("stop", async () => {
        console.log("Recording stopped, processing final chunks");
        await processCurrentChunks();
      });

      mediaRecorder.current.start(5000); // Get chunks every 5 seconds
      setIsRecording(true);
    } catch (error) {
      setError(
        "Error accessing microphone. Please ensure you have granted permission."
      );
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = (): void => {
    console.log("Stopping recording...");
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();

      // Decode the original audio
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log("Original audio buffer:", {
        sampleRate: originalBuffer.sampleRate,
        numberOfChannels: originalBuffer.numberOfChannels,
        duration: originalBuffer.duration,
        length: originalBuffer.length,
      });

      // Create offline context for resampling
      const targetSampleRate = 16000;
      const targetLength = Math.round(
        originalBuffer.duration * targetSampleRate
      );

      const offlineCtx = new OfflineAudioContext({
        numberOfChannels: 1,
        length: targetLength,
        sampleRate: targetSampleRate,
      });

      // Create buffer source
      const source = offlineCtx.createBufferSource();

      // Connect source to offline context
      source.buffer = originalBuffer;
      source.connect(offlineCtx.destination);

      // Start rendering
      source.start(0);
      const resampledBuffer = await offlineCtx.startRendering();

      console.log("Resampled audio buffer:", {
        sampleRate: resampledBuffer.sampleRate,
        numberOfChannels: resampledBuffer.numberOfChannels,
        duration: resampledBuffer.duration,
        length: resampledBuffer.length,
      });

      // Convert the resampled audio to WAV format
      const wavBuffer = bufferToWav(resampledBuffer);

      return new Blob([wavBuffer], { type: "audio/wav" });
    } catch (error) {
      console.error("Error converting to WAV:", error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          TarjumaAI:Real-time Voice Translation
        </h2>
        <Languages className="w-6 h-6 text-blue-500" />
      </div>

      <div className="flex justify-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center justify-center space-x-2 px-6 py-4 rounded-full transition-all duration-200 ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          disabled={isProcessing}
        >
          {isRecording ? (
            <>
              <Square className="w-6 h-6 text-white" />
              <span className="text-white font-medium">Stop Streaming</span>
            </>
          ) : (
            <>
              <Mic className="w-6 h-6 text-white" />
              <span className="text-white font-medium">Start Streaming</span>
            </>
          )}
        </button>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 text-blue-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing audio...</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-gray-50 min-h-48">
          <h3 className="font-semibold mb-2">Original Speech</h3>
          <div className="whitespace-pre-wrap">
            {transcript || "Speech will appear here..."}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-blue-50 min-h-48">
          <h3 className="font-semibold mb-2">Translation</h3>
          <div className="whitespace-pre-wrap">
            {translation || "Translation will appear here..."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTranslator;
