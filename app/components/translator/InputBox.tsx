import React from "react";
import { FaStop } from "react-icons/fa";
import { FaMicrophone } from "react-icons/fa6";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { getTranslation } from "./translation";

interface InputBoxProps {
  inputLanguage: string;
  recording: boolean;
  setRecording: (recording: boolean) => void;
  text: string;
  setText: (text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const InputBox: React.FC<InputBoxProps> = (props) => {
  const { 
    inputLanguage, 
    recording, 
    setRecording, 
    text, 
    setText, 
    onStartRecording, 
    onStopRecording 
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

  const handleClearText = () => {
    if (recording) {
      onStopRecording();
    }
    setRecording(false);
    setText("");
  };

  const handleRecordingToggle = () => {
    if (recording) {
      onStopRecording();
      setRecording(false);
    } else {
      onStartRecording();
      setRecording(true);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-4 mb-4 w-full min-w-[500px] max-w-4xl h-[280px] mr-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-xl font-bold mr-2">{inputLanguage}</span>
          <button className="p-1">
            <HiMiniSpeakerWave className="text-gray-500 w-6 h-6" />
          </button>
        </div>
        <button className="p-1" onClick={handleClearText}>
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
        <button className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600">
          Translate
        </button>
      </div>
    </div>
  );
};

export default InputBox;