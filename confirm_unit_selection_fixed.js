// Fixed version of confirmUnitSelection function for EditTenantScreen.js

// Confirm unit selection after validation
const confirmUnitSelection = (unit) => {
  setSelectedUnit(unit.id);
  setSelectedUnitObj(unit);
  setShowUnitModal(false);
  
  // Mark as changed in all cases to ensure proper reallocation happens
  setUnitAllocationChanged(true);
  
  // If this is the tenant's current unit, show a reminder that we'll use PATCH
  if (unit.id === tenant?.unit_id) {
    console.log(`Selected tenant's current unit ${unit.unit_number}. Will use PATCH for reallocation.`);
  } else {
    console.log(`Selected a different unit ${unit.unit_number}. Will use transfer or new allocation.`);
  }
  
  // Set security deposit from unit if empty
  if (!formData.security_deposit && unit.security_deposit) {
    setFormData(prev => ({
      ...prev,
      security_deposit: unit.security_deposit.toString(),
    }));
  }
};
