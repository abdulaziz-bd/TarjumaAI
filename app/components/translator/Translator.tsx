"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import InputBox from "./InputBox";
import LanguageSelector from "./LanguageSelector";
import Progress from "./Progress";
import TranslateBox from "./TranslateBox";

declare global {
  interface Navigator {
    gpu?: unknown;
  }
}

const languageCodes: { [key: string]: string } = {
  English: "en",
  Arabic: "ar",
  Deutsch: "de",
  Spanish: "es",
  French: "fr",
  Bengali: "bn",
};

const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

interface ProgressItem {
  file: string;
  progress: number;
  total: number;
  status: string;
  name?: string;
}

const Translator: React.FC = () => {
  const worker = useRef<Worker | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // State for WebGPU availability
  const [isWebGPUAvailable, setIsWebGPUAvailable] = useState<boolean | null>(
    null
  );

  // Model loading and progress
  const [status, setStatus] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  const [inputLanguage, setInputLanguage] = useState("Detect Language");
  const [autoDetect, setAutoDetect] = useState(false);
  const [translateLanguage, setTranslateLanguage] = useState("Arabic");
  const [triggerTranslation, setTriggerTranslation] = useState(false);
  const [translation, setTranslation] = React.useState<string>("");

  // Processing
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunks, setChunks] = useState<BlobPart[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [text, setText] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tps, setTps] = useState(0);

  // Function to start recording manually
  const startRecording = useCallback(() => {
    if (
      recorderRef.current &&
      status === "ready" &&
      !recording &&
      !isProcessing
    ) {
      recorderRef.current.start(1000); // Start with 1-second timeslice
    }
  }, [status, recording, isProcessing]);

  // Function to stop recording manually
  const stopRecording = useCallback(() => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
    }
  }, [recording]);

  // Check WebGPU availability after component mounts
  useEffect(() => {
    setIsWebGPUAvailable(typeof navigator !== "undefined" && !!navigator.gpu);
  }, []);

  // Worker setup
  const onMessageReceived = useCallback((e: MessageEvent) => {
    switch (e.data.status) {
      case "loading":
        setStatus("loading");
        setLoadingMessage(e.data.data);
        break;
      case "initiate":
        setProgressItems((prev) => [...prev, e.data as ProgressItem]);
        break;
      case "progress":
        setProgressItems((prev) =>
          prev.map((item) => {
            if (item.file === e.data.file) {
              return { ...item, ...(e.data as ProgressItem) };
            }
            return item;
          })
        );
        break;
      case "done":
        setProgressItems((prev) =>
          prev.filter((item) => item.file !== e.data.file)
        );
        break;
      case "ready":
        setStatus("ready");
        break;
      case "start":
        setIsProcessing(true);
        // requestData logic was here, but might not be needed with timeslice
        break;
      case "update":
        setText(e.data.output);
        break;
      case "complete":
        setIsProcessing(false);
        if (Array.isArray(e.data.output)) {
          setText(e.data.output.join(" "));
        } else {
          setText(e.data.output);
        }
        break;
      case "error":
        setIsProcessing(false);
        setStatus("error");
        toast.error(e.data.message || "An error occurred with the transcription model.");
        break;
    }
  }, [ ]); // Dependencies: setStatus, setLoadingMessage, setProgressItems, setIsProcessing, setText.
            // These are stable state setters from useState, so empty array is fine.

  // Worker setup
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(
        new URL("../../utils/worker.js", import.meta.url),
        {
          type: "module",
        }
      );
    }

    worker.current.addEventListener("message", onMessageReceived);
    return () => {
      if (worker.current) {
        worker.current.removeEventListener("message", onMessageReceived);
      }
    };
  }, [onMessageReceived]); // Now depends on the memoized onMessageReceived

  // MediaRecorder setup
  useEffect(() => {
    if (recorderRef.current) return;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setStream(stream);
          recorderRef.current = new MediaRecorder(stream);
          audioContextRef.current = new AudioContext({
            sampleRate: WHISPER_SAMPLING_RATE,
          });

          recorderRef.current.onstart = () => {
            setRecording(true);
            setChunks([]); // Keep for now, might remove if fully obsolete
          };
          recorderRef.current.ondataavailable = async (e) => {
            if (e.data.size > 0 && worker.current && audioContextRef.current && !isProcessing) {
              // Check if the worker is not already processing something from a previous chunk
              // This simple check means chunks might be dropped if a new one arrives while the previous is still being sent/processed by the worker.
              // More sophisticated queueing or informing the worker to expect more data could be implemented if needed.

              // Set processing flag. It will be reset by the worker's "complete" or "error" message,
              // or if an error occurs during local audio processing.
              setIsProcessing(true);
              const blob = e.data;
              const fileReader = new FileReader();
              fileReader.onloadend = async () => {
                try {
                  const arrayBuffer = fileReader.result as ArrayBuffer;
                  const decoded = await audioContextRef.current!.decodeAudioData(
                    arrayBuffer
                  );
                  let audio = decoded.getChannelData(0);
                  // MAX_SAMPLES check might be less relevant for small timeslices but kept for safety
                  if (audio.length > MAX_SAMPLES) {
                    console.warn(`Audio chunk exceeds MAX_SAMPLES, truncating. Length: ${audio.length}`);
                    audio = audio.slice(-MAX_SAMPLES);
                  }

                  worker.current!.postMessage({
                    type: "generate",
                    data: {
                      audio,
                      language:
                        inputLanguage !== "Detect Language"
                          ? languageCodes[inputLanguage]
                          : "",
                    },
                  });
                } catch (error) {
                  console.error("Audio processing error in ondataavailable:", error);
                  setIsProcessing(false); // Reset flag on error
                }
              };
              fileReader.readAsArrayBuffer(blob);
            }
          };
          recorderRef.current.onstop = () => {
            setRecording(false);
          };
        })
        .catch((err) => {
          console.error("The following error occurred: ", err);
          toast.error("Error accessing microphone: " + err.message);
        });
    } else {
      console.error("getUserMedia not supported on your browser!");
      toast.error("Your browser does not support microphone access (getUserMedia).");
    }

    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
    };
  }, []);

  // Audio processing useEffect is now removed as logic moved to ondataavailable

  // Render loading state while WebGPU availability is being checked
  if (isWebGPUAvailable === null) {
    return <div>Loading...</div>;
  }

  const handleClearText = useCallback(() => {
    if (recording) {
      stopRecording(); // stopRecording is already memoized
    }
    setRecording(false);
    setText("");
    setTranslation("");
  }, [recording, stopRecording]);

  return isWebGPUAvailable ? (
    <div className="flex flex-col items-center justify-center w-full p-4">
      {status === null && (
        <div className="max-w-md w-full mx-auto text-center">
          <p className="mb-4 text-sm sm:text-base">
            <br />
            You are about to load{" "}
            <a
              href="https://huggingface.co/onnx-community/whisper-base"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              whisper-base
            </a>
            , a 73 million parameter speech recognition model that is optimized
            for inference on the web. Once downloaded, the model (~200&nbsp;MB)
            will be cached and reused when you revisit the page.
            <br />
            <br />
            Everything runs directly in your browser using{" "}
            <a
              href="https://huggingface.co/docs/transformers.js"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              🤗&nbsp;Transformers.js
            </a>{" "}
            and ONNX Runtime Web, meaning no data is sent to a server. You can
            even disconnect from the internet after the model has loaded!
          </p>

          <button
            className="border px-4 py-2 rounded-lg bg-blue-400 text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none"
            onClick={() => {
              worker?.current?.postMessage({ type: "load" });
              setStatus("loading");
            }}
            disabled={status !== null}
          >
            Load model
          </button>
        </div>
      )}
      {status === "loading" && (
        <div className="w-full max-w-md mx-auto p-4">
          <p className="text-center">{loadingMessage}</p>
          {progressItems.map(({ file, progress, total }, i) => (
            <Progress key={i} text={file} percentage={progress} total={total} />
          ))}
        </div>
      )}
      {status === "ready" && (
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center mt-6 mb-4">
            <LanguageSelector
              inputLanguage={inputLanguage}
              setInputLanguage={setInputLanguage}
              translateLanguage={translateLanguage}
              setTranslateLanguage={setTranslateLanguage}
              autoDetect={autoDetect}
              onAutoDetect={setAutoDetect}
              setText={setText}
              text={text}
              setTranslation={setTranslation}
              translation={translation}
              isProcessing={isProcessing}
            />
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8 px-2">
            <InputBox
              inputLanguage={inputLanguage}
              recording={recording}
              isProcessing={isProcessing}
              setRecording={setRecording}
              text={text}
              setText={setText}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              setTriggerTranslation={setTriggerTranslation}
              autoDetect={autoDetect}
              onClearText={handleClearText}
            />
            <TranslateBox
              translateLanguage={translateLanguage}
              inputLanguage={inputLanguage}
              setInputLanguage={setInputLanguage}
              targetLang={translateLanguage}
              textToTranslate={text}
              triggerTranslation={triggerTranslation}
              setTriggerTranslation={setTriggerTranslation}
              recording={recording}
              onAutoDetect={setAutoDetect}
              translation={translation}
              setTranslation={setTranslation}
              onClearText={handleClearText}
            />
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center w-full p-4 text-center my-12">
      <h1 className="text-xl sm:text-2xl font-bold text-red-500">
        WebGPU is not supported on your browser!
      </h1>
      <p className="text-gray-700 mt-4 max-w-md mx-auto">
        Please use a browser that supports WebGPU to use this feature.
      </p>
    </div>
  );
};

export default Translator;
