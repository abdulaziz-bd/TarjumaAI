import React from "react";
import { FaRegCopy } from "react-icons/fa";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { getTranslation } from "./translation";

interface TranslateBoxProps {
  translateLanguage: string;
  text: string;
}

const TranslateBox: React.FC<TranslateBoxProps> = (props) => {
  const { translateLanguage, text } = props;
  const [translation, setTranslation] = React.useState<{
    [key: string]: string;
  }>({});

  React.useEffect(() => {
    const fetchTranslation = async () => {
      const result = await getTranslation();
      setTranslation(result);
    };

    fetchTranslation();
  }, []);

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
          <button className="p-1" title="Clear translation">
            <IoClose className="text-gray-500 w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <p className="text-gray-800">
          {text
            ? text
            : translation?.[translateLanguage] ||
              "Translation will appear here..."}
        </p>
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
