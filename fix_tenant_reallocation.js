// This is a code snippet to fix allocation issues in EditTenantScreen.js
// Replace the unit allocation code in handleSubmit with this:

// Handle unit allocation changes if needed
if (unitAllocationChanged) {
  console.log("Unit allocation changed, handling unit changes...");
  
  // Case 1: Deallocate tenant from unit
  if (tenant?.unit_id && !selectedUnit) {
    console.log(`Deallocating tenant ${tenant.id} from unit ${tenant.unit_id}`);
    const deallocateResponse = await deallocateTenantFromUnit(tenant.id, tenant.unit_id);
    if (!deallocateResponse.success) {
      Alert.alert('Error', deallocateResponse.error || 'Failed to deallocate tenant from unit');
      setLoading(false);
      return;
    }
    console.log("Tenant successfully deallocated from unit");
  } 
  // Case 2: Allocate or reallocate tenant to unit
  else if (selectedUnit) {
    // Prepare lease details for allocation or transfer
    const leaseDetails = {};
    
    const formattedLeaseStartDate = formData.lease_start_date.toISOString().split('T')[0];
    if (formattedLeaseStartDate !== tenant?.lease_start_date) {
      leaseDetails.lease_start_date = formattedLeaseStartDate;
    }
    
    const formattedLeaseEndDate = formData.lease_end_date.toISOString().split('T')[0];
    if (formattedLeaseEndDate !== tenant?.lease_end_date) {
      leaseDetails.lease_end_date = formattedLeaseEndDate;
    }
    
    const parsedSecurityDeposit = formData.security_deposit ? parseFloat(formData.security_deposit) : undefined;
    if (parsedSecurityDeposit !== tenant?.security_deposit) {
      leaseDetails.security_deposit = parsedSecurityDeposit;
    }

    // If tenant already has a unit assigned
    if (tenant?.unit_id) {
      // If moving to different unit, use transfer
      if (tenant.unit_id !== selectedUnit) {
        console.log(`Transferring tenant ${tenant.id} from unit ${tenant.unit_id} to unit ${selectedUnit}`);
        const transferResponse = await transferTenant(tenant.id, tenant.unit_id, selectedUnit, leaseDetails);
        
        if (!transferResponse.success) {
          Alert.alert('Error', transferResponse.error || 'Failed to transfer tenant to new unit');
          setLoading(false);
          return;
        }
        console.log("Tenant successfully transferred to new unit");
      } 
      // If staying in same unit but updating lease details, use PATCH for reallocation
      else {
        console.log(`Reallocating tenant ${tenant.id} in the same unit ${selectedUnit} using PATCH`);
        // The true parameter here tells the function to use PATCH instead of POST
        const reallocateResponse = await allocateTenantToUnit(tenant.id, selectedUnit, selectedProperty, leaseDetails, true);
        
        if (!reallocateResponse.success) {
          Alert.alert('Error', reallocateResponse.error || 'Failed to reallocate tenant');
          setLoading(false);
          return;
        }
        console.log("Tenant successfully reallocated");
        
        // Refresh unit details after reallocation
        await fetchUnitById(selectedUnit, true);
      }
    }
    // First-time allocation (tenant has no prior unit)
    else {
      console.log(`Allocating tenant ${tenant.id} to unit ${selectedUnit} in property ${selectedProperty}`);
      const allocateResponse = await allocateTenantToUnit(tenant.id, selectedUnit, selectedProperty, leaseDetails);
      
      if (!allocateResponse.success) {
        Alert.alert('Error', allocateResponse.error || 'Failed to allocate tenant to unit');
        setLoading(false);
        return;
      }
      console.log("Tenant successfully allocated to unit");
    }
  }
}
