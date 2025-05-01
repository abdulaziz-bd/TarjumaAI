import React from "react";
import { FaRegCopy } from "react-icons/fa";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";

const translateLanguageMap: { [key: string]: string } = {
  English: "en",
  Arabic: "ar",
  German: "de",
  Spanish: "es",
  French: "fr",
  Bengali: "bn",
  // Add more languages as needed
};
interface TranslateBoxProps {
  translateLanguage: string;
  targetLang: string;
  textToTranslate: string;
}

const TranslateBox: React.FC<TranslateBoxProps> = (props) => {
  const { translateLanguage, targetLang, textToTranslate } = props;
  const [translation, setTranslation] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Function to call the translate API
  const callTranslateAPI = async (
    textToTranslate: string,
    targetLang: string
  ) => {
    if (
      !textToTranslate ||
      typeof textToTranslate !== "string" ||
      textToTranslate.trim() === ""
    ) {
      setTranslation("");
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
          targetLang: targetLang.substring(0, 2).toLowerCase(), // Use first 2 chars of language
        }),
      });

      const data = await response.json();
      setTranslation(data.translation);
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Call the API when text changes
  React.useEffect(() => {
    callTranslateAPI(textToTranslate, targetLang);
  }, [textToTranslate, targetLang]);

  return (
    <div className="bg-white shadow-md rounded-2xl p-4 mb-4 w-full min-w-[500px] max-w-4xl h-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-xl font-bold mr-2">{translateLanguage}</span>
          <button className="p-1">
            <HiMiniSpeakerWave className="text-gray-500 w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center">
          <button className="p-1 mr-2" title="Copy translation">
            <FaRegCopy className="text-gray-500 w-5 h-5" />
          </button>
          <button
            className="p-1"
            title="Clear translation"
            onClick={() => setTranslation("")}
          >
            <IoClose className="text-gray-500 w-6 h-6" />
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
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full shadow-md hover:bg-gray-300 mr-2">
          Suggest Edit
        </button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600">
          Share
        </button>
      </div>
    </div>
  );
};

export default TranslateBox;
