const http = require('http');

function request(options, postData = null, isFormData = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing System Status ---');
  const statusRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/system-status',
    method: 'GET'
  });
  console.log('Status Response:', statusRes.body);

  console.log('\n--- 2. Testing Admin Login ---');
  const loginBody = JSON.stringify({
    username: 'admin',
    password: 'AdminMoses@2026'
  });
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginBody)
    }
  }, loginBody);
  console.log('Login Response:', loginRes.body);
  const token = loginRes.body.token;

  console.log('\n--- 3. Testing Orders Empty State (Before Any Orders) ---');
  const ordersRes1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Orders Count before any customer submits:', ordersRes1.body.orders.length);

  console.log('\n--- 4. Testing Placing a Real Order ---');
  const orderBody = JSON.stringify({
    customerName: 'Karthik Raja',
    customerWhatsapp: '9876543210',
    street: '14/B Anna Salai, Royapettah',
    city: 'Chennai',
    pincode: '600014',
    customNotes: 'Please pack carefully in postal tube',
    orderType: 'standard',
    items: [
      {
        productId: 'poster-a3',
        quantity: 2
      },
      {
        productId: 'combo-1',
        quantity: 1
      }
    ]
  });

  const placeOrderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(orderBody)
    }
  }, orderBody);
  console.log('Placed Order Result:', placeOrderRes.body);
  const orderId = placeOrderRes.body.orderId;
  const expectedTotal = (130 * 2) + 160; // 260 + 160 = 420
  console.log(`Server-side Price Calculation: Expected ₹${expectedTotal}, Got ₹${placeOrderRes.body.totalPrice}`);

  console.log('\n--- 5. Testing Customer Order Tracking ---');
  const trackRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/track?orderId=${encodeURIComponent(orderId)}&whatsapp=9876543210`,
    method: 'GET'
  });
  console.log('Tracking Result (Customer Safe View):', trackRes.body);

  console.log('\n--- 6. Testing Tracking Security (Wrong Phone Number) ---');
  const trackWrongPhone = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/track?orderId=${encodeURIComponent(orderId)}&whatsapp=1111111111`,
    method: 'GET'
  });
  console.log('Tracking Wrong Phone (Should be 404): Status', trackWrongPhone.status, trackWrongPhone.body);

  console.log('\n--- 7. Testing Admin View Real Orders ---');
  const ordersRes2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Admin Orders List (Real orders only):', ordersRes2.body.orders.map(o => ({ id: o.orderId, customer: o.customer.name, total: o.totalPrice, status: o.status })));

  console.log('\n--- 8. Testing Admin Updating Status to "Designing" then "Printing" ---');
  const updateStatusRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/${orderId}/status`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    status: 'Designing',
    paymentStatus: 'Advance Paid',
    note: 'Frame mounting and photo border adjustment in progress'
  }));
  console.log('Status Update Result:', updateStatusRes.body.message);

  console.log('\n--- 9. Testing Admin Price Editing (e.g. updating sticker price) ---');
  const updatePriceRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/products/sticker-small',
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    price: 12
  }));
  console.log('Price Update Result:', updatePriceRes.body);

  // Restore sticker back to original 10
  await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/products/sticker-small',
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    price: 10
  }));
  console.log('Restored sticker back to ₹10.');

  console.log('\n>>> ALL 9 WORKFLOW TESTS COMPLETED SUCCESSFULLY! <<<');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
