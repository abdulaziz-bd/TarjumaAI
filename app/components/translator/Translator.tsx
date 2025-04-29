"use client";
import React from "react";
import InputBox from "./InputBox";
import LanguageSelector from "./LanguageSelector";
import TranslateBox from "./TranslateBox";

const Translator: React.FC = () => {
  const [inputLanguage, setInputLanguage] = React.useState("Detect Language");
  const [translateLanguage, setTranslateLanguage] = React.useState("Arabic");

  return (
    <div className="flex flex-col items-center justify-center bg-gray-100">
      <div className="flex items-center justify-center mt-10">
        <LanguageSelector
          inputLanguage={inputLanguage}
          setInputLanguage={setInputLanguage}
          translateLanguage={translateLanguage}
          setTranslateLanguage={setTranslateLanguage}
        />
      </div>
      <div className="flex items-center justify-center mb-10">
        <InputBox inputLanguage={inputLanguage} />
        <TranslateBox translateLanguage={translateLanguage} />
      </div>
    </div>
  );
};

export default Translator;
