import React from "react";
import GenericDropdown from "./GenericDropdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Use environment variable

const CutDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  return (
    <GenericDropdown
      fetchUrl={`${API_BASE_URL}/fish/cut`} // Use base URL
      value={value}
      onChange={onChange}
      placeholder="Select Cut"
      mapOption={(cut: { name: string }) => ({
        value: cut.name,
        display: cut.name,
      })}
    />
  );
};

export default CutDropdown;
