"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React, { useState } from "react";
import { HiSwitchHorizontal } from "react-icons/hi";
import { IoIosArrowDropdown, IoIosArrowDropdownCircle } from "react-icons/io";
import { MdAutoAwesome } from "react-icons/md";
import { toast } from "react-toastify";

interface LanguageSelectorProps {
  inputLanguage: string;
  setInputLanguage: (language: string) => void;
  translateLanguage: string;
  setTranslateLanguage: (language: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = (props) => {
  const {
    inputLanguage,
    setInputLanguage,
    translateLanguage,
    setTranslateLanguage,
  } = props;
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [isAutoDetect, setIsAutoDetect] = useState(true);

  // Available languages
  const languages = ["English", "Arabic", "Deutsch"];

  const handleLeftLanguageSelect = (language: string) => {
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
    setIsAutoDetect(language === "Detect Language");
    setLeftOpen(false);
  };

  const handleRightLanguageSelect = (language: string) => {
    setTranslateLanguage(language);
    setRightOpen(false);
  };

  const handleSwitch = () => {
    // Don't switch if left is on auto-detect
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
  };

  return (
    <div className="items-center flex px-4 py-4 gap-4">
      {/* Left Language Selector */}
      <div className="border rounded-full border-gray-300 px-4 py-4 flex items-center text-xl font-mono shadow-sm">
        {isAutoDetect && (
          <MdAutoAwesome className="text-xl text-blue-500 mr-2" />
        )}
        <span
          className={`${
            isAutoDetect ? "text-xl font-medium" : "text-gray-700"
          } mr-4`}
        >
          {inputLanguage}
        </span>
        <DropdownMenu open={leftOpen} onOpenChange={setLeftOpen}>
          <DropdownMenuTrigger>
            {leftOpen ? (
              <IoIosArrowDropdownCircle className="text-2xl text-gray-700" />
            ) : (
              <IoIosArrowDropdown className="text-2xl text-gray-700" />
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
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        title={
          inputLanguage === "Detect Language"
            ? "Cannot switch when using auto-detect"
            : "Switch languages"
        }
      >
        <HiSwitchHorizontal
          className={`text-4xl ${
            inputLanguage === "Detect Language"
              ? "text-gray-400"
              : "text-gray-700 cursor-pointer"
          }`}
        />
      </button>

      {/* Right Language Selector */}
      <div className="border rounded-full border-gray-300 px-4 py-4 flex items-center text-xl font-mono shadow-sm">
        <span className="text-gray-700 mr-4">{translateLanguage}</span>
        <DropdownMenu open={rightOpen} onOpenChange={setRightOpen}>
          <DropdownMenuTrigger>
            {rightOpen ? (
              <IoIosArrowDropdownCircle className="text-2xl text-gray-700" />
            ) : (
              <IoIosArrowDropdown className="text-2xl text-gray-700" />
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

export default LanguageSelector;
