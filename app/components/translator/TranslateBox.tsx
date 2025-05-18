import debounce from "lodash/debounce";
import React, { useCallback, useEffect } from "react";
import { FaRegCopy } from "react-icons/fa";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";

interface TranslateBoxProps {
  translateLanguage: string;
  targetLang: string;
  textToTranslate: string;
  triggerTranslation: boolean;
  recording: boolean;
  setTriggerTranslation: (trigger: boolean) => void;
  inputLanguage: string;
  setInputLanguage: (inputLanguage: string) => void;
  onAutoDetect: (autoDetect: boolean) => void;
  translation: string;
  setTranslation: (translation: string) => void;
  onClearText: () => void;
}

const TranslateBox: React.FC<TranslateBoxProps> = (props) => {
  const {
    translateLanguage,
    targetLang,
    textToTranslate,
    triggerTranslation,
    setTriggerTranslation,
    recording,
    inputLanguage,
    setInputLanguage,
    onAutoDetect,
    translation,
    setTranslation,
    onClearText,
  } = props;

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const lastTextRef = React.useRef<string>("");

  // Function to call the translate API
  const callTranslateAPI = async (
    textToTranslate: string,
    targetLang: string
  ) => {
    // Update the last text reference
    lastTextRef.current = textToTranslate;

    if (!textToTranslate || textToTranslate === " [BLANK]") {
      setTranslation("");
      return;
    }

    if (!targetLang) {
      console.error("Invalid target language:", targetLang);
      setTranslation("Target language not supported");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToTranslate,
          source_lang:
            inputLanguage !== "Detect Language"
              ? inputLanguage.toLowerCase()
              : "",
          target_lang: targetLang.toLowerCase(),
        }),
      });

      const data = await response.json();
      setTranslation(data.translation);

      // Set detected language if available in the response
      if (data.detected_source) {
        // Convert language code to language name for display
        const langName = data.detected_source
          ? data.detected_source.charAt(0).toUpperCase() +
            data.detected_source.slice(1)
          : "";

        if (inputLanguage === "Detect Language" && langName) {
          console.log("Detected language:", langName);
          setInputLanguage(langName);
          onAutoDetect(true);
        }
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a debounced version of the translate function that waits n-seconds
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedTranslate = useCallback(
    debounce((text: string, lang: string) => {
      if (text && text !== lastTextRef.current) {
        console.log("Debounced translate call with:", text);
        callTranslateAPI(text, lang);
      }
    }, 1000),
    [targetLang]
  );

  // Call the API when text changes during recording
  useEffect(() => {
    if (recording && textToTranslate) {
      // Check if textToTranslate is a non-empty string without using trim
      const textContent = String(textToTranslate);
      if (textContent && textContent !== " [BLANK]") {
        debouncedTranslate(textContent, targetLang);
      }
    }
  }, [textToTranslate, targetLang, recording, debouncedTranslate]);

  // Handle manual trigger
  useEffect(() => {
    if (triggerTranslation) {
      callTranslateAPI(textToTranslate, targetLang);
      setTriggerTranslation(false);
    }
  }, [triggerTranslation, textToTranslate, targetLang, setTriggerTranslation]);

  // Function to copy translation to clipboard
  const copyToClipboard = () => {
    if (translation) {
      navigator.clipboard.writeText(translation);
    }
  };

  // Function to speak the translation
  const speakTranslation = () => {
    if (translation && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(translation);
      // Try to match language code for speech
      const langCode = translateLanguage.toLowerCase().slice(0, 2);
      if (langCode) {
        utterance.lang = langCode;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-3 sm:p-4 w-full md:max-w-xl min-h-[200px] sm:min-h-[250px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-xl font-bold mr-2">{translateLanguage}</span>
          <button
            className="p-1"
            onClick={speakTranslation}
            disabled={!translation}
          >
            <HiMiniSpeakerWave
              className={`w-6 h-6 ${
                translation
                  ? "text-gray-500 hover:text-gray-700"
                  : "text-gray-300"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center">
          <button
            className="p-1"
            title="Clear translation"
            onClick={onClearText}
            disabled={!translation}
          >
            <IoClose
              className={`w-6 h-6 ${
                translation
                  ? "text-gray-500 hover:text-gray-700"
                  : "text-gray-300"
              }`}
            />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <p className="text-gray-400">Translating...</p>
        ) : (
          <p className="text-gray-800">
            {translation || "Translation will appear here..."}
          </p>
        )}
      </div>
      <div className="flex justify-end mt-4">
        <button
          className="p-1 mr-2"
          title="Copy translation"
          onClick={copyToClipboard}
          disabled={!translation}
        >
          <FaRegCopy
            className={`w-5 h-5 ${
              translation
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-300"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default TranslateBox;
