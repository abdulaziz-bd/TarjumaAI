"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React, { useCallback, useState, memo } from "react";
import { HiSwitchHorizontal } from "react-icons/hi";
import { IoIosArrowDropdown, IoIosArrowDropdownCircle } from "react-icons/io";
import { MdAutoAwesome } from "react-icons/md";
import { toast } from "react-toastify";

interface LanguageSelectorProps {
  inputLanguage: string;
  setInputLanguage: (language: string) => void;
  translateLanguage: string;
  setTranslateLanguage: (language: string) => void;
  autoDetect: boolean;
  onAutoDetect: (autoDetect: boolean) => void;
  setText: (text: string) => void;
  text: string;
  setTranslation: (translation: string) => void;
  translation: string;
  isProcessing?: boolean;
}

const LanguageSelectorComponent: React.FC<LanguageSelectorProps> = (props) => {
  const {
    inputLanguage,
    setInputLanguage,
    translateLanguage,
    setTranslateLanguage,
    autoDetect,
    onAutoDetect,
    setText,
    setTranslation,
    translation,
    text,
    isProcessing,
  } = props;
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  // Removed local isAutoDetect state

  // Available languages
  const languages = [
    "English",
    "Arabic",
    "Deutsch",
    "Spanish",
    "French",
    "Bengali",
  ];

  const handleLeftLanguageSelect = useCallback((language: string) => {
    if (language === translateLanguage) {
      if (inputLanguage === "Detect Language") {
        toast.error("Cannot switch when using auto-detect", {
          position: "bottom-right",
          autoClose: 2000,
        });
        return;
      }

      const temp = inputLanguage;
      setInputLanguage(translateLanguage);
      setTranslateLanguage(temp);
      return;
    }

    setInputLanguage(language);
    onAutoDetect(language === "Detect Language");
    setLeftOpen(false);
  }, [inputLanguage, translateLanguage, setInputLanguage, setTranslateLanguage, onAutoDetect]);

  const handleRightLanguageSelect = useCallback((language: string) => {
    setTranslateLanguage(language);
    setRightOpen(false);
  }, [setTranslateLanguage]);

  const handleSwitch = useCallback(() => {
    if (inputLanguage === "Detect Language") {
      toast.error("Cannot switch when using auto-detect", {
        position: "bottom-right",
        autoClose: 2000,
      });
      return;
    }

    const temp = inputLanguage;
    setInputLanguage(translateLanguage);
    setTranslateLanguage(temp);
    setText(translation);
    setTranslation(text);
    onAutoDetect(false);
  }, [inputLanguage, translateLanguage, setInputLanguage, setTranslateLanguage, setText, setTranslation, text, translation, onAutoDetect]);

  // Removed useEffect for local isAutoDetect

  return (
    <div className="items-center flex px-4 py-4 gap-4">
      {/* Left Language Selector */}
      <div className={`border rounded-full border-gray-300 px-4 py-4 flex items-center text-xl font-mono shadow-sm ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}>
        {inputLanguage === "Detect Language" && !autoDetect && ( // Show icon if "Detect Language" is selected but nothing detected yet
           <MdAutoAwesome className="text-xl text-blue-500 mr-2" />
        )}
        <span
          className={`${
            (inputLanguage === "Detect Language" && !autoDetect) ? "text-xl font-medium" : "text-gray-700"
          } mr-4`}
        >
          {inputLanguage}
          {autoDetect && inputLanguage !== "Detect Language" && ( // Show "Detected" badge if autoDetect is true AND a language has been set
            <span className="ml-2 px-2 py-0.5 border rounded-full border-blue-500 text-blue-500 text-xs align-middle">
              Detected
            </span>
          )}
        </span>
        <DropdownMenu open={leftOpen} onOpenChange={setLeftOpen}>
          <DropdownMenuTrigger disabled={isProcessing}>
            {leftOpen ? (
              <IoIosArrowDropdownCircle className={`text-2xl ${isProcessing ? "text-gray-400" : "text-gray-700"}`} />
            ) : (
              <IoIosArrowDropdown className={`text-2xl ${isProcessing ? "text-gray-400" : "text-gray-700"}`} />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => handleLeftLanguageSelect("Detect Language")}
            >
              Detect Language
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem
                key={`left-${lang}`}
                onClick={() => handleLeftLanguageSelect(lang)}
              >
                {lang}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Switch Button */}
      <button
        onClick={handleSwitch}
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        title={
          inputLanguage === "Detect Language"
            ? "Cannot switch when using auto-detect"
            : "Switch languages"
        }
        disabled={isProcessing}
      >
        <HiSwitchHorizontal
          className={`text-4xl ${
            inputLanguage === "Detect Language" || isProcessing
              ? "text-gray-400"
              : "text-gray-700 cursor-pointer"
          }`}
        />
      </button>

      {/* Right Language Selector */}
      <div className={`border rounded-full border-gray-300 px-4 py-4 flex items-center text-xl font-mono shadow-sm ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}>
        <span className="text-gray-700 mr-4">{translateLanguage}</span>
        <DropdownMenu open={rightOpen} onOpenChange={setRightOpen}>
          <DropdownMenuTrigger disabled={isProcessing}>
            {rightOpen ? (
              <IoIosArrowDropdownCircle className={`text-2xl ${isProcessing ? "text-gray-400" : "text-gray-700"}`} />
            ) : (
              <IoIosArrowDropdown className={`text-2xl ${isProcessing ? "text-gray-400" : "text-gray-700"}`} />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem
                key={`right-${lang}`}
                onClick={() => handleRightLanguageSelect(lang)}
              >
                {lang}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export const LanguageSelector = memo(LanguageSelectorComponent);
export default LanguageSelector;
