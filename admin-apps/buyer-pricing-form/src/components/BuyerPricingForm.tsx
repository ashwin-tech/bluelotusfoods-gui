import React, { useState, useEffect } from 'react';
import ClearingPricingForm from './ClearingPricingForm';
import SummaryTab from './SummaryTab';

// Utility function to format date with day of the week
const formatDateWithDay = (dateString: string): string => {
  if (!dateString) return '';
  
  // Parse as local date to avoid timezone issues
  // dateString format: "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  
  return `${dayName}, ${dateString}`;
};

interface Buyer {
  id: number;
  name: string;
  email: string | null;
  company_id: number;
  company_name: string;
  active: boolean;
}

interface Vendor {
  id: number;
  name: string;
}

interface Port {
  id: number;
  code: string;
  name: string;
}

interface Estimate {
  quote_id: number;
  quote_date: string;
  vendor_id: number;
  vendor_name: string;
  port: string;
  fish_species_id: number;
  common_name: string;
  scientific_name: string;
  cut_id: number;
  cut: string;
  grade_id: number;
  grade: string;
  fish_size?: string;  // Weight range from vendor quote (optional, editable)
  offer_quantity: number;  // Weight in LBS
  fish_price: number;
  freight_price: number;
  tariff_percent: number;
  margin: number;
  tariff_amount: number;
  clearing_charges: number;  // Clearing charges
  base_cost: number;
  total_price: number;
  is_selected?: boolean;  // Track checkbox selection
}

interface Props {
  apiBaseUrl: string;
}

const defaultDeliveryDates = () => {
  const from = new Date();
  from.setDate(from.getDate() + 3);
  const to = new Date();
  to.setDate(to.getDate() + 5);
  return {
    deliveryDateFrom: from.toISOString().split('T')[0],
    deliveryDateTo: to.toISOString().split('T')[0],
  };
};

interface CompanyFormState {
  selectedVendors: number[];
  selectedPorts: string[];
  dateRange: string;
  deliveryDateFrom: string;
  deliveryDateTo: string;
  buyerEmails: {name: string, email: string}[];
  selectedBuyerEmails: Set<string>; // Track selected buyer emails by email address
  estimates: Estimate[];
}

const BuyerPricingForm = ({ apiBaseUrl }: Props) => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [mainTab, setMainTab] = useState<'buyer-pricing' | 'clearing-pricing' | 'summary'>('buyer-pricing');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [selectedBuyers, setSelectedBuyers] = useState<number[]>([]);
  const [selectedCustomerTab, setSelectedCustomerTab] = useState<number | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [buyerSearch, setBuyerSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPortDropdown, setShowPortDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  
  // Expand/collapse state for vendor and quote groups
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  
  // Store vendor-level margins (vendor name -> margin value)
  const [vendorMargins, setVendorMargins] = useState<Record<string, number>>({});
  
  // Store form state per company
  const [companyFormState, setCompanyFormState] = useState<Record<number, CompanyFormState>>({});

  // Collapsible sidebar
  const [buyerPanelOpen, setBuyerPanelOpen] = useState(true);

  // Helper to get current company ID from selected tab
  const getCurrentCompanyId = (): number | null => {
    if (!selectedCustomerTab) return null;
    const buyer = buyers.find(b => b.id === selectedCustomerTab);
    return buyer?.company_id ?? null;
  };

  // Toggle vendor expansion
  const toggleVendor = (vendorName: string) => {
    setExpandedVendors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendorName)) {
        newSet.delete(vendorName);
      } else {
        newSet.add(vendorName);
      }
      return newSet;
    });
  };

  // Toggle quote expansion
  const toggleQuote = (quoteKey: string) => {
    setExpandedQuotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteKey)) {
        newSet.delete(quoteKey);
      } else {
        newSet.add(quoteKey);
      }
      return newSet;
    });
  };

  // Handle vendor-level margin change - apply to all products under this vendor
  const handleVendorMarginChange = (vendorName: string, value: string) => {
    const newMargin = parseFloat(value) || 0;
    
    // Update vendor margins state
    setVendorMargins(prev => ({
      ...prev,
      [vendorName]: newMargin
    }));
    
    // Apply margin to all estimates for this vendor
    const formState = getCurrentFormState();
    const updatedEstimates = formState.estimates.map(estimate => {
      if (estimate.vendor_name === vendorName) {
        // Recalculate total: ((Fish Price + Margin) + Tariff on (Fish Price + Margin)) + Freight Price
        const fishPriceWithMargin = estimate.fish_price + newMargin;
        const tariffAmount = (fishPriceWithMargin * estimate.tariff_percent) / 100;
        const newTotal = parseFloat((fishPriceWithMargin + tariffAmount + estimate.freight_price).toFixed(2));

        return {
          ...estimate,
          margin: newMargin,
          total_price: newTotal
        };
      }
      return estimate;
    });
    
    updateCurrentFormState({ estimates: updatedEstimates });
  };

  // Helper to get current company's form state
  const getCurrentFormState = (): CompanyFormState => {
    const companyId = getCurrentCompanyId();
    if (!companyId) {
      return {
        selectedVendors: [],
        selectedPorts: [],
        dateRange: 'This Week',
        ...defaultDeliveryDates(),
        buyerEmails: [],
        selectedBuyerEmails: new Set(),
        estimates: []
      };
    }
    return companyFormState[companyId] || {
      selectedVendors: [],
      selectedPorts: [],
      dateRange: 'This Week',
      ...defaultDeliveryDates(),
      buyerEmails: [],
      selectedBuyerEmails: new Set(),
      estimates: []
    };
  };

  // Helper to update current company's form state
  const updateCurrentFormState = (updates: Partial<CompanyFormState>) => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;
    
    setCompanyFormState(prev => ({
      ...prev,
      [companyId]: {
        ...getCurrentFormState(),
        ...updates
      }
    }));
  };

  // Fetch buyers on mount
  useEffect(() => {
    fetchBuyers();
    fetchVendors();
    fetchPorts();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.port-dropdown') && !target.closest('.vendor-dropdown')) {
        setShowPortDropdown(false);
        setShowVendorDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-load quotes when vendors, ports, or date range change
  useEffect(() => {
    if (!selectedCustomerTab) return;
    
    const companyId = getCurrentCompanyId();
    if (!companyId) return;
    
    const formState = companyFormState[companyId];
    if (formState && formState.selectedVendors.length > 0) {
      handleSearch();
    }
  }, [
    selectedCustomerTab,
    // Only track the search criteria, not the results (estimates)
    companyFormState[getCurrentCompanyId() ?? -1]?.selectedVendors,
    companyFormState[getCurrentCompanyId() ?? -1]?.selectedPorts,
    companyFormState[getCurrentCompanyId() ?? -1]?.dateRange
  ]);

  const fetchBuyers = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/buyers`);
      const data = await response.json();
      setBuyers(data);
    } catch (error) {
      console.error('Error fetching buyers:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/vendors/`);
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchPorts = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/dictionary/DESTINATION`);
      const data = await response.json();
      setPorts(data);
    } catch (error) {
      console.error('Error fetching ports:', error);
    }
  };

  const toggleCompanySelection = (companyId: number) => {
    // Get all buyer IDs for this company
    const companyBuyerIds = buyers
      .filter(b => b.company_id === companyId)
      .map(b => b.id);
    
    // Check if all buyers from this company are selected
    const allSelected = companyBuyerIds.every(id => selectedBuyers.includes(id));
    
    if (allSelected) {
      // Don't allow unchecking from sidebar - only through tab close button
      return;
    } else {
      // Select all buyers from this company
      const newSelectedBuyers = [...new Set([...selectedBuyers, ...companyBuyerIds])];
      setSelectedBuyers(newSelectedBuyers);
      
      // Auto-select the first buyer as the active tab and load its data
      if (companyBuyerIds.length > 0) {
        const firstBuyerId = companyBuyerIds[0];
        setSelectedCustomerTab(firstBuyerId);
        // Trigger the tab click handler to load company data
        handleCustomerTabClick(firstBuyerId);
      }
    }
  };

  const handleCloseTab = (companyId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab click
    
    // Check if there's data in the form (estimates, selected vendors, ports, etc.)
    const formState = companyFormState[companyId];
    const hasData = formState && (formState.estimates.length > 0 || formState.selectedVendors.length > 0 || formState.selectedPorts.length > 0);
    
    if (hasData) {
      const confirmClose = window.confirm('You have unsaved data. Are you sure you want to close this tab?');
      if (!confirmClose) {
        return;
      }
    }
    
    // Remove company state
    setCompanyFormState(prev => {
      const newState = { ...prev };
      delete newState[companyId];
      return newState;
    });
    
    // Deselect all buyers from this company
    const companyBuyerIds = buyers
      .filter(b => b.company_id === companyId)
      .map(b => b.id);
    setSelectedBuyers(prev => prev.filter(id => !companyBuyerIds.includes(id)));
    
    // If the closed tab was active, switch to another tab or clear
    const activeBuyer = buyers.find(b => b.id === selectedCustomerTab);
    if (activeBuyer && activeBuyer.company_id === companyId) {
      // Find another selected company to switch to
      const remainingBuyers = selectedBuyers.filter(id => {
        const buyer = buyers.find(b => b.id === id);
        return buyer && buyer.company_id !== companyId;
      });
      
      if (remainingBuyers.length > 0) {
        setSelectedCustomerTab(remainingBuyers[0]);
      } else {
        setSelectedCustomerTab(null);
      }
    }
  };

  // Group buyers by company
  const groupedBuyers = buyers.reduce((acc, buyer) => {
    if (!acc[buyer.company_id]) {
      acc[buyer.company_id] = {
        company_id: buyer.company_id,
        company_name: buyer.company_name,
        buyers: []
      };
    }
    acc[buyer.company_id].buyers.push(buyer);
    return acc;
  }, {} as Record<number, { company_id: number; company_name: string; buyers: Buyer[] }>);

  // Filter companies based on search
  const filteredCompanies = Object.values(groupedBuyers).filter(company =>
    company.company_name.toLowerCase().includes(buyerSearch.toLowerCase())
  );

  const handleCustomerTabClick = async (buyerId: number) => {
    setSelectedCustomerTab(buyerId);
    
    // Fetch buyer's company emails
    const buyer = buyers.find(b => b.id === buyerId);
    if (buyer) {
      try {
        const response = await fetch(`${apiBaseUrl}/buyer-pricing/company/${buyer.company_id}/buyers`);
        const companyBuyers = await response.json();
        
        // Initialize or update company state with buyer emails
        const currentState = companyFormState[buyer.company_id] || {
          selectedVendors: [],
          selectedPorts: [],
          dateRange: 'This Week',
          ...defaultDeliveryDates(),
          buyerEmails: [],
          selectedBuyerEmails: new Set(),
          estimates: []
        };
        
        setCompanyFormState(prev => ({
          ...prev,
          [buyer.company_id]: {
            ...currentState,
            buyerEmails: companyBuyers.map((b: Buyer) => ({ name: b.name, email: b.email || '' }))
          }
        }));
      } catch (error) {
        console.error('Error fetching company buyers:', error);
      }
    }
  };

  const handleSearch = async () => {
    // Get buyers for the current active tab only
    const activeBuyer = buyers.find(b => b.id === selectedCustomerTab);
    if (!activeBuyer) {
      return;
    }
    
    // Get current form state
    const formState = getCurrentFormState();
    
    // Get all buyer IDs from the active company
    const currentCompanyBuyerIds = buyers
      .filter(b => b.company_id === activeBuyer.company_id)
      .map(b => b.id);
    
    if (currentCompanyBuyerIds.length === 0 || formState.selectedVendors.length === 0) {
      setToast({ type: 'error', message: 'Please select at least one vendor' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/estimates/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyer_ids: currentCompanyBuyerIds, // Use only current company's buyers
          vendor_ids: formState.selectedVendors,
          port_codes: formState.selectedPorts,
          date_range: formState.dateRange
        })
      });

      const data = await response.json();
      const newEstimates = data.estimates || [];
      
      // Preserve existing margins and selections when updating with fresh data
      const existingEstimates = formState.estimates;
      const mergedEstimates = newEstimates.map((newEst: Estimate) => {
        // Find matching estimate by quote_id, vendor, port, fish, cut, grade
        const existing = existingEstimates.find((e: Estimate) => 
          e.quote_id === newEst.quote_id &&
          e.vendor_id === newEst.vendor_id &&
          e.port === newEst.port &&
          e.fish_species_id === newEst.fish_species_id &&
          e.cut_id === newEst.cut_id &&
          e.grade_id === newEst.grade_id
        );
        
        if (existing) {
          // Preserve margin and selection from existing
          return {
            ...newEst,
            margin: existing.margin,
            is_selected: existing.is_selected
          };
        }
        
        return newEst;
      });
      
      updateCurrentFormState({ estimates: mergedEstimates });
    } catch (error) {
      console.error('Error searching estimates:', error);
      setToast({ type: 'error', message: 'Error fetching estimates' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEstimate = async () => {
    // Get all unique company IDs from selected buyers
    const allCompanyIds = [...new Set(
      selectedBuyers
        .map(buyerId => buyers.find(b => b.id === buyerId))
        .filter(buyer => buyer !== undefined)
        .map(buyer => buyer!.company_id)
    )];

    if (allCompanyIds.length === 0) {
      setToast({ type: 'error', message: 'No companies selected' });
      return;
    }

    // Check each company for selected quotes
    const companiesWithSelections: Array<{
      companyId: number;
      companyName: string;
      buyerId: number;
      buyerName: string;
      buyerIds: number[];
      selectedCount: number;
    }> = [];

    allCompanyIds.forEach(companyId => {
      const formState = companyFormState[companyId];
      if (formState && formState.estimates) {
        const selectedEstimates = formState.estimates.filter((e: Estimate) => e.is_selected);
        if (selectedEstimates.length > 0) {
          // Get buyers for this company that have their emails selected in the form
          const companyBuyers = buyers.filter(b => b.company_id === companyId);
          
          // Convert selectedBuyerEmails (Set of email strings) to buyer IDs
          const selectedBuyerIdsForCompany = companyBuyers
            .filter(buyer => buyer.email && formState.selectedBuyerEmails.has(buyer.email))
            .map(buyer => buyer.id);
          
          const firstBuyer = companyBuyers[0];
          if (firstBuyer) {
            companiesWithSelections.push({
              companyId,
              companyName: firstBuyer.company_name,
              buyerId: firstBuyer.id,
              buyerName: firstBuyer.name,
              buyerIds: selectedBuyerIdsForCompany.length > 0 ? selectedBuyerIdsForCompany : [firstBuyer.id],
              selectedCount: selectedEstimates.length
            });
          }
        }
      }
    });

    if (companiesWithSelections.length === 0) {
      setToast({ type: 'error', message: 'No quotes selected. Please select at least one quote using the checkboxes.' });
      return;
    }

    setLoading(true);
    const savedEstimates: string[] = [];
    const failedEstimates: Array<{company: string, error: string}> = [];

    try {
      // Save estimate for each company
      for (const company of companiesWithSelections) {
        try {
          const formState = companyFormState[company.companyId];
          const selectedEstimates = formState.estimates.filter((e: Estimate) => e.is_selected);

          // For each selected estimate, calculate clearing charges with 3 tiers
          const itemsToSave = await Promise.all(
            selectedEstimates.map(async (estimate: any) => {
              // Call clearing calculator to get 3 tiers
              const clearingResponse = await fetch(`${apiBaseUrl}/buyer-pricing/clearing-calculator/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fish_price: estimate.fish_price,
                  freight_price: estimate.freight_price,
                  tariff_percent: estimate.tariff_percent,
                  fish_species_id: estimate.fish_species_id || 1,
                  margin: estimate.margin || 0
                })
              });

              const clearingData = await clearingResponse.json();
              
              // Create 3 items (one for each tier)
              const tiers = ['tier_10k', 'tier_20k', 'tier_30k'];
              return tiers.map(tierKey => {
                const tier = clearingData.tiers[tierKey];
                return {
                  vendor_id: estimate.vendor_id,
                  quote_id: estimate.quote_id,
                  port_code: estimate.port,
                  fish_species_id: estimate.fish_species_id || 1,
                  cut_id: estimate.cut_id || 1,
                  grade_id: estimate.grade_id || 1,
                  fish_size: estimate.fish_size || null,
                  fish_price: estimate.fish_price,
                  freight_price: estimate.freight_price,
                  tariff_percent: estimate.tariff_percent,
                  margin: estimate.margin || 0,
                  clearing_charges: tier.clearing_per_lb,
                  offer_quantity: tier.offer_quantity_lbs
                };
              });
            })
          );

          // Flatten the array (each estimate creates 3 items)
          const flattenedItems = itemsToSave.flat();

          // Save to buyer_estimate table
          const saveResponse = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_id: company.companyId,
              buyer_id: company.buyerId,
              buyer_ids: company.buyerIds.join(','), // Send as comma-separated string
              items: flattenedItems,
              notes: `Estimate for ${company.buyerName}`,
              delivery_date_from: formState.deliveryDateFrom || null,
              delivery_date_to: formState.deliveryDateTo || null,
              region_groups: []
            })
          });

          const saveData = await saveResponse.json();
          
          if (saveData.success) {
            savedEstimates.push(`${company.companyName}: ${saveData.estimate_number}`);
          } else {
            failedEstimates.push({
              company: company.companyName,
              error: saveData.detail || 'Unknown error'
            });
          }
        } catch (error) {
          failedEstimates.push({
            company: company.companyName,
            error: String(error)
          });
        }
      }

      // Show results
      let message = '';
      if (savedEstimates.length > 0) {
        message += `✓ Successfully saved ${savedEstimates.length} estimate${savedEstimates.length > 1 ? 's' : ''}:\n\n${savedEstimates.join('\n')}`;
      }
      if (failedEstimates.length > 0) {
        if (message) message += '\n\n';
        message += `✗ Failed to save ${failedEstimates.length} estimate${failedEstimates.length > 1 ? 's' : ''}:\n\n${failedEstimates.map(f => `${f.company}: ${f.error}`).join('\n')}`;
      }
      
      const toastType = failedEstimates.length === 0 ? 'success' : 'error';
      const toastMsg = failedEstimates.length === 0
        ? `${savedEstimates.length} estimate${savedEstimates.length > 1 ? 's' : ''} saved successfully`
        : `${savedEstimates.length} saved, ${failedEstimates.length} failed: ${failedEstimates.map(f => f.company).join(', ')}`;
      setToast({ type: toastType, message: toastMsg });

    } catch (error) {
      console.error('Error saving estimates:', error);
      setToast({ type: 'error', message: 'Error saving estimates. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarginChange = (index: number, value: string) => {
    const formState = getCurrentFormState();
    const updatedEstimates = [...formState.estimates];
    const estimate = updatedEstimates[index];
    const newMargin = parseFloat(value) || 0;
    
    // Recalculate total: ((Fish Price + Margin) + Tariff on (Fish Price + Margin)) + Freight Price
    const fishPriceWithMargin = estimate.fish_price + newMargin;
    const tariffAmount = (fishPriceWithMargin * estimate.tariff_percent) / 100;
    const newTotal = parseFloat((fishPriceWithMargin + tariffAmount + estimate.freight_price).toFixed(2));

    updatedEstimates[index] = {
      ...estimate,
      margin: newMargin,
      total_price: newTotal
    };
    updateCurrentFormState({ estimates: updatedEstimates });
  };

  const handleTotalChange = (index: number, value: string) => {
    const formState = getCurrentFormState();
    const updatedEstimates = [...formState.estimates];
    const estimate = updatedEstimates[index];
    const newTotal = parseFloat((parseFloat(value) || 0).toFixed(2));

    // Reverse-calculate margin from total
    // total = (fish_price + margin) * (1 + tariff%/100) + freight_price
    const tariffFactor = 1 + (estimate.tariff_percent / 100);
    const newMargin = parseFloat(
      (((newTotal - estimate.freight_price) / tariffFactor) - estimate.fish_price).toFixed(4)
    );

    updatedEstimates[index] = {
      ...estimate,
      margin: newMargin,
      total_price: newTotal,
    };
    updateCurrentFormState({ estimates: updatedEstimates });
  };

  const handleSizeChange = (index: number, value: string) => {
    const formState = getCurrentFormState();
    const updatedEstimates = [...formState.estimates];
    updatedEstimates[index] = {
      ...updatedEstimates[index],
      fish_size: value
    };
    updateCurrentFormState({ estimates: updatedEstimates });
  };

  const handleCheckboxChange = (index: number, checked: boolean) => {
    const formState = getCurrentFormState();
    const updatedEstimates = [...formState.estimates];
    updatedEstimates[index] = {
      ...updatedEstimates[index],
      is_selected: checked
    };
    updateCurrentFormState({ estimates: updatedEstimates });
  };

  const handleBuyerEmailCheckboxChange = (email: string, checked: boolean) => {
    const formState = getCurrentFormState();
    const updatedSelection = new Set(formState.selectedBuyerEmails);
    
    if (checked) {
      updatedSelection.add(email);
    } else {
      updatedSelection.delete(email);
    }
    
    updateCurrentFormState({ selectedBuyerEmails: updatedSelection });
  };

  const handleCloneToOtherCompanies = () => {
    const currentCompanyId = getCurrentCompanyId();
    if (!currentCompanyId) return;

    const currentState = getCurrentFormState();
    
    // Get all other selected company IDs (excluding current)
    const otherCompanyIds = [...new Set(
      selectedBuyers
        .map(buyerId => buyers.find(b => b.id === buyerId))
        .filter(buyer => buyer !== undefined && buyer.company_id !== currentCompanyId)
        .map(buyer => buyer!.company_id)
    )];

    if (otherCompanyIds.length === 0) {
      setToast({ type: 'error', message: 'No other companies selected to clone to.' });
      return;
    }

    // Clone the form state to other companies
    setCompanyFormState(prev => {
      const updated = { ...prev };
      
      otherCompanyIds.forEach(companyId => {
        const existingState = updated[companyId] || {
          selectedVendors: [],
          selectedPorts: [],
          dateRange: 'This Week',
          ...defaultDeliveryDates(),
          buyerEmails: [],
          selectedBuyerEmails: new Set(),
          estimates: []
        };
        
        // Deep clone estimates to preserve margins and selections
        const clonedEstimates = currentState.estimates.map(estimate => ({
          ...estimate,
          // Preserve margin and is_selected from current state
          margin: estimate.margin,
          is_selected: estimate.is_selected
        }));
        
        // Clone form selections including estimates with margins and selections
        updated[companyId] = {
          ...existingState,
          selectedVendors: [...currentState.selectedVendors],
          selectedPorts: [...currentState.selectedPorts],
          dateRange: currentState.dateRange,
          deliveryDateFrom: currentState.deliveryDateFrom,
          deliveryDateTo: currentState.deliveryDateTo,
          // Keep existing buyer emails
          // Clone estimates with margins and selections
          estimates: clonedEstimates
        };
      });
      
      return updated;
    });

    setToast({ type: 'success', message: `Selections cloned to ${otherCompanyIds.length} other ${otherCompanyIds.length === 1 ? 'company' : 'companies'}` });
  };

  useEffect(() => {
    if (toast?.type === 'success') {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Get current form state for rendering
  const currentFormState = getCurrentFormState();
  const selectedPorts = currentFormState.selectedPorts;
  const selectedVendors = currentFormState.selectedVendors;
  const dateRange = currentFormState.dateRange;
  const buyerEmails = currentFormState.buyerEmails;
  const selectedBuyerEmails = currentFormState.selectedBuyerEmails;
  const estimates = currentFormState.estimates;

  return (
    <div className="w-full min-h-screen p-4 bg-gray-50">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, minWidth: '320px', maxWidth: '600px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderRadius: '10px',
          backgroundColor: toast.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: toast.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '13px', fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <span>{toast.type === 'success' ? '✅' : '❌'} {toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: 'inherit', marginLeft: '16px' }}>×</button>
        </div>
      )}
      <div className="w-full bg-white shadow-md rounded-lg space-y-4">
      {/* Main Tabs - Buyer Pricing / Clearing Pricing */}
      <div className="border-b-2 border-gray-200 px-4 pt-4">
        <div className="flex space-x-1">
          <button
            onClick={() => setMainTab('buyer-pricing')}
            className={`px-6 py-3 font-medium transition-colors ${
              mainTab === 'buyer-pricing'
                ? 'border-b-2 border-blue-500 text-blue-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Buyer Pricing
          </button>
          <button
            onClick={() => setMainTab('clearing-pricing')}
            className={`px-6 py-3 font-medium transition-colors ${
              mainTab === 'clearing-pricing'
                ? 'border-b-2 border-blue-500 text-blue-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Clearing Pricing
          </button>
          <button
            onClick={() => setMainTab('summary')}
            className={`px-6 py-3 font-medium transition-colors ${
              mainTab === 'summary'
                ? 'border-b-2 border-blue-500 text-blue-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Summary
          </button>
        </div>
      </div>

      {/* Buyer Pricing Tab Content */}
      {mainTab === 'buyer-pricing' && (
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px' }}>
        {/* Left Sidebar - Buyer List (collapsible) */}
        <div style={{
          width: buyerPanelOpen ? '220px' : '0px',
          minWidth: buyerPanelOpen ? '220px' : '0px',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
          flexShrink: 0,
        }}>
          <div style={{ borderRight: '1px solid #e5e7eb', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search"
              value={buyerSearch}
              onChange={(e) => setBuyerSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredCompanies.map((company) => {
              const allBuyersSelected = company.buyers.every(b => selectedBuyers.includes(b.id));
                return (
                  <label key={company.company_id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={allBuyersSelected}
                      onChange={() => toggleCompanySelection(company.company_id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">
                      {company.company_name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

          {/* Main Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Toggle button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <button
                onClick={() => setBuyerPanelOpen(prev => !prev)}
                title={buyerPanelOpen ? 'Hide buyer list' : 'Show buyer list'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {buyerPanelOpen
                    ? <><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></>
                    : <><path d="M13 7l5 5-5 5"/><path d="M6 7l5 5-5 5"/></>
                  }
                </svg>
                {buyerPanelOpen ? 'Hide Buyers' : `Buyers (${filteredCompanies.length})`}
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b mb-4">
              <div className="flex space-x-4">
                {/* Get unique companies from selected buyers */}
                {[...new Set(
                  selectedBuyers
                    .map(buyerId => buyers.find(b => b.id === buyerId))
                    .filter(buyer => buyer !== undefined)
                    .map(buyer => buyer!.company_id)
                )].map(companyId => {
                  const buyer = buyers.find(b => b.company_id === companyId);
                  const isActive = buyers.find(b => b.id === selectedCustomerTab)?.company_id === companyId;
                  
                  return (
                    <div
                      key={companyId}
                      className={`flex items-center px-4 py-2 -mb-px cursor-pointer group ${
                        isActive
                          ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      onClick={() => {
                        // Set the first buyer of this company as the active tab
                        const firstBuyer = buyers.find(b => b.company_id === companyId && selectedBuyers.includes(b.id));
                        if (firstBuyer) {
                          handleCustomerTabClick(firstBuyer.id);
                        }
                      }}
                    >
                      <span>{buyer?.company_name}</span>
                      <button
                        onClick={(e) => handleCloseTab(companyId, e)}
                        className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none"
                        title="Close tab"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedCustomerTab && (
              <div>
                {/* Port and Date Range Filter */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <span className="font-medium">PORT:</span>
                      <div className="relative port-dropdown">
                        <button
                          onClick={() => setShowPortDropdown(!showPortDropdown)}
                          className="border border-gray-300 rounded-md px-3 py-2 min-w-[200px] text-left bg-white flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <span className="text-sm">
                            {selectedPorts.length > 0 
                              ? `${selectedPorts.length} selected: ${selectedPorts.join(', ')}`
                              : 'Select ports...'}
                          </span>
                          <span className="ml-2">▼</span>
                        </button>
                        {showPortDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {ports.map(port => (
                              <label key={port.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedPorts.includes(port.code)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      updateCurrentFormState({ selectedPorts: [...selectedPorts, port.code] });
                                    } else {
                                      updateCurrentFormState({ selectedPorts: selectedPorts.filter((p: string) => p !== port.code) });
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-sm">{port.code} - {port.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="font-medium">Range:</span>
                    <select
                      value={dateRange}
                      onChange={(e) => updateCurrentFormState({ dateRange: e.target.value })}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="This Week">This Week</option>
                      <option value="Last Week">Last Week</option>
                      <option value="This Month">This Month</option>
                    </select>
                    
                    {/* Clone Button */}
                    <button
                      onClick={handleCloneToOtherCompanies}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium"
                      title="Clone selections to other companies"
                    >
                      📋 Clone
                    </button>
                  </div>
                </div>

                {/* Buyer Emails Table */}
                <div className="mb-4 border border-gray-300 rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left border-b border-gray-300">Select</th>
                        <th className="px-4 py-2 text-left border-b border-gray-300">Name</th>
                        <th className="px-4 py-2 text-left border-b border-gray-300">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyerEmails.map((buyer, idx) => (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="px-4 py-2">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4"
                              checked={selectedBuyerEmails.has(buyer.email)}
                              onChange={(e) => handleBuyerEmailCheckboxChange(buyer.email, e.target.checked)}
                            />
                          </td>
                          <td className="px-4 py-2">{buyer.name}</td>
                          <td className="px-4 py-2">{buyer.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vendor Selection */}
                <div className="mb-4">
                  <label className="block mb-2 font-medium">Select Vendors:</label>
                  <div className="relative vendor-dropdown">
                    <button
                      onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-left bg-white flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <span className="text-sm">
                        {selectedVendors.length > 0 
                          ? `${selectedVendors.length} vendor(s) selected: ${vendors.filter(v => selectedVendors.includes(v.id)).map(v => v.name).join(', ')}`
                          : 'Select vendors...'}
                      </span>
                      <span className="ml-2">▼</span>
                    </button>
                    {showVendorDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {vendors.map(vendor => (
                          <label key={vendor.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedVendors.includes(vendor.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  updateCurrentFormState({ selectedVendors: [...selectedVendors, vendor.id] });
                                } else {
                                  updateCurrentFormState({ selectedVendors: selectedVendors.filter((v: number) => v !== vendor.id) });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{vendor.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Estimates Table */}
                <div className="border border-gray-300 rounded-md mb-4 overflow-hidden">
                  <div className="font-medium px-4 py-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                    <span>Vendor Quotes</span>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 text-sm font-normal">
                        <span>Delivery From: <span className="text-red-500">*</span></span>
                        <input
                          type="date"
                          value={currentFormState.deliveryDateFrom}
                          onChange={(e) => updateCurrentFormState({ deliveryDateFrom: e.target.value })}
                          style={{ minWidth: '140px', boxSizing: 'border-box' }}
                          className={`border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${!currentFormState.deliveryDateFrom ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {currentFormState.deliveryDateFrom && (
                          <span className="text-xs text-blue-600">
                            ({formatDateWithDay(currentFormState.deliveryDateFrom).split(',')[0]})
                          </span>
                        )}
                      </label>
                      <label className="flex items-center space-x-2 text-sm font-normal">
                        <span>To: <span className="text-red-500">*</span></span>
                        <input
                          type="date"
                          value={currentFormState.deliveryDateTo}
                          onChange={(e) => updateCurrentFormState({ deliveryDateTo: e.target.value })}
                          style={{ minWidth: '140px', boxSizing: 'border-box' }}
                          className={`border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${!currentFormState.deliveryDateTo ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {currentFormState.deliveryDateTo && (
                          <span className="text-xs text-blue-600">
                            ({formatDateWithDay(currentFormState.deliveryDateTo).split(',')[0]})
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Quote#</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Quote Date</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Port</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Common Name</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Scientific Name</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Cut</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Grade</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Size (LBS)</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Fish Price</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Margin</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Freight Price</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Tariff %</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Total</th>
                          <th className="px-4 py-2 text-left border-b border-gray-300">Select</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Group estimates by vendor
                          const groupedByVendor: Record<string, Estimate[]> = {};
                          estimates.forEach(estimate => {
                            if (!groupedByVendor[estimate.vendor_name]) {
                              groupedByVendor[estimate.vendor_name] = [];
                            }
                            groupedByVendor[estimate.vendor_name].push(estimate);
                          });

                          // Render grouped rows with vendor headers
                          return Object.entries(groupedByVendor).map(([vendorName, vendorEstimates]) => {
                            const isVendorExpanded = expandedVendors.has(vendorName);
                            
                            // Group vendor's estimates by Quote# and Port
                            const groupedByQuotePort: Record<string, Estimate[]> = {};
                            vendorEstimates.forEach(estimate => {
                              const key = `${estimate.quote_id}-${estimate.port}`;
                              if (!groupedByQuotePort[key]) {
                                groupedByQuotePort[key] = [];
                              }
                              groupedByQuotePort[key].push(estimate);
                            });

                            return (
                              <React.Fragment key={vendorName}>
                                {/* Vendor Name Header Row with expand/collapse */}
                                <tr className="bg-blue-50 border-t-2 border-blue-200">
                                  <td 
                                    colSpan={1} 
                                    className="px-4 py-2 cursor-pointer hover:text-blue-700"
                                    onClick={() => toggleVendor(vendorName)}
                                  >
                                    <span className="inline-block w-4">{isVendorExpanded ? '▼' : '▶'}</span>
                                  </td>
                                  <td 
                                    colSpan={8} 
                                    className="px-4 py-2 font-semibold text-blue-900 cursor-pointer hover:text-blue-700"
                                    onClick={() => toggleVendor(vendorName)}
                                  >
                                    {vendorName}
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center">
                                      <span className="mr-1">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={vendorMargins[vendorName] || 0}
                                        onChange={(e) => handleVendorMarginChange(vendorName, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </td>
                                  <td colSpan={5}></td>
                                </tr>
                                {/* Quote# and Port subgroups - only show if vendor is expanded */}
                                {isVendorExpanded && Object.entries(groupedByQuotePort).map(([quotePortKey, quoteEstimates]) => {
                                  const firstEstimate = quoteEstimates[0];
                                  const isQuoteExpanded = expandedQuotes.has(quotePortKey);
                                  
                                  return (
                                    <React.Fragment key={quotePortKey}>
                                      {/* Quote# and Port Header Row with expand/collapse */}
                                      <tr className="bg-gray-100 border-t border-gray-300 cursor-pointer hover:bg-gray-200" onClick={() => toggleQuote(quotePortKey)}>
                                        <td colSpan={14} className="px-4 py-1.5 font-medium text-gray-700 text-sm">
                                          <span className="inline-block w-4 mr-2">{isQuoteExpanded ? '▼' : '▶'}</span>
                                          Quote# {firstEstimate.quote_id} | {firstEstimate.quote_date} | Port: {firstEstimate.port}
                                        </td>
                                      </tr>
                                      {/* Quote's Products - only show if quote is expanded */}
                                      {isQuoteExpanded && quoteEstimates.map((estimate) => {
                                const globalIdx = estimates.indexOf(estimate);
                                return (
                                  <tr key={globalIdx} className="border-t border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-2">{estimate.quote_id}</td>
                                    <td className="px-4 py-2">{estimate.quote_date}</td>
                                    <td className="px-4 py-2">{estimate.port}</td>
                                    <td className="px-4 py-2">{estimate.common_name}</td>
                                    <td className="px-4 py-2 italic text-gray-600">{estimate.scientific_name}</td>
                                    <td className="px-4 py-2">{estimate.cut}</td>
                                    <td className="px-4 py-2">{estimate.grade}</td>
                                    <td className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={estimate.fish_size || ''}
                                        onChange={(e) => handleSizeChange(globalIdx, e.target.value)}
                                        placeholder="Enter size"
                                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                      />
                                    </td>
                                    <td className="px-4 py-2">${estimate.fish_price.toFixed(2)}</td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center">
                                        <span className="mr-1">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={parseFloat(estimate.margin.toFixed(2))}
                                          onChange={(e) => handleMarginChange(globalIdx, e.target.value)}
                                          className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">${estimate.freight_price.toFixed(2)}</td>
                                    <td className="px-4 py-2">{estimate.tariff_percent}%</td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center">
                                        <span className="mr-1">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={parseFloat(estimate.total_price.toFixed(2))}
                                          onChange={(e) => handleTotalChange(globalIdx, e.target.value)}
                                          className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4"
                                        checked={estimate.is_selected || false}
                                        onChange={(e) => handleCheckboxChange(globalIdx, e.target.checked)}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                                    </React.Fragment>
                                  );
                                })}
                              </React.Fragment>
                            );
                          });
                        })()}
                        {estimates.length === 0 && (
                          <tr>
                            <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                              {loading ? 'Loading...' : 'Select vendors and click search to see estimates'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Save Estimate Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveEstimate}
                    disabled={loading || estimates.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    {loading ? 'Saving...' : 'Save Estimate'}
                  </button>
                </div>
              </div>
            )}

            {!selectedCustomerTab && selectedBuyers.length > 0 && (
              <div className="text-center text-gray-500 py-12">
                Click on a customer tab above to view details
              </div>
            )}

            {selectedBuyers.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                {buyerPanelOpen ? 'Select customers from the left to begin' : 'Click "Buyers" to show customer list'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clearing Pricing Tab Content */}
      {mainTab === 'clearing-pricing' && (
        <ClearingPricingForm apiBaseUrl={apiBaseUrl} />
      )}

      {/* Summary Tab Content */}
      {mainTab === 'summary' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Estimate Summary</h2>
          <SummaryTab companies={filteredCompanies} apiBaseUrl={apiBaseUrl} />
        </div>
      )}
      </div>
    </div>
  );
};

export default BuyerPricingForm;


