const bookingForm = document.getElementById('bookingForm');
const checkIn = document.getElementById('checkIn');
const checkOut = document.getElementById('checkOut');
const totalPrice = document.getElementById('totalPrice');
const nightCount = document.getElementById('nightCount');
const roomType = document.getElementById('roomType');
const roomPrices = { 'Deluxe Room': 1000, 'Standard Room': 1500, 'Family Room': 2500 };
const roomGuests = { 'Deluxe Room': '3–5 guests', 'Standard Room': '1–2 guests', 'Family Room': '4–6 guests' };
const guestLimits = { 'Deluxe Room': [3, 5], 'Standard Room': [1, 2], 'Family Room': [4, 6] };
const bookingMessage = document.getElementById('bookingMessage');
const confirmDialog = document.getElementById('confirmDialog');
const loginDialog = document.getElementById('loginDialog');
let pendingBooking = null;
let bookings = JSON.parse(localStorage.getItem('havenBookings') || '[]');

const today = new Date();
const todayString = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
checkIn.min = todayString;
checkOut.min = todayString;

function isSameDayOrOverlapping(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function isDateRangeAvailable(start, end, selectedRoom) {
  return !bookings.some(function (booking) {
    if (booking.room !== selectedRoom) return false;
    return isSameDayOrOverlapping(start, end, booking.checkIn, booking.checkOut);
  });
}

function refreshDateAvailability() {
  const room = roomType.value;
  const existing = bookings.filter(function (booking) { return booking.room === room; });
  const note = document.getElementById('availabilityNote');
  const start = checkIn.value;
  const end = checkOut.value;
  if (start && end && end > start && !isDateRangeAvailable(start, end, room)) {
    note.textContent = 'Those dates are already booked for this room type. Please choose another date range.';
    note.style.color = '#a33b32';
  } else {
    note.textContent = existing.length
      ? 'Availability is checked against saved reservations for this room type. Choose dates that do not overlap existing bookings.'
      : 'No saved reservations currently block this room type. Choose your dates to continue.';
    note.style.color = '';
  }
}

function getNightCount() {
  if (!checkIn.value || !checkOut.value) return 1;
  const start = new Date(checkIn.value + 'T00:00:00');
  const end = new Date(checkOut.value + 'T00:00:00');
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

function updateTotal() {
  const nights = getNightCount();
  const pricePerNight = roomPrices[roomType.value] || 1000;
  totalPrice.textContent = '₱' + (nights * pricePerNight).toLocaleString('en-PH');
  nightCount.textContent = nights + (nights === 1 ? ' night' : ' nights');
  document.getElementById('selectedRoomLabel').textContent = roomType.value;
  document.getElementById('selectedRoomFacts').textContent = '₱' + pricePerNight.toLocaleString('en-PH') + ' per night · ' + roomGuests[roomType.value];
  const guestSelect = document.getElementById('guests');
  const previousGuests = Number(guestSelect.value);
  const limits = guestLimits[roomType.value] || [1, 2];
  guestSelect.innerHTML = '';
  for (let count = limits[0]; count <= limits[1]; count++) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = String(count);
    guestSelect.appendChild(option);
  }
  guestSelect.value = String(Math.min(limits[1], Math.max(limits[0], previousGuests)));
}

checkIn.addEventListener('change', function () {
  checkOut.min = checkIn.value || todayString;
  if (checkOut.value && checkOut.value <= checkIn.value) {
    checkOut.value = '';
  }
  updateTotal();
  refreshDateAvailability();
});
checkOut.addEventListener('change', function () { updateTotal(); refreshDateAvailability(); });
roomType.addEventListener('change', function () { updateTotal(); refreshDateAvailability(); });

document.querySelectorAll('.choose-room').forEach(function (button) {
  button.addEventListener('click', function () {
    roomType.value = button.dataset.room;
    updateTotal();
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('bookDeluxe').addEventListener('click', function () {
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
});

bookingForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const nameInput = document.getElementById('guestName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  nameInput.value = nameInput.value.trim().replace(/\s+/g, ' ');
  emailInput.value = emailInput.value.trim();
  phoneInput.value = phoneInput.value.trim();
  if (!nameInput.checkValidity()) {
    nameInput.reportValidity();
    bookingMessage.textContent = 'Please enter a valid full name.';
    return;
  }
  if (!emailInput.checkValidity() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailInput.value)) {
    emailInput.setCustomValidity('Enter a valid email address, such as name@example.com.');
    emailInput.reportValidity();
    emailInput.setCustomValidity('');
    bookingMessage.textContent = 'Please enter a valid email address.';
    return;
  }
  if (!phoneInput.checkValidity()) {
    phoneInput.reportValidity();
    bookingMessage.textContent = 'Please enter a valid Philippine mobile number.';
    return;
  }
  if (checkIn.value < todayString) {
    bookingMessage.textContent = 'Please choose today or a future check-in date.';
    return;
  }
  if (!checkOut.value || checkOut.value <= checkIn.value) {
    bookingMessage.textContent = 'Check-out must be at least one day after check-in.';
    return;
  }
  if (!isDateRangeAvailable(checkIn.value, checkOut.value, roomType.value)) {
    bookingMessage.textContent = 'Those dates are unavailable for this room type. Please choose another date range.';
    refreshDateAvailability();
    return;
  }

  const nights = getNightCount();
  pendingBooking = {
    name: nameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    room: roomType.value,
    checkIn: checkIn.value,
    checkOut: checkOut.value,
    guests: document.getElementById('guests').value,
    time: document.getElementById('arrivalTime').value,
    nights: nights,
    total: nights * (roomPrices[roomType.value] || 1000)
  };

  document.getElementById('confirmDetails').innerHTML =
    '<p><strong>Guest:</strong> ' + escapeText(pendingBooking.name) + '</p>' +
    '<p><strong>Email:</strong> ' + escapeText(pendingBooking.email) + '</p>' +
    '<p><strong>Contact:</strong> ' + escapeText(pendingBooking.phone) + '</p>' +
    '<p><strong>Room:</strong> ' + escapeText(pendingBooking.room) + '</p>' +
    '<p><strong>Dates:</strong> ' + pendingBooking.checkIn + ' to ' + pendingBooking.checkOut + '</p>' +
    '<p><strong>Guests:</strong> ' + pendingBooking.guests + '</p>' +
    '<p><strong>Arrival:</strong> ' + pendingBooking.time + '</p>' +
    '<p><strong>Length of stay:</strong> ' + nights + (nights === 1 ? ' night' : ' nights') + '</p>' +
    '<p><strong>Estimated total:</strong> ₱' + pendingBooking.total.toLocaleString('en-PH') + '</p>';
  confirmDialog.showModal();
});

function escapeText(text) {
  return String(text).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

function renderBookings() {
  const rows = document.getElementById('bookingRows');
  document.getElementById('reservationCount').textContent = bookings.length;
  if (bookings.length === 0) {
    rows.innerHTML = '<tr><td colspan="8" class="empty-row">No bookings yet. Try the reservation form above.</td></tr>';
  } else {
    rows.innerHTML = bookings.map(function (booking) {
      return '<tr><td>' + escapeText(booking.name) + '</td><td>' + escapeText(booking.room || 'Deluxe Room') + '</td><td>' + escapeText(booking.checkIn) + '</td><td>' + escapeText(booking.checkOut) + '</td><td>' + escapeText(booking.guests) + '</td><td>₱' + Number(booking.total || 0).toLocaleString('en-PH') + '</td><td>' + escapeText(booking.bookedAt || 'Previously saved') + '</td><td><span class="status">Demo saved</span></td></tr>';
    }).join('');
  }
  renderRoomStocks();
}

function renderRoomStocks() {
  const inventory = [
    { room: 'Deluxe Room', total: 12, rate: 1000 },
    { room: 'Standard Room', total: 14, rate: 1500 },
    { room: 'Family Room', total: 16, rate: 2500 }
  ];
  document.getElementById('stockRows').innerHTML = inventory.map(function (item) {
    const reserved = bookings.filter(function (booking) { return (booking.room || 'Deluxe Room') === item.room; }).length;
    const remaining = Math.max(0, item.total - reserved);
    return '<tr><td>' + item.room + '</td><td>' + item.total + '</td><td><strong>' + remaining + '</strong></td><td>' + reserved + '</td><td>₱' + item.rate.toLocaleString('en-PH') + '</td></tr>';
  }).join('');
}

document.getElementById('confirmBooking').addEventListener('click', function () {
  if (!pendingBooking) return;
  const savedBooking = { ...pendingBooking, receiptNumber: 'CA-' + Date.now().toString().slice(-8), bookedAt: new Date().toLocaleString('en-PH') };
  bookings.push(savedBooking);
  localStorage.setItem('havenBookings', JSON.stringify(bookings));
  renderBookings();
  refreshDateAvailability();
  confirmDialog.close();
  document.getElementById('receiptNumber').textContent = 'Receipt No. ' + savedBooking.receiptNumber;
  document.getElementById('receiptDetails').innerHTML =
    '<p><strong>Guest name:</strong> ' + escapeText(savedBooking.name) + '</p>' +
    '<p><strong>Email:</strong> ' + escapeText(savedBooking.email) + '</p>' +
    '<p><strong>Contact number:</strong> ' + escapeText(savedBooking.phone || 'Not provided') + '</p>' +
    '<p><strong>Room:</strong> ' + escapeText(savedBooking.room) + '</p>' +
    '<p><strong>Check-in:</strong> ' + escapeText(savedBooking.checkIn) + '</p>' +
    '<p><strong>Check-out:</strong> ' + escapeText(savedBooking.checkOut) + '</p>' +
    '<p><strong>Guests:</strong> ' + escapeText(savedBooking.guests) + '</p>' +
    '<p><strong>Arrival time:</strong> ' + escapeText(savedBooking.time) + '</p>' +
    '<p><strong>Length of stay:</strong> ' + savedBooking.nights + (savedBooking.nights === 1 ? ' night' : ' nights') + '</p>' +
    '<p><strong>Total amount:</strong> ₱' + savedBooking.total.toLocaleString('en-PH') + '</p>' +
    '<p class="receipt-booked-at"><strong>Booked on:</strong> ' + escapeText(savedBooking.bookedAt) + '</p>';
  document.getElementById('receiptDialog').showModal();
  bookingForm.reset();
  checkIn.min = todayString;
  checkOut.min = todayString;
  updateTotal();
  bookingMessage.textContent = 'Demo reservation saved! Check the Admin Overview below.';
  pendingBooking = null;
});
document.getElementById('printReceipt').addEventListener('click', function () { window.print(); });
document.getElementById('closeReceipt').addEventListener('click', function () { document.getElementById('receiptDialog').close(); });
document.getElementById('doneReceipt').addEventListener('click', function () {
  document.getElementById('receiptDialog').close();
  document.getElementById('bookingMessage').textContent = 'Reservation saved! Your receipt is ready.';
});
document.getElementById('cancelConfirm').addEventListener('click', function () { confirmDialog.close(); });
document.getElementById('clearBookings').addEventListener('click', function () {
  if (confirm('Clear all demo reservations saved in this browser?')) {
    bookings = [];
    localStorage.removeItem('havenBookings');
    renderBookings();
  }
});

document.getElementById('loginOpen').addEventListener('click', function () { loginDialog.showModal(); });
document.getElementById('loginSubmit').addEventListener('click', function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
    document.getElementById('loginMessage').textContent = username === 'admin' && password === 'admin123'
    ? 'Login successful. Opening admin dashboard.'
    : 'Incorrect demo username or password.';
  if (username === 'admin' && password === 'admin123') {
    loginDialog.close();
    document.body.classList.add('admin-mode');
    document.getElementById('admin').scrollIntoView({ behavior: 'smooth' });
  }
});

renderBookings();
updateTotal();
refreshDateAvailability();

document.getElementById('backToSite').addEventListener('click', function () {
  document.body.classList.remove('admin-mode');
  document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
});

document.querySelectorAll('.admin-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.admin-tab').forEach(function (item) { item.classList.toggle('active', item === tab); });
    document.querySelectorAll('.admin-panel').forEach(function (panel) { panel.hidden = panel.id !== tab.dataset.panel; });
  });
});

    document.querySelectorAll('.form-note').forEach(function (note) {
      if (!note.textContent.includes('admin password')) note.remove();
    });
    document.querySelectorAll('.contact-details span').forEach(function (item) {
      if (item.textContent.includes('Daily')) item.remove();
    });
    document.querySelectorAll('footer span').forEach(function (item) {
      item.textContent = 'Comfort, care, and a welcoming stay.';
    });
    document.querySelectorAll('.stat-card small').forEach(function (item) {
      if (/sample inventory|saved in this browser/i.test(item.textContent)) item.remove();
    });
    document.querySelectorAll('.admin-section .pill').forEach(function (item) {
      item.textContent = 'ADMIN';
    });
    document.querySelectorAll('.confirm-box .form-note').forEach(function (item) {
      item.remove();
    });

    (function () {
      const staffButton = document.createElement('button');
      staffButton.type = 'button'; staffButton.className = 'staff-access'; staffButton.textContent = 'Staff access';
      staffButton.addEventListener('click', function () { document.getElementById('loginDialog').showModal(); });
      document.querySelector('footer').appendChild(staffButton);
      
      const note = document.getElementById('availabilityNote');
      const calendar = document.createElement('div'); calendar.className = 'availability-calendar'; calendar.id = 'availabilityCalendar';
      note.insertAdjacentElement('afterend', calendar);
      const weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];
      let viewDate = new Date(); viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
      function keyFor(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
      function reserved(key){return bookings.some(function(b){return b.room===roomType.value && key>=b.checkIn && key<b.checkOut})}
      function render(){
        const y=viewDate.getFullYear(),m=viewDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
        let out='<div class="calendar-head"><button type="button" class="calendar-nav" id="calPrev" aria-label="Previous month">‹</button><strong>'+viewDate.toLocaleDateString('en-PH',{month:'long',year:'numeric'})+'</strong><button type="button" class="calendar-nav" id="calNext" aria-label="Next month">›</button></div><div class="calendar-grid">';
        weekdays.forEach(function(w){out+='<span class="calendar-weekday">'+w+'</span>'});for(let i=0;i<first;i++)out+='<span></span>';
        for(let d=1;d<=days;d++){const k=keyFor(y,m,d),isReserved=reserved(k),past=k<todayString,selected=k===checkIn.value||k===checkOut.value;out+='<button type="button" data-date="'+k+'" class="calendar-day'+(isReserved?' reserved':'')+(selected?' selected':'')+(k===todayString?' today':'')+'"'+((past||isReserved)?' disabled':'')+' title="'+(isReserved?'Reserved night':'Available date')+'">'+d+'</button>'}
        out+='</div><div class="calendar-legend"><span><i class="legend-dot"></i>Reserved night</span><span><i class="legend-dot available"></i>Available date</span></div>';calendar.innerHTML=out;
        document.getElementById('calPrev').onclick=function(){viewDate=new Date(y,m-1,1);render()};document.getElementById('calNext').onclick=function(){viewDate=new Date(y,m+1,1);render()};
        calendar.querySelectorAll('[data-date]').forEach(function(btn){btn.onclick=function(){const chosen=btn.dataset.date;if(!checkIn.value||(checkOut.value&&checkOut.value>checkIn.value)){checkIn.value=chosen;checkOut.value='';checkOut.min=chosen}else if(chosen>checkIn.value){if(!isDateRangeAvailable(checkIn.value,chosen,roomType.value)){note.textContent='That date range overlaps a reservation. Please choose another checkout date.';note.style.color='#a33b32';return}checkOut.value=chosen}else{checkIn.value=chosen;checkOut.value='';checkOut.min=chosen}updateTotal();refreshDateAvailability();render()}})
      }
      checkIn.addEventListener('change',render);checkOut.addEventListener('change',render);roomType.addEventListener('change',render);
      const priorRenderBookings=renderBookings;renderBookings=function(){priorRenderBookings();render()};render();
    })();

    (function () {
      const money = function (amount) { return '₱' + Number(amount || 0).toLocaleString('en-PH'); };
      const baseAvailabilityCheck = isDateRangeAvailable;
      isDateRangeAvailable = function (start, end, selectedRoom) {
        return !bookings.some(function (booking) {
          if (booking.room !== selectedRoom || booking.status === 'Cancelled') return false;
          return isSameDayOrOverlapping(start, end, booking.checkIn, booking.checkOut);
        });
      };

      const originalUpdateTotal = updateTotal;
      updateTotal = function () {
        originalUpdateTotal();
        const nights = getNightCount();
        const rate = roomPrices[roomType.value] || 1000;
        document.getElementById('priceRate').textContent = money(rate) + ' × ' + nights + (nights === 1 ? ' night' : ' nights');
        document.getElementById('priceBreakdownTotal').textContent = money(rate * nights);
      };
      updateTotal();

      document.querySelectorAll('.room-card').forEach(function (card) {
        const heading = card.querySelector('h3');
        if (!heading) return;
        const details = {
          'Deluxe Room': 'Best for small groups. Sample amenities: Wi-Fi, sleeping area, and space for 3–5 guests.',
          'Standard Room': 'Best for solo travellers or couples. Sample amenities: Wi-Fi and sleeping space for 1–2 guests.',
          'Family Room': 'Best for family trips. Sample amenities: Wi-Fi and extra sleeping space for 4–6 guests.'
        };
        const note = document.createElement('p'); note.className = 'room-amenity-note';
        note.textContent = details[heading.textContent.trim()] || '';
        const rating = card.querySelector('.rating');
        if (rating && heading.textContent.trim() === 'Deluxe Room') rating.textContent = '★ 4.8 sample rating';
        if (note.textContent) card.querySelector('.room-info').appendChild(note);
      });

      const search = document.getElementById('bookingSearch');
      const statusFilter = document.getElementById('bookingStatusFilter');
      const originalRenderBookings = renderBookings;
      renderBookings = function () {
        originalRenderBookings();
        const rows = document.getElementById('bookingRows');
        if (!bookings.length) {
          const empty = rows.querySelector('.empty-row');
          if (empty) empty.colSpan = 9;
          return;
        }
        Array.from(rows.querySelectorAll('tr')).forEach(function (row, index) {
          const booking = bookings[index];
          if (!booking) return;
          const status = booking.status || 'Confirmed';
          const statusCell = row.cells[7];
          if (statusCell) statusCell.innerHTML = '<span class="status' + (status === 'Cancelled' ? ' cancelled' : '') + '">' + escapeText(status) + '</span>';
          const actions = document.createElement('td'); actions.className = 'action-buttons';
          actions.innerHTML = '<button type="button" data-action="edit" data-index="' + index + '">Edit</button><button type="button" data-action="cancel" data-index="' + index + '"' + (status === 'Cancelled' ? ' disabled' : '') + '>Cancel</button>';
          row.appendChild(actions);
        });
        filterRows();
      };

      function filterRows() {
        const query = (search.value || '').trim().toLowerCase();
        const wantedStatus = statusFilter.value;
        document.querySelectorAll('#bookingRows tr').forEach(function (row) {
          const index = row.querySelector('[data-index]')?.dataset.index;
          if (index === undefined) return;
          const booking = bookings[Number(index)];
          const status = booking.status || 'Confirmed';
          const searchable = [booking.name, booking.room, booking.checkIn, booking.checkOut, booking.email].join(' ').toLowerCase();
          row.hidden = !(searchable.includes(query) && (wantedStatus === 'all' || status === wantedStatus));
        });
      }
      search.addEventListener('input', filterRows);
      statusFilter.addEventListener('change', filterRows);
      document.getElementById('bookingRows').addEventListener('click', function (event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const index = Number(button.dataset.index);
        const booking = bookings[index];
        if (!booking) return;
        if (button.dataset.action === 'cancel') {
          if (!confirm('Cancel this demo reservation? It will no longer block the selected dates.')) return;
          booking.status = 'Cancelled';
          localStorage.setItem('havenBookings', JSON.stringify(bookings));
          renderBookings(); refreshDateAvailability();
          roomType.dispatchEvent(new Event('change'));
        } else if (button.dataset.action === 'edit') {
          if (!confirm('Load this reservation into the form for editing? The saved demo record will be removed first; submit it again to save the updated version.')) return;
          const fields = { guestName: booking.name, email: booking.email, phone: booking.phone, roomType: booking.room, checkIn: booking.checkIn, checkOut: booking.checkOut, guests: booking.guests, arrivalTime: booking.time };
          Object.keys(fields).forEach(function (id) { const field = document.getElementById(id); if (field) field.value = fields[id]; });
          bookings.splice(index, 1); localStorage.setItem('havenBookings', JSON.stringify(bookings));
          updateTotal(); refreshDateAvailability(); renderBookings();
          document.body.classList.remove('admin-mode'); document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
          document.getElementById('bookingMessage').textContent = 'Reservation loaded for editing. Review the details and submit again to save.';
        }
      });

      const receiptNote = document.createElement('p');
      receiptNote.className = 'calendar-note';
      receiptNote.textContent = 'Demo receipt only — not a real hotel confirmation or proof of payment.';
      document.getElementById('receiptDetails').after(receiptNote);
      renderBookings();
    })();
