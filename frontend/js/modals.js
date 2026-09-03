/**
 * WASTRAQ Modal Handlers
 */

export function initModals({ onAddVehicle, onAddFuelRecord, onRaiseIssue }) {
  const addVehicleModal = document.getElementById('addVehicleModal');
  const addFuelModal = document.getElementById('addFuelModal');
  const raiseIssueModal = document.getElementById('raiseIssueModal');
  const detailModal = document.getElementById('detailModal');
  const datePickerModal = document.getElementById('datePickerModal');

  // Custom Vehicle Type toggle logic
  const typeSelect = document.getElementById('addVehicleTypeSelect');
  const customTypeGroup = document.getElementById('customVehicleTypeGroup');
  const customTypeInput = document.getElementById('customVehicleTypeInput');

  function toggleCustomTypeInput() {
    if (typeSelect?.value === 'Other') {
      if (customTypeGroup) customTypeGroup.style.display = 'flex';
      if (customTypeInput) {
        customTypeInput.required = true;
        customTypeInput.focus();
      }
    } else {
      if (customTypeGroup) customTypeGroup.style.display = 'none';
      if (customTypeInput) {
        customTypeInput.required = false;
        customTypeInput.value = '';
      }
    }
  }

  typeSelect?.addEventListener('change', toggleCustomTypeInput);

  // Trigger buttons
  document.getElementById('openAddVehicleBtn')?.addEventListener('click', () => {
    addVehicleModal?.classList.add('active');
    toggleCustomTypeInput();
  });

  document.getElementById('openAddFuelBtn')?.addEventListener('click', () => {
    addFuelModal?.classList.add('active');
    const vehicleSelect = document.getElementById('fuelModalVehicleSelect');
    if (vehicleSelect) vehicleSelect.dispatchEvent(new Event('change'));
  });

  document.getElementById('openRaiseIssueBtn')?.addEventListener('click', () => {
    raiseIssueModal?.classList.add('active');
  });

  document.getElementById('datePickerBtn')?.addEventListener('click', () => {
    datePickerModal?.classList.add('active');
  });

  // Close triggers
  document.querySelectorAll('.close-modal-btn, .cancel-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addVehicleModal?.classList.remove('active');
      addFuelModal?.classList.remove('active');
      raiseIssueModal?.classList.remove('active');
      detailModal?.classList.remove('active');
      datePickerModal?.classList.remove('active');
    });
  });

  // Form submission: Add Vehicle
  document.getElementById('addVehicleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const vehicleData = {
      vehicle_code: formData.get('vehicle_code')?.trim(),
      vehicleNo: formData.get('vehicleNo')?.trim(),
      brand: formData.get('brand')?.trim() || 'Tata',
      vehicleType: formData.get('type') || formData.get('vehicleType'),
      type: formData.get('type') || formData.get('vehicleType'),
      fuelType: formData.get('fuelType'),
      serviceDueFreq: parseInt(formData.get('serviceDueFreq') || '30', 10),
      serviceDueKm: parseInt(formData.get('serviceDueKm') || '5000', 10),
      ward: parseInt(formData.get('ward') || '1', 10),
      status: formData.get('status') || 'Active',
      driver: formData.get('driver')?.trim() || '',
      mileage: parseFloat(formData.get('mileage') || '0')
    };
    await onAddVehicle(vehicleData);
    addVehicleModal?.classList.remove('active');
    e.target.reset();
  });

  // Form submission: Add Fuel Record
  document.getElementById('addFuelForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const fuelData = {
      vehicleNo: formData.get('vehicleNo'),
      fuelType: formData.get('fuelType'),
      liters: formData.get('liters'),
      amount: formData.get('amount'),
      date: formData.get('date')
    };
    await onAddFuelRecord(fuelData);
    addFuelModal?.classList.remove('active');
    e.target.reset();
  });

  // Form submission: Raise Issue
  document.getElementById('raiseIssueForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const issueData = {
      vehicleNo: formData.get('vehicleNo'),
      issue: formData.get('issue'),
      severity: formData.get('severity'),
      status: formData.get('status')
    };
    if (typeof onRaiseIssue === 'function') {
      await onRaiseIssue(issueData);
    }
    raiseIssueModal?.classList.remove('active');
    e.target.reset();
  });
}

export function openDetailModal(title, contentHtml, isLarge = false) {
  const detailModal = document.getElementById('detailModal');
  const modalCard = detailModal?.querySelector('.modal-card');
  const detailTitle = document.getElementById('detailTitle');
  const detailContent = document.getElementById('detailContent');

  if (modalCard) {
    if (isLarge) {
      modalCard.classList.add('modal-lg');
    } else {
      modalCard.classList.remove('modal-lg');
    }
  }

  if (detailTitle) detailTitle.textContent = title;
  if (detailContent) detailContent.innerHTML = contentHtml;
  detailModal?.classList.add('active');
}
