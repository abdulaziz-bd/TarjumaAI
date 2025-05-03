import React, { useEffect } from "react";
import { FaRegCopy } from "react-icons/fa";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";

const translateLanguageMap: { [key: string]: string } = {
  English: "eng_Latn",
  Arabic: "arb_Arab",
  German: "deu_Latn",
  Spanish: "spa_Latn",
  French: "fra_Latn",
  Bengali: "ben_Beng",
  // Add more languages as needed
};

// Reverse mapping for display purposes
const languageCodeToName: { [key: string]: string } = {
  eng_Latn: "English",
  arb_Arab: "Arabic",
  deu_Latn: "German",
  spa_Latn: "Spanish",
  fra_Latn: "French",
  ben_Beng: "Bengali",
  // Add more as needed
};

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
  let characterCount = 10;

  // Function to call the translate API
  const callTranslateAPI = async (
    textToTranslate: string,
    targetLang: string
  ) => {
    // Don't translate if the text is the same as last time
    if (textToTranslate === lastTextRef.current) {
      return;
    }

    // Update the last text reference
    lastTextRef.current = textToTranslate;

    if (!textToTranslate || textToTranslate === " [BLANK]") {
      setTranslation("");
      return;
    }

    if (!targetLang || !translateLanguageMap[targetLang]) {
      console.error("Invalid target language:", targetLang);
      setTranslation("Target language not supported");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToTranslate,
          targetLang: translateLanguageMap[targetLang],
        }),
      });

      const data = await response.json();
      setTranslation(data.translation);

      // Set detected language if available in the response
      if (data.detectedLanguage) {
        // Convert language code to language name for display
        const langName =
          languageCodeToName[data.detectedLanguage] || data.detectedLanguage;
        if (
          inputLanguage === "Detect Language" &&
          languageCodeToName[data.detectedLanguage]
        ) {
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

  // Call the API when text changes during recording
  useEffect(() => {
    const numberOfCharacters = textToTranslate.length;
    if (numberOfCharacters < characterCount) {
      return;
    }
    if (recording && textToTranslate) {
      // Direct call without debounce
      console.log("Calling API with text:", textToTranslate);
      callTranslateAPI(textToTranslate, targetLang);
      characterCount = numberOfCharacters + characterCount;
    }
  }, [textToTranslate, targetLang, recording]);

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
      // Optionally add a copied notification here
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
    <div className="bg-white shadow-md rounded-2xl p-4 mb-4 w-full min-w-[500px] max-w-4xl h-[280px] flex flex-col">
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
