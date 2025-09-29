import React from "react";
import GenericDropdown from "./GenericDropdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const DictionaryDropdown: React.FC<{
  category: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}> = ({ category, value, onChange, label }) => {
  return (
    <GenericDropdown
      fetchUrl={`${API_BASE_URL}/dictionary/${category}`} // Use base URL
      value={value}
      onChange={onChange}
      placeholder="Select Destination"
      mapOption={(item: { code: string; name: string }) => ({
        value: item.code,
        display: `${item.name} (${item.code})`,
      })}
    />
  );
};

export default DictionaryDropdown;
