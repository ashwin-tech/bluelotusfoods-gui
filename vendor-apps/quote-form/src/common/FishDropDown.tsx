import React from "react";
import GenericDropdown from "./GenericDropdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Use environment variable

interface Fish {
  common_name: string;
}

const FishDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  return (
    <GenericDropdown<Fish>
      fetchUrl={`${API_BASE_URL}/fish/types`} // Use base URL
      value={value}
      onChange={onChange}
      placeholder="Select Fish"
      mapOption={(fish) => ({
        value: fish.common_name,
        display: fish.common_name,
      })}
    />
  );
};

export default FishDropdown;
