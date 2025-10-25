import React from "react";
import GenericDropdown from "./GenericDropdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Use environment variable

interface Grade {
  name: string;
}

const GradeDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  return (
    <GenericDropdown<Grade>
      fetchUrl={`${API_BASE_URL}/fish/grade`} // Use base URL
      value={value}
      onChange={onChange}
      placeholder="Select Grade"
      mapOption={(grade) => ({
        value: grade.name,
        display: grade.name,
      })}
    />
  );
};

export default GradeDropdown;
