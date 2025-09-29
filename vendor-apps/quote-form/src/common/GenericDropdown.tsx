import React, { useEffect, useState } from "react";

interface GenericDropdownProps<T> {
  fetchUrl: string;                     // API endpoint to fetch options
  value: string;                        // currently selected value
  onChange: (value: string) => void;    // handler when selection changes
  placeholder: string;                  // placeholder text inside the dropdown
  mapOption: (item: T) => {             // function to map API data to dropdown options
    value: string;
    display: string;
  };
}

const GenericDropdown = <T,>({
  fetchUrl,
  value,
  onChange,
  placeholder,
  mapOption,
}: GenericDropdownProps<T>) => {
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error("Failed to fetch dropdown options");
        const data: T[] = await res.json();
        setOptions(data);
      } catch (err: any) {
        console.error("Error fetching dropdown data:", err);
        setError(err.message || "Error fetching data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchUrl]);

  return (
    <div className="flex flex-col">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
        disabled={loading || !!error}
      >
        <option value="">
          {loading ? "Loading..." : error ? "Error loading options" : placeholder}
        </option>
        {options.map((opt, idx) => {
          const { value, display } = mapOption(opt);
          return (
            <option key={idx} value={value}>
              {display}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default GenericDropdown;
