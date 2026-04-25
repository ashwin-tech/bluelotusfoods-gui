import React from 'react';
import { FormData } from './types';

interface FishSize {
  id: number;
  fish_species_id: number;
  species_name: string;
  cut_id: number | null;
  cut_name: string | null;
  kg_label: number;
  kg_max: number | null;
  lbs_label: number;
  lbs_max: number | null;
}
import DictionaryDropdown from '../../common/DictionaryDropdown';
import FishDropdown from '../../common/FishDropDown';
import CutDropdown from '../../common/CutDropdown'; // Import CutDropdown
import GradeDropdown from '../../common/GradeDropdown'; // Import GradeDropdown

interface Props {
  formData: FormData;
  allFishSizes: FishSize[];
  nextQuoteId: number | null; // Add nextQuoteId as a prop
  isSubmitting: boolean; // Add loading state
  submitError: string | null; // Add error state
  hasMultipleDestinations: boolean;
  hasMultipleSizes: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleDestinationChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSizeChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFishSizeSelect: (index: number, sizeId: number, kgLabel: string) => void;
  toggleDestinationSelected: (index: number) => void;
  toggleSizeSelected: (index: number) => void;
  addDestination: () => void;
  addSize: () => void;
  cloneDestination: (index: number) => void;
  deleteSelectedDestinations: () => void;
  deleteSelectedSizes: () => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  toggleAllDestinations: (checked: boolean) => void;
  toggleAllSizes: (checked: boolean) => void;
  vendorNameReadOnly?: boolean;
  countryReadOnly?: boolean;  // Add this prop
}

const VendorQuoteFormView: React.FC<Props> = (props) => {
  const {
    formData,
    allFishSizes,
    nextQuoteId, // Destructure nextQuoteId
    isSubmitting,
    submitError,
    hasMultipleDestinations,
    hasMultipleSizes,
    handleChange,
    handleDestinationChange,
    handleSizeChange,
    handleFishSizeSelect,
    toggleDestinationSelected,
    toggleSizeSelected,
    addDestination,
    addSize,
    cloneDestination,
    deleteSelectedDestinations,
    deleteSelectedSizes,
    handleSubmit,
    toggleAllDestinations,
    toggleAllSizes,
    vendorNameReadOnly = false,
    countryReadOnly = vendorNameReadOnly,  // Default to same as vendorName
  } = props;

  const allDestinationsSelected = formData.destinations.length > 0 && formData.destinations.every(d => d.selected);
  const someDestinationsSelected = formData.destinations.some(d => d.selected);
  const allSizesSelected = formData.sizes.length > 0 && formData.sizes.every((s) => s.selected);
  const someSizesSelected = formData.sizes.some((s) => s.selected);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl space-y-6">
      {/* Error Display */}
      {submitError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {submitError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor Info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Row 1 left — Vendor Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="vendorName">Vendor Name</label>
            <input
              type="text"
              id="vendorName"
              name="vendorName"
              placeholder="Vendor Name"
              value={formData.vendorName}
              onChange={handleChange}
              readOnly={vendorNameReadOnly}
              aria-readonly={vendorNameReadOnly}
              className={`border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full ${
                vendorNameReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* Row 1 right — Quote Valid Till */}
          <div className="flex flex-col gap-1 min-w-0">
            <label htmlFor="quoteValidTill">Quote Valid Till</label>
            <input
              type="date"
              id="quoteValidTill"
              name="quoteValidTill"
              placeholder="Select Date"
              value={formData.quoteValidTill || ""}
              onChange={handleChange}
              style={{ width: '100%', boxSizing: 'border-box', minWidth: '140px' }}
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Row 2 left — Country Of Origin */}
          <div className="flex flex-col gap-1">
            <label htmlFor="countryOfOrigin">Country Of Origin</label>
            <input
              type="text"
              id="countryOfOrigin"
              name="countryOfOrigin"
              placeholder="Country of Origin"
              value={formData.countryOfOrigin}
              onChange={handleChange}
              readOnly={countryReadOnly}
              aria-readonly={countryReadOnly}
              className={`border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full ${
                countryReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* Row 2 right — Quote ID */}
          <div className="flex flex-col gap-1">
            <label htmlFor="quoteId">Quote ID</label>
            <input
              type="text"
              id="quoteId"
              name="quoteId"
              value={nextQuoteId ?? ""}
              readOnly
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Destinations */}
        <div>
          <h2 className="text-xl font-semibold border-b pb-1 mb-2">Destination Pricing Factors</h2>

          {/* Header row */}
          <div className="grid-dest-header">
            <div className="flex justify-center items-center">
              {hasMultipleDestinations && (
                <input
                  ref={(el) => {
                    if (el) el.indeterminate = someDestinationsSelected && !allDestinationsSelected;
                  }}
                  type="checkbox"
                  checked={allDestinationsSelected}
                  onChange={(e) => toggleAllDestinations(e.currentTarget.checked)}
                  className="h-4 w-4"
                />
              )}
            </div>
            <div className="text-left">Destination <span className="text-red-500">*</span></div>
            <div className="text-left">Airfreight/kg <span className="text-red-500">*</span></div>
            <div className="text-left">Arrival Date <span className="text-red-500">*</span></div>
            <div className="text-left">Min Wt (Kg)</div>
            <div className="text-left">Max Wt (Kg)</div>
            <div />
          </div>
          
          {/* Data rows */}
          {formData.destinations.map((dest, idx) => (
            <div key={dest.id} className="grid-dest">
              <div className="flex justify-center items-center">
                {hasMultipleDestinations && (
                  <input
                    type="checkbox"
                    checked={!!dest.selected}
                    onChange={() => toggleDestinationSelected(idx)}
                    className="h-4 w-4"
                  />
                )}
              </div>
              {/* Destination (from dictionary) */}
              <DictionaryDropdown
                category="DESTINATION"
                value={dest.destination}
                onChange={(val: string) =>
                  handleDestinationChange(idx, {
                    target: { name: "destination", value: val },
                  } as any)
                }
              />
              <input
                name="airfreightPerKg"
                value={dest.airfreightPerKg} // Display the value as stored (may include $)
                onChange={(e) => handleDestinationChange(idx, e)} // Allow direct editing
                onBlur={(e) => {
                  console.log("onBlur triggered for airfreightPerKg:", e.target.value); // Debug log
                  const rawValue = e.target.value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters
                  console.log("Raw value:", rawValue); // Debug log
                  if (rawValue && parseFloat(rawValue) > 0) {
                    const formattedValue = `$${parseFloat(rawValue).toFixed(2)}`; // Format with $ prefix and two decimals
                    console.log("Formatted value:", formattedValue); // Debug log
                    // Create a new event object to ensure proper handling
                    const syntheticEvent = {
                      ...e,
                      target: {
                        ...e.target,
                        name: 'airfreightPerKg',
                        value: formattedValue
                      }
                    } as React.ChangeEvent<HTMLInputElement>;
                    handleDestinationChange(idx, syntheticEvent);
                  }
                }}
                placeholder="$0.00" // Placeholder for clarity
                required
                className="form-input border-red-300 focus:ring-red-400"
              />
              <input
                name="arrivalDate"
                type="date"
                value={dest.arrivalDate || ""}
                onChange={(e) => handleDestinationChange(idx, e)}
                required
                style={{ width: '100%', boxSizing: 'border-box', minHeight: '40px', minWidth: '140px' }}
                className="form-input border-red-300 focus:ring-red-400"
              />
              <input
                name="minWeight"
                value={dest.minWeight}
                onChange={(e) => handleDestinationChange(idx, e)}
                className="form-input"
              />
              <input
                name="maxWeight"
                value={dest.maxWeight}
                onChange={(e) => handleDestinationChange(idx, e)}
                className="form-input"
              />
              <button
                type="button"
                onClick={() => cloneDestination(idx)}
                title="Clone row"
                className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={addDestination} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded">Add Destination</button>
            <button type="button" onClick={deleteSelectedDestinations} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">Delete Selected</button>
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="text-xl font-semibold border-b pb-1 mb-2">Products</h2>

          {/* Header row */}
          <div className="grid-size-header">
            <div className="flex justify-center items-center">
              {hasMultipleSizes && (
                <input
                  ref={(el) => {
                    if (el) el.indeterminate = someSizesSelected && !allSizesSelected;
                  }}
                  type="checkbox"
                  checked={allSizesSelected}
                  onChange={(e) => toggleAllSizes(e.currentTarget.checked)}
                  className="h-4 w-4"
                />
              )}
            </div>
            <div>Fish <span className="text-red-500">*</span></div>
            <div>Cut <span className="text-red-500">*</span></div> {/* New Cut column */}
            <div>Grade <span className="text-red-500">*</span></div> {/* New Grade column */}
            <div>Wt/Fish (Kg up) <span className="text-red-500">*</span></div>
            <div>Price/kg <span className="text-red-500">*</span></div>
            <div>Quantity (Kg)</div>
          </div>

          {/* Data rows */}
          {formData.sizes.map((size, idx) => (
            <div key={size.id} className="grid-size">
              <div className="flex justify-center items-center">
                {hasMultipleSizes && (
                  <input
                    type="checkbox"
                    checked={!!size.selected}
                    onChange={() => toggleSizeSelected(idx)}
                    className="h-4 w-4"
                  />
                )}
              </div>

              {/* Fish Type (from dictionary) */}
              <FishDropdown
                value={(size as any).fishType ?? ""}
                onChange={(val: string) =>
                  handleSizeChange(idx, { target: { name: "fishType", value: val } } as any)
                }
              />

              {/* Cut Dropdown */}
              <CutDropdown
                value={size.cut ?? ""}
                onChange={(val: string) =>
                  handleSizeChange(idx, { target: { name: "cut", value: val } } as any)
                }
              />

              {/* Grade Dropdown */}
              <GradeDropdown
                value={size.grade ?? ""}
                onChange={(val: string) =>
                  handleSizeChange(idx, { target: { name: "grade", value: val } } as any)
                }
              />

              {(() => {
                const sizesForSpecies = allFishSizes.filter(fs =>
                  fs.species_name === (size as any).fishType &&
                  (fs.cut_name == null || fs.cut_name === size.cut)
                );
                if (sizesForSpecies.length > 0) {
                  return (
                    <select
                      value={size.fishSizeId ?? ''}
                      onChange={(e) => {
                        const selected = sizesForSpecies.find(fs => fs.id === Number(e.target.value));
                        if (selected) handleFishSizeSelect(idx, selected.id, String(selected.kg_label));
                      }}
                      required
                      className="form-input border-red-300 focus:ring-red-400"
                    >
                      <option value="">-- Select --</option>
                      {sizesForSpecies.map(fs => (
                        <option key={fs.id} value={fs.id}>
                          {fs.kg_max
                              ? `${parseFloat(String(fs.kg_label))}–${parseFloat(String(fs.kg_max))} kg`
                              : `${parseFloat(String(fs.kg_label))} kg`}
                        </option>
                      ))}
                    </select>
                  );
                }
                return (
                  <input
                    name="weightRange"
                    value={size.weightRange}
                    onChange={(e) => handleSizeChange(idx, e)}
                    required
                    className="form-input border-red-300 focus:ring-red-400"
                  />
                );
              })()}
              <input
                name="pricePerKg"
                value={size.pricePerKg} // Display the value as stored (may include $)
                onChange={(e) => handleSizeChange(idx, e)} // Allow direct editing
                onBlur={(e) => {
                  console.log("onBlur triggered for pricePerKg:", e.target.value); // Debug log
                  const rawValue = e.target.value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters
                  console.log("Raw value:", rawValue); // Debug log
                  if (rawValue && parseFloat(rawValue) > 0) {
                    const formattedValue = `$${parseFloat(rawValue).toFixed(2)}`; // Format with $ prefix and two decimals
                    console.log("Formatted value:", formattedValue); // Debug log
                    // Create a new event object to ensure proper handling
                    const syntheticEvent = {
                      ...e,
                      target: {
                        ...e.target,
                        name: 'pricePerKg',
                        value: formattedValue
                      }
                    } as React.ChangeEvent<HTMLInputElement>;
                    handleSizeChange(idx, syntheticEvent);
                  }
                }}
                placeholder="$0.00" // Placeholder for clarity
                required
                className="form-input border-red-300 focus:ring-red-400"
              />
              <input
                name="quantity"
                value={size.quantity}
                onChange={(e) => handleSizeChange(idx, e)}
                className="form-input"
              />
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={addSize}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded"
            >
              Add Product
            </button>
            <button
              type="button"
              onClick={deleteSelectedSizes}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              Delete Selected
            </button>
          </div>
        </div>


        {/* Notes */}
        <div>
          <textarea name="notes" placeholder="Additional Information" value={formData.notes} onChange={handleChange} className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="priceNegotiable" checked={formData.priceNegotiable} onChange={handleChange} className="h-4 w-4 text-blue-600" /> Price is negotiable
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="exclusiveOffer" checked={formData.exclusiveOffer} onChange={handleChange} className="h-4 w-4 text-blue-600" /> Exclusive offer
            </label>
          </div>
        </div>

        {/* Quote Summary Section - Only show if destinations have values */}
        {formData.destinations.some(dest => dest.destination) && (
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <h2 className="text-xl font-bold mb-4 text-blue-900">Quote Summary</h2>
            
            {(() => {
              // Group destinations by their airfreight/kg value so same-price destinations share one section
              const activeDests = formData.destinations.filter(dest => dest.destination);
              const groups = new Map<number, typeof activeDests>();
              activeDests.forEach(dest => {
                const rate = parseFloat(dest.airfreightPerKg.replace(/[^0-9.]/g, '') || "0");
                if (!groups.has(rate)) groups.set(rate, []);
                groups.get(rate)!.push(dest);
              });
              return Array.from(groups.entries()).map(([airfreightPerKg, dests]) => {
                const destsWithDate = dests.filter(d => d.arrivalDate);
                const arrivalLabel = destsWithDate.length > 0
                  ? (() => {
                      const byDate = new Map<string, string[]>();
                      destsWithDate.forEach(d => {
                        if (!byDate.has(d.arrivalDate)) byDate.set(d.arrivalDate, []);
                        byDate.get(d.arrivalDate)!.push(d.destination);
                      });
                      const parts = Array.from(byDate.entries()).map(([date, ports]) => `${ports.join(', ')}: ${date}`);
                      return ` : Arrival Date - ${parts.join(', ')}`;
                    })()
                  : '';
                return (
                  <div key={airfreightPerKg} className="mb-6 last:mb-0">
                    <h3 className="text-lg font-semibold mb-3 text-blue-800">
                      Port{arrivalLabel}
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="bg-white rounded-lg shadow" style={{width: 'auto'}}>
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            <th className="px-4 py-2 text-left text-white" style={{width: '200px'}}>Fish</th>
                            <th className="px-4 py-2 text-left text-white" style={{width: '120px'}}>Cut</th>
                            <th className="px-4 py-2 text-left text-white" style={{width: '100px'}}>Grade</th>
                            <th className="px-4 py-2 text-left text-white" style={{width: '160px'}}>Wt/Fish (Kg up)</th>
                            <th className="px-2 py-2 text-right text-white" style={{width: '110px'}}>Airfreight/kg</th>
                            <th className="px-2 py-2 text-right text-white" style={{width: '100px'}}>Price/kg</th>
                            <th className="px-2 py-2 text-right text-white" style={{width: '100px'}}>Total/kg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.sizes.map((size, sizeIndex) => {
                            const pricePerKg = parseFloat(size.pricePerKg.replace(/[^0-9.]/g, '') || "0");
                            const totalPerKg = airfreightPerKg + pricePerKg;
                            
                            return (
                              <tr key={size.id} className={sizeIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="px-4 py-2 border-t" style={{color: '#111827', width: '200px'}}>{size.fishType || '-'}</td>
                                <td className="px-4 py-2 border-t" style={{color: '#111827', width: '120px'}}>{size.cut || '-'}</td>
                                <td className="px-4 py-2 border-t" style={{color: '#111827', width: '100px'}}>{size.grade || '-'}</td>
                                <td className="px-4 py-2 border-t" style={{color: '#111827', width: '160px'}}>
                                  {size.weightRange ? `${size.weightRange} kg` : '-'}
                                </td>
                                <td className="px-2 py-2 border-t text-right" style={{color: '#111827', width: '110px'}}>${airfreightPerKg.toFixed(2)}</td>
                                <td className="px-2 py-2 border-t text-right" style={{color: '#111827', width: '100px'}}>${pricePerKg.toFixed(2)}</td>
                                <td className="px-2 py-2 border-t text-right font-semibold" style={{color: '#1e40af', width: '100px'}}>
                                  ${totalPerKg.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {dests.some(d => d.minWeight || d.maxWeight) && (
                      <p className="text-sm text-gray-600 mt-2">
                        {dests.filter(d => d.minWeight || d.maxWeight).map(d =>
                          `${d.destination}: ${d.minWeight || '–'} – ${d.maxWeight || '–'} kg`
                        ).join(' | ')}
                      </p>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`font-semibold px-4 py-2 rounded shadow ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isSubmitting ? 'Saving...' : 'Save Quote'}
        </button>
      </form>
    </div>
  );
};

export default VendorQuoteFormView;