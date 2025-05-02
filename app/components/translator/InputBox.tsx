import React from "react";
import { FaStop } from "react-icons/fa";
import { FaMicrophone } from "react-icons/fa6";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { toast } from "react-toastify";
import { getTranslation } from "./translation";

interface InputBoxProps {
  inputLanguage: string;
  recording: boolean;
  setRecording: (recording: boolean) => void;
  text: string;
  setText: (text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  setTriggerTranslation: (trigger: boolean) => void;
  autoDetect: boolean;
  onClearText: () => void;
}

const InputBox: React.FC<InputBoxProps> = (props) => {
  const {
    inputLanguage,
    recording,
    setRecording,
    text,
    setText,
    onStartRecording,
    onStopRecording,
    setTriggerTranslation,
    autoDetect,
    onClearText,
  } = props;

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

  const handleRecordingToggle = () => {
    if (inputLanguage === "Detect Language") {
      toast.error("Cannot record when using auto-detect", {
        position: "bottom-right",
        autoClose: 2000,
      });
      return;
    }
    if (recording) {
      onStopRecording();
      setRecording(false);
    } else {
      onStartRecording();
      setRecording(true);
    }
  };

  // Function to speak the translation
  const speakTranslation = () => {
    if (text && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // Try to match language code for speech
      const langCode = inputLanguage.toLowerCase().slice(0, 2);
      if (langCode) {
        utterance.lang = langCode;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-4 mb-4 w-full min-w-[500px] max-w-4xl h-[280px] mr-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-xl font-bold mr-2">
            {inputLanguage}
            {autoDetect ? (
              <span className="ml-1 px-2 py-1 border rounded-full border-blue-500 text-blue-500 text-xs">
                Auto-detect
              </span>
            ) : (
              ""
            )}
          </span>
          <button className="p-1" onClick={speakTranslation}>
            <HiMiniSpeakerWave className="text-gray-500 w-6 h-6" />
          </button>
        </div>
        <button className="p-1" onClick={onClearText}>
          <IoClose className="text-gray-500 w-6 h-6" title="clear text" />
        </button>
      </div>
      <div className="flex-1">
        <textarea
          className="w-full h-full p-4 border-none outline-none resize-none overflow-auto"
          placeholder={
            translation?.[inputLanguage] || "Type or paste text here..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
      </div>
      <div className="flex items-center justify-between mt-4">
        <button
          className="p-4 bg-green-500 text-white rounded-full shadow-md hover:bg-green-600"
          onClick={handleRecordingToggle}
        >
          {recording ? <FaStop /> : <FaMicrophone />}
        </button>
        <button
          className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600"
          onClick={() => setTriggerTranslation(true)}
        >
          Translate
        </button>
      </div>
    </div>
  );
};

export default InputBox;
