import React from "react";
import { HiMenu } from "react-icons/hi";

const Header: React.FC = () => {
  return (
    <div
      className="
  border border-gray-300 px-4 py-4 flex items-center text-2xl font-mono
  "
    >
      <HiMenu className="text-4xl text-gray-700 mr-4" />
      Tarjuma AI
    </div>
  );
};

export default Header;
