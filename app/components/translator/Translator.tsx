"use client";
import React, { useEffect, useRef, useState } from "react";
import InputBox from "./InputBox";
import LanguageSelector from "./LanguageSelector";
import Progress from "./Progress";
import TranslateBox from "./TranslateBox";

declare global {
  interface Navigator {
    gpu?: unknown;
  }
}

const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

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
  const [progressItems, setProgressItems] = useState<any[]>([]);

  const [inputLanguage, setInputLanguage] = useState("Detect Language");
  const [translateLanguage, setTranslateLanguage] = useState("Arabic");

  // Processing
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunks, setChunks] = useState<BlobPart[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [text, setText] = useState("");
  const [tps, setTps] = useState(0);

  // Check WebGPU availability after component mounts
  useEffect(() => {
    setIsWebGPUAvailable(typeof navigator !== "undefined" && !!navigator.gpu);
  }, []);

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

    const onMessageReceived = (e: MessageEvent) => {
      switch (e.data.status) {
        case "loading":
          setStatus("loading");
          setLoadingMessage(e.data.data);
          break;
        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;
        case "progress":
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
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
          if (recorderRef.current) recorderRef.current.start();
          break;
        case "start":
          setIsProcessing(true);
          if (recorderRef.current) recorderRef.current.requestData();
          break;
        case "update":
          const { tps } = e.data;
          setTps(tps);
          break;
        case "complete":
          setIsProcessing(false);
          setText(e.data.output);
          break;
      }
    };

    worker.current.addEventListener("message", onMessageReceived);
    return () => {
      if (worker.current) {
        worker.current.removeEventListener("message", onMessageReceived);
      }
    };
  }, []);

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
            setChunks([]);
          };
          recorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
              setChunks((prev) => [...prev, e.data]);
            } else {
              setTimeout(() => {
                if (recorderRef.current) recorderRef.current.requestData();
              }, 25);
            }
          };
          recorderRef.current.onstop = () => {
            setRecording(false);
          };
        })
        .catch((err) => console.error("The following error occurred: ", err));
    } else {
      console.error("getUserMedia not supported on your browser!");
    }

    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
    };
  }, []);

  // Audio processing
  useEffect(() => {
    if (
      !recorderRef.current ||
      !recording ||
      isProcessing ||
      status !== "ready"
    )
      return;

    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: recorderRef.current.mimeType });
      const fileReader = new FileReader();

      fileReader.onloadend = async () => {
        const arrayBuffer = fileReader.result as ArrayBuffer;
        if (audioContextRef.current) {
          const decoded = await audioContextRef.current.decodeAudioData(
            arrayBuffer
          );
          let audio = decoded.getChannelData(0);
          if (audio.length > MAX_SAMPLES) {
            audio = audio.slice(-MAX_SAMPLES);
          }

          if (worker.current) {
            worker.current.postMessage({
              type: "generate",
              data: {
                audio,
                language:
                  inputLanguage !== "Detect Language" ? inputLanguage : "",
              },
            });
          }
        }
      };
      fileReader.readAsArrayBuffer(blob);
    } else {
      if (recorderRef.current) recorderRef.current.requestData();
    }
  }, [status, recording, isProcessing, chunks, inputLanguage]);

  // Render loading state while WebGPU availability is being checked
  if (isWebGPUAvailable === null) {
    return <div>Loading...</div>;
  }

  return isWebGPUAvailable ? (
    <div className="flex flex-col items-center justify-center bg-gray-100">
      {status === null && (
        <>
          <p className="max-w-[480px] mb-4">
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
        </>
      )}
      {status === "loading" && (
        <div className="w-full max-w-[500px] text-left mx-auto p-4">
          <p className="text-center">{loadingMessage}</p>
          {progressItems.map(({ file, progress, total }, i) => (
            <Progress key={i} text={file} percentage={progress} total={total} />
          ))}
        </div>
      )}
      <div>
        <div className="flex items-center justify-center mt-10">
          <LanguageSelector
            inputLanguage={inputLanguage}
            setInputLanguage={setInputLanguage}
            translateLanguage={translateLanguage}
            setTranslateLanguage={setTranslateLanguage}
          />
        </div>
        <div className="flex items-center justify-center mb-10">
          <InputBox
            inputLanguage={inputLanguage}
            recording={recording}
            setRecording={setRecording}
            text={text}
          />
          <TranslateBox translateLanguage={translateLanguage} text={text} />
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold text-red-500 mt-10">
        WebGPU is not supported on your browser!
      </h1>
      <p className="text-gray-700 mt-4">
        Please use a browser that supports WebGPU to use this feature.
      </p>
    </div>
  );
};

export default Translator;
