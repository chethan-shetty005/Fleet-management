/**
 * WASTRAQ Modal Handlers
 */

export function initModals({ onAddVehicle, onAddFuelRecord }) {
  const addVehicleModal = document.getElementById('addVehicleModal');
  const addFuelModal = document.getElementById('addFuelModal');
  const detailModal = document.getElementById('detailModal');
  const datePickerModal = document.getElementById('datePickerModal');

  // Trigger buttons
  document.getElementById('openAddVehicleBtn')?.addEventListener('click', () => {
    addVehicleModal?.classList.add('active');
  });

  document.getElementById('openAddFuelBtn')?.addEventListener('click', () => {
    addFuelModal?.classList.add('active');
  });

  document.getElementById('datePickerBtn')?.addEventListener('click', () => {
    datePickerModal?.classList.add('active');
  });

  // Close triggers
  document.querySelectorAll('.close-modal-btn, .cancel-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addVehicleModal?.classList.remove('active');
      addFuelModal?.classList.remove('active');
      detailModal?.classList.remove('active');
      datePickerModal?.classList.remove('active');
    });
  });

  // Form submission: Add Vehicle
  document.getElementById('addVehicleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const vehicleData = {
      vehicleNo: formData.get('vehicleNo'),
      type: formData.get('type'),
      fuelType: formData.get('fuelType'),
      status: formData.get('status'),
      driver: formData.get('driver'),
      mileage: formData.get('mileage')
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
}

export function openDetailModal(title, contentHtml) {
  const detailModal = document.getElementById('detailModal');
  const detailTitle = document.getElementById('detailTitle');
  const detailContent = document.getElementById('detailContent');

  if (detailTitle) detailTitle.textContent = title;
  if (detailContent) detailContent.innerHTML = contentHtml;
  detailModal?.classList.add('active');
}
