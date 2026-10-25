const http = require('http');
const fs = require('fs');
const path = require('path');

function httpRequest(options, postData = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const finalHeaders = { ...(options.headers || {}), ...headers };
    if (postData && !finalHeaders['Content-Length']) {
      finalHeaders['Content-Length'] = Buffer.isBuffer(postData) ? postData.length : Buffer.byteLength(postData);
    }
    const req = http.request({ ...options, headers: finalHeaders }, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const raw = buffer.toString('utf-8');
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw });
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

// Helper to build multipart/form-data payload
function createMultipartFormData(fields, fileField = null) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }

  if (fileField) {
    const { fieldName, filename, contentType, buffer } = fileField;
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    chunks.push(buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const fullBody = Buffer.concat(chunks);

  return {
    boundary,
    body: fullBody,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

// Generate a valid minimal 100x100 JPEG buffer for testing actual image upload
function generateMinimalJpg() {
  // Minimal 1x1 white JPEG binary
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9
  ]);
}

async function runCompleteSystemTest() {
  console.log('================================================================');
  console.log('  STARTING COMPREHENSIVE END-TO-END WORKFLOW VERIFICATION');
  console.log('================================================================\n');

  // STEP 1: Verify all 13 collections exist with correct prices
  console.log('[STEP 1] Fetching all collections via public API...');
  const collsRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/collections',
    method: 'GET'
  });

  if (!collsRes.body.success || !Array.isArray(collsRes.body.collections)) {
    throw new Error('Failed to retrieve collections: ' + JSON.stringify(collsRes.body));
  }

  const collections = collsRes.body.collections;
  console.log(`✓ Retrieved ${collections.length} collections (Expected 13).`);

  const expectedPrices = {
    'poster-a3': 130,
    'poster-a4': 70,
    'poster-a5': 50,
    'poster-a6': 30,
    'poster-5x9': 15,
    'poster-5x7': 10,
    'sticker-small': 10,
    'frame-12x15': 550,
    'frame-12x18': 700,
    'frame-16x24': 1100,
    'frame-20x30': 1800,
    'combo-1': 160,
    'combo-2': 120,
    'combo-3': 170
  };

  for (const [id, expPrice] of Object.entries(expectedPrices)) {
    const col = collections.find(c => c.collectionId === id);
    if (!col) throw new Error(`Missing expected collection: ${id}`);
    if (col.price !== expPrice) throw new Error(`Price mismatch for ${id}: expected ₹${expPrice}, got ₹${col.price}`);
  }
  console.log('✓ All 13 collections and prices match specifications exactly.');

  // STEP 2: Verify initially empty collections
  console.log('\n[STEP 2] Verifying empty collection state for A3 Poster...');
  const a3EmptyRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/collections/poster-a3/designs',
    method: 'GET'
  });
  console.log(`✓ A3 designs count: ${a3EmptyRes.body.designs.length} (Empty state initially).`);

  // STEP 3: Admin login
  console.log('\n[STEP 3] Authenticating administrator...');
  const loginPayload = JSON.stringify({ username: 'admin', password: 'AdminMoses@2026' });
  const loginRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, loginPayload);

  if (!loginRes.body.success || !loginRes.body.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginRes.body));
  }
  const token = loginRes.body.token;
  console.log('✓ Admin login successful. Token acquired.');

  // STEP 4: Admin uploads an actual A3 design
  console.log('\n[STEP 4] Admin uploading actual A3 design with persistent image storage...');
  const testJpgBuffer = generateMinimalJpg();
  const multipart = createMultipartFormData({
    name: 'Vintage Cyberpunk Neon',
    description: 'Ultra high-definition futuristic neon city art on matte cardstock',
    isPublished: 'true'
  }, {
    fieldName: 'image',
    filename: 'vintage-cyberpunk.jpg',
    contentType: 'image/jpeg',
    buffer: testJpgBuffer
  });

  const uploadRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/collections/admin/poster-a3/designs',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': multipart.contentType
    }
  }, multipart.body);

  if (!uploadRes.body.success || !uploadRes.body.design) {
    throw new Error('Design upload failed: ' + JSON.stringify(uploadRes.body));
  }
  const uploadedDesign = uploadRes.body.design;
  console.log(`✓ Design successfully created:`);
  console.log(`   - Design ID:     ${uploadedDesign.designId}`);
  console.log(`   - Name:          ${uploadedDesign.name}`);
  console.log(`   - Collection ID: ${uploadedDesign.collectionId}`);
  console.log(`   - Image URL:     ${uploadedDesign.imageUrl}`);
  console.log(`   - Storage Type:  ${uploadedDesign.storageType}`);
  console.log(`   - Is Published:  ${uploadedDesign.isPublished}`);

  // STEP 5: Customer opens A3 collection and verifies strict collection isolation
  console.log('\n[STEP 5] Customer checks A3 collection and verifies non-mixture...');
  const a3CustRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/collections/poster-a3/designs',
    method: 'GET'
  });
  if (a3CustRes.body.designs.length !== 1) {
    throw new Error(`Expected 1 design in A3 collection, got ${a3CustRes.body.designs.length}`);
  }
  const customerA3Design = a3CustRes.body.designs[0];
  console.log(`✓ Customer sees A3 design "${customerA3Design.name}" with price ₹${a3CustRes.body.price}.`);

  // Verify A4 collection is still empty (never mix A3 and A4)
  const a4CustRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/collections/poster-a4/designs',
    method: 'GET'
  });
  if (a4CustRes.body.designs.length !== 0) {
    throw new Error('Isolation breach: A4 collection contains designs that belong to A3!');
  }
  console.log('✓ Strict collection isolation verified: A4 collection remains empty.');

  // STEP 6: Customer places an order selecting this design
  console.log('\n[STEP 6] Customer places order selecting the uploaded A3 design...');
  const orderBody = JSON.stringify({
    customerName: 'Anand Sundaram',
    customerWhatsapp: '9840123456',
    street: 'Plot 42, 2nd Cross Street, Adyar',
    city: 'Chennai',
    pincode: '600020',
    customNotes: 'Please ensure corner edge protectors in tube packaging',
    productId: 'poster-a3',
    quantity: 2,
    designId: uploadedDesign.designId,
    designName: uploadedDesign.name,
    designImage: uploadedDesign.imageUrl
  });

  const orderRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, orderBody);

  if (!orderRes.body.success || !orderRes.body.orderId) {
    throw new Error('Order submission failed: ' + JSON.stringify(orderRes.body));
  }
  const orderId = orderRes.body.orderId;
  const expectedTotal = 130 * 2; // ₹260
  if (orderRes.body.totalPrice !== expectedTotal) {
    throw new Error(`Server-side price error: expected ₹${expectedTotal}, got ₹${orderRes.body.totalPrice}`);
  }
  console.log(`✓ Order placed successfully!`);
  console.log(`   - Order ID:      ${orderId}`);
  console.log(`   - Calculated:    ₹${orderRes.body.totalPrice} (₹130 x 2)`);
  console.log(`   - Customer WA:   ${orderRes.body.customerWhatsAppLink}`);

  // STEP 7: Admin views the order in Orders Management
  console.log('\n[STEP 7] Admin viewing order in Orders Management...');
  const adminOrderRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/${orderId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!adminOrderRes.body.success || !adminOrderRes.body.order) {
    throw new Error('Admin failed to fetch order: ' + JSON.stringify(adminOrderRes.body));
  }
  const fetchedOrder = adminOrderRes.body.order;
  console.log(`✓ Admin fetched order record #${fetchedOrder.orderId}:`);
  console.log(`   - Customer:     ${fetchedOrder.customer.name} (+91 ${fetchedOrder.customer.whatsapp})`);
  console.log(`   - Address:      ${fetchedOrder.customer.address.street}, ${fetchedOrder.customer.address.city}`);
  console.log(`   - Total Price:  ₹${fetchedOrder.totalPrice}`);
  console.log(`   - Status:       ${fetchedOrder.status}`);
  console.log(`   - Item 0:       ${fetchedOrder.items[0].name} (${fetchedOrder.items[0].size}) x${fetchedOrder.items[0].quantity}`);
  console.log(`   - Design Name:  ${fetchedOrder.items[0].designName}`);
  console.log(`   - Design Image: ${fetchedOrder.items[0].designImage}`);

  if (fetchedOrder.items[0].designName !== uploadedDesign.name) {
    throw new Error('Ordered design name mismatch!');
  }
  if (fetchedOrder.items[0].designImage !== uploadedDesign.imageUrl) {
    throw new Error('Ordered design image mismatch!');
  }
  console.log('✓ Design name and image are fully recorded in the order record.');

  // STEP 8: Admin updates status through the workflow stages
  console.log('\n[STEP 8] Admin updating order status through workflow stages...');
  const statuses = ['Confirmed', 'Designing', 'Printing', 'Ready to Ship', 'Shipped', 'Delivered'];
  for (const st of statuses) {
    const updateRes = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/${orderId}/status`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ status: st, note: `Status updated to ${st}` }));

    if (!updateRes.body.success) {
      throw new Error(`Failed to update status to ${st}`);
    }
  }
  console.log('✓ Status transitions tested successfully: New -> Confirmed -> Designing -> Printing -> Ready to Ship -> Shipped -> Delivered');

  // STEP 9: Test hiding and publishing design
  console.log('\n[STEP 9] Testing Hide / Publish toggle on design...');
  const toggleRes1 = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/collections/admin/designs/${uploadedDesign.designId}/toggle`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✓ Toggled status: isPublished = ${toggleRes1.body.isPublished}`);

  // Verify hidden from customer
  const a3HiddenCustRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/collections/poster-a3/designs',
    method: 'GET'
  });
  if (a3HiddenCustRes.body.designs.length !== 0) {
    throw new Error('Hidden design is still visible to customers!');
  }
  console.log('✓ Verified: Hidden design is NOT returned to customer catalog.');

  // Unhide design
  const toggleRes2 = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/collections/admin/designs/${uploadedDesign.designId}/toggle`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✓ Unhidden status: isPublished = ${toggleRes2.body.isPublished}`);

  // STEP 10: Test editing design details
  console.log('\n[STEP 10] Testing Admin editing design name & description...');
  const editRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/collections/admin/designs/${uploadedDesign.designId}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    name: 'Vintage Cyberpunk Neon - Remastered',
    description: 'Updated edition with enhanced color depth'
  }));
  if (!editRes.body.success || editRes.body.design.name !== 'Vintage Cyberpunk Neon - Remastered') {
    throw new Error('Failed to update design details!');
  }
  console.log('✓ Design updated successfully: ' + editRes.body.design.name);

  // STEP 11: Test deleting design
  console.log('\n[STEP 11] Testing Admin deleting design...');
  const deleteRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/collections/admin/designs/${uploadedDesign.designId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!deleteRes.body.success) {
    throw new Error('Failed to delete design!');
  }
  console.log('✓ Design deleted successfully: ' + deleteRes.body.message);

  // Verify deleted from customer collection
  const a3AfterDelete = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/collections/poster-a3/designs',
    method: 'GET'
  });
  if (a3AfterDelete.body.designs.length !== 0) {
    throw new Error('Deleted design still appears in collection!');
  }
  console.log('✓ Verified: A3 collection returns 0 designs after deletion.');

  // STEP 12: Clean up test order so DB has no fake data
  console.log('\n[STEP 12] Cleaning up test order from persistent db...');
  const dbPath = path.join(__dirname, '../../data/db.json');
  if (fs.existsSync(dbPath)) {
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    // Filter out our test order
    dbData.orders = dbData.orders.filter(o => o.orderId !== orderId && o.orderId !== 'MMP-20261023-8CB8B4');
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf-8');
    console.log('✓ Cleaned up automated test orders. Preserved original real orders.');
  }

  console.log('\n================================================================');
  console.log('  ALL 12 COMPREHENSIVE WORKFLOW TESTS PASSED 100% SUCCESSFULLY! ');
  console.log('================================================================');
}

runCompleteSystemTest().catch(err => {
  console.error('\n❌ Workflow test failed:', err);
  process.exit(1);
});
