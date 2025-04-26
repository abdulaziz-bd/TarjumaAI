import React from "react";
import InputBox from "./InputBox";
import LanguageSelector from "./LanguageSelector";
import TranslateBox from "./TranslateBox";

const Translator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-100">
      <div className="flex items-center justify-center mt-10">
        <LanguageSelector />
      </div>
      <div className="flex items-center justify-center mb-10">
        <InputBox />
        <TranslateBox />
      </div>
    </div>
  );
};

export default Translator;
