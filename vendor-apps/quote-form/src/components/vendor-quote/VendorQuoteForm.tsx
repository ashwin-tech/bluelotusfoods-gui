import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { FormData } from './types';
import VendorQuoteFormView from './VendorQuoteFormView';
import { postVendorForm } from '../../common/PostVendorForm'; // Import the new utility
import { sendQuoteEmail } from '../../common/SendQuoteEmail'; // Import email utility

interface Props {
  initialVendorName?: string;
  initialCountry?: string;
  nextQuoteId?: number; // Add nextQuoteId prop
  onSuccess?: () => void; // Add onSuccess callback prop
}

export default function VendorQuoteForm({ initialVendorName = '', initialCountry = '', nextQuoteId, onSuccess }: Props): JSX.Element {
  const [formData, setFormData] = useState<FormData>({
    vendorName: '',
    quoteValidTill: new Date().toISOString().split("T")[0], // Prepopulate with current date
    fishType: '',
    countryOfOrigin: '',
    destinations: [{ id: cryptoRandomId(), destination: '', airfreightPerKg: '', arrivalDate: '', minWeight: '', maxWeight: '', selected: false }],
    sizes: [{ id: cryptoRandomId(), fishType: '', cut: '', grade: '', weightRange: '', pricePerKg: '', quantity: '', selected: false }],
    notes: '',
    priceNegotiable: false,
    exclusiveOffer: false,
  });

  // Add loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialVendorName || initialCountry) {
      setFormData(prev => ({
        ...prev,
        vendorName: initialVendorName || prev.vendorName,
        countryOfOrigin: initialCountry || prev.countryOfOrigin
      }));
    }
  }, [initialVendorName, initialCountry]);

  function cryptoRandomId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleAllDestinations = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.map(d => ({ ...d, selected: checked }))
    }));
  };

  const handleDestinationChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = [...prev.destinations];
      updated[index] = { ...updated[index], [name]: value };
      return { ...prev, destinations: updated };
    });
  };

  const toggleDestinationSelected = (index: number) => {
    setFormData((prev) => {
      const updated = [...prev.destinations];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return { ...prev, destinations: updated };
    });
  };

  const addDestination = () => {
    setFormData((prev) => ({
      ...prev,
      destinations: [...prev.destinations, { id: cryptoRandomId(), destination: '', airfreightPerKg: '', arrivalDate: '', minWeight: '', maxWeight: '', selected: false }],
    }));
  };

  const deleteSelectedDestinations = () => {
    setFormData((prev) => {
      const kept = prev.destinations.filter((d) => !d.selected);
      return { ...prev, destinations: kept.length > 0 ? kept : [{ id: cryptoRandomId(), destination: '', airfreightPerKg: '', arrivalDate: '', minWeight: '', maxWeight: '', selected: false }] };
    });
  };

  const toggleAllSizes = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map(d => ({ ...d, selected: checked }))
    }));
  };

  const handleSizeChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = [...prev.sizes];
      updated[index] = { ...updated[index], [name]: value };
      return { ...prev, sizes: updated };
    });
  };

  const toggleSizeSelected = (index: number) => {
    setFormData((prev) => {
      const updated = [...prev.sizes];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return { ...prev, sizes: updated };
    });
  };

  const addSize = () => {
    setFormData((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { id: cryptoRandomId(), fishType: '', cut: '', grade: '', weightRange: '', pricePerKg: '', quantity: '', selected: false }],
    }));
  };

  const deleteSelectedSizes = () => {
    setFormData((prev) => {
      const kept = prev.sizes.filter((s) => !s.selected);
      return { ...prev, sizes: kept.length > 0 ? kept : [{ id: cryptoRandomId(), fishType: '', cut: '', grade: '', weightRange: '', pricePerKg: '', quantity: '', selected: false }] };
    });
  };

  const resetForm = () => {
    setFormData({
      vendorName: initialVendorName, // Keep initial vendor name if provided
      quoteValidTill: new Date().toISOString().split("T")[0], // Reset to current date
      fishType: '',
      countryOfOrigin: initialCountry, // Keep initial country if provided
      destinations: [{ id: cryptoRandomId(), destination: '', airfreightPerKg: '', arrivalDate: '', minWeight: '', maxWeight: '', selected: false }],
      sizes: [{ id: cryptoRandomId(), fishType: '', cut: '', grade: '', weightRange: '', pricePerKg: '', quantity: '', selected: false }],
      notes: '',
      priceNegotiable: false,
      exclusiveOffer: false,
    });
  };

  // Add form validation
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.vendorName.trim()) {
      errors.push('Vendor name is required');
    }
    
    if (!formData.quoteValidTill) {
      errors.push('Quote valid till date is required');
    }

    // Validate destinations
    formData.destinations.forEach((dest, index) => {
      if (!dest.destination) {
        errors.push(`Destination ${index + 1}: Destination is required`);
      }
      if (!dest.airfreightPerKg) {
        errors.push(`Destination ${index + 1}: Airfreight per kg is required`);
      }
      if (!dest.arrivalDate) {
        errors.push(`Destination ${index + 1}: Arrival date is required`);
      }
    });

    // Validate products
    formData.sizes.forEach((size, index) => {
      if (!size.fishType) {
        errors.push(`Product ${index + 1}: Fish type is required`);
      }
      if (!size.cut) {
        errors.push(`Product ${index + 1}: Cut is required`);
      }
      if (!size.grade) {
        errors.push(`Product ${index + 1}: Grade is required`);
      }
      if (!size.weightRange) {
        errors.push(`Product ${index + 1}: Weight range is required`);
      }
      if (!size.pricePerKg) {
        errors.push(`Product ${index + 1}: Price per kg is required`);
      }
    });

    return errors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setSubmitError(validationErrors.join(', '));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        id: nextQuoteId ?? 0,
        vendor_name: formData.vendorName,
        quote_valid_till: formData.quoteValidTill,
        notes: formData.notes,
        price_negotiable: formData.priceNegotiable,
        exclusive_offer: formData.exclusiveOffer,
        destinations: formData.destinations.map((dest) => ({
          destination: dest.destination,
          airfreight_per_kg: parseFloat(dest.airfreightPerKg.replace(/[^0-9.]/g, '') || "0"), // Remove $ and parse
          arrival_date: dest.arrivalDate,
          min_weight: parseFloat(dest.minWeight || "0"),
          max_weight: parseFloat(dest.maxWeight || "0"),
        })),
        products: formData.sizes.map((size) => ({
          fish_common_name: size.fishType,
          weight_range: size.weightRange,
          cut_name: size.cut,
          grade_name: size.grade,
          price_per_kg: parseFloat(size.pricePerKg.replace(/[^0-9.]/g, '') || "0"), // Remove $ and parse
          quantity: parseInt(size.quantity || "0", 10),
        })),
      };
      console.log("Payload is ", payload);
      const result = await postVendorForm(payload);
      console.log("Form submitted successfully:", result);
      
      // Try to send email notification
      if (result && result.id) {
        try {
          console.log("📝 Form submission result:", result);
          console.log("📧 Attempting to send email notification for quote ID:", result.id);
          console.log("🔢 Quote ID type:", typeof result.id);
          const emailResult = await sendQuoteEmail(result.id);
          console.log("📬 Email notification result:", emailResult);
          
          if (emailResult.success) {
            alert("Quote submitted successfully! Email confirmation sent to vendor.");
          } else {
            alert("Quote submitted successfully! However, email notification failed to send.");
          }
        } catch (emailError: any) {
          console.warn("Email sending failed:", emailError.message);
          alert("Quote submitted successfully! However, email notification could not be sent.");
        }
      } else {
        alert("Quote submitted successfully!");
      }
      
      // Call the onSuccess callback to reload the entire form
      if (onSuccess) {
        onSuccess();
      } else {
        // Force a page reload if no callback is provided to ensure fresh quote ID
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Error submitting form:", error.message);
      setSubmitError(error.message || 'Failed to submit quote');
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const vendorNameReadOnly = !!initialVendorName; // optional: lock the input if prefilled via URL/DB
  const countryReadOnly = !!initialCountry;

  return (
    <VendorQuoteFormView
      formData={formData}
      nextQuoteId={nextQuoteId ?? null} 
      isSubmitting={isSubmitting}
      submitError={submitError}
      hasMultipleDestinations={formData.destinations.length > 1}
      hasMultipleSizes={formData.sizes.length > 1}
      handleChange={handleChange}
      handleDestinationChange={handleDestinationChange}
      handleSizeChange={handleSizeChange}
      toggleDestinationSelected={toggleDestinationSelected}
      toggleSizeSelected={toggleSizeSelected}
      addDestination={addDestination}
      addSize={addSize}
      deleteSelectedDestinations={deleteSelectedDestinations}
      deleteSelectedSizes={deleteSelectedSizes}
      handleSubmit={handleSubmit}
      toggleAllDestinations={toggleAllDestinations}
      toggleAllSizes={toggleAllSizes}
      vendorNameReadOnly={vendorNameReadOnly}
      countryReadOnly={countryReadOnly}
    />
  );
}
