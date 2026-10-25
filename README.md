# Mr Moses Poster Store — Web Application

> **"Your Moments, Our Frames"**  
> A simple, clean, mobile-friendly website and order management system for **Mr Moses Poster Store**.  
> Direct Contact & WhatsApp: **+91 8754126367** ([https://wa.me/918754126367](https://wa.me/918754126367))

---

## 🎨 Visual Design & Branding

- **Color Palette**: Clean white background (`#ffffff` / `#f8fafc`) with deep dark blue (`#0f2b48`) and warm energetic orange accents (`#f97316`).
- **Typography**: Modern typography with Google Fonts (*Plus Jakarta Sans* & *Inter*).
- **Responsive Layout**: Fluid layouts optimized for mobile smartphones, tablets, laptops, and desktop screens.
- **Brand Placeholders**: High-quality neutral vector diagrams representing exact aspect ratios and frame paspartu dimensions instead of invented or sample products.

---

## 🛒 Real Products & Exact Prices

All prices are strictly maintained according to the store's official rate sheet and are editable by the administrator:

### 1. Posters
- **A3 (13 × 19 inches)**: ₹130
- **A4 (13 × 9.5 inches)**: ₹70
- **A5 (6.5 × 9.5 inches)**: ₹50
- **A6 (quarter size)**: ₹30
- **5 × 9 inches**: ₹15
- **5 × 7 inches**: ₹10

### 2. Stickers
- **Small size only**: ₹10

### 3. Photo Frames
- **12 × 15 inches**: ₹550
- **12 × 18 inches**: ₹700
- **16 × 24 inches**: ₹1,100
- **20 × 30 inches**: ₹1,800

### 4. Poster Combo Offers
- **Combo 1**: 1 A3 + 1 A5 — **₹160**
- **Combo 2**: 2 A4 posters — **₹120**
- **Combo 3**: 1 A3 + 1 A5 + 1 poster of 5 × 7 inches — **₹170**

### 5. Custom Orders
- Customers can upload custom designs, family photos, or artwork (JPG, PNG, WEBP, PDF up to 15MB).
- Clearly highlights: *"All custom poster orders may have extra charges. The final custom price will be confirmed by the owner."*

*(Strictly no calendar products or invented sample products are displayed).*

---

## ⚙️ Key Features

### Customer Website (`/`)
1. **Home**: Hero banner with store tagline, value highlights, and quick action buttons.
2. **Posters**: Catalog of real poster sizes and prices. Clicking any size opens that specific design collection.
3. **Stickers**: Waterproof die-cut stickers collection.
4. **Photo Frames**: Solid handcrafted frames collection (12×15, 12×18, 16×24, 20×30).
5. **Poster Combo Offers**: Specially priced bundles collection (Combo 1, Combo 2, Combo 3).
6. **Collection Browsing & Design Selection**: Customers browse verified designs uploaded for the selected category. Only designs belonging to that exact collection are shown (never mixed). Empty collections display *"No designs available yet. Please check back later."*
7. **Instant Design Ordering**: Selecting a design opens the order dialog with design preview, quantity selector, server-calculated totals, address fields, and immediate WhatsApp confirmation link.
8. **Custom Orders**: Dedicated custom design submission form with file attachment and design notes.
9. **My Orders / Order Tracking**: Secure real-time tracking requiring both **Order ID** and **WhatsApp number** to protect customer privacy.
10. **Contact Us**: Official WhatsApp (+91 8754126367), operating hours, and inquiry form opening pre-filled WhatsApp messages.
11. **Floating WhatsApp Button**: Accessible from every screen for instant direct assistance.

### Administrator Portal (`/admin`)
1. **Secure Authentication**: Hashed passwords (bcrypt 12 rounds), JWT tokens, and HttpOnly cookies. Public administrator registration is strictly forbidden.
2. **Orders Management**:
   - Live order metrics: Total Real Orders, New, In Production, Delivered, Total Revenue.
   - Ordered items display with design thumbnail images and design names.
   - Status & payment updater (`New`, `Confirmed`, `Designing`, `Printing`, `Ready to Ship`, `Shipped`, `Delivered`, `Cancelled`) with timestamped history log.
   - **WhatsApp Customer Communication**: Buttons to open `wa.me/91...` with pre-filled order receipt and status updates for administrator review.
   - **Empty State**: Displays *"No orders yet"* when the database has no orders. Never inserts fake data!
3. **Product Prices & Availability**:
   - Single source of truth for product pricing across posters, frames, stickers, and combos.
   - Live editing of prices with immediate database sync.
4. **Manage Collections**:
   - Dedicated tab containing separate collections for all 13 products:
     - **Posters**: A3 (₹130), A4 (₹70), A5 (₹50), A6 (₹30), 5 × 9 (₹15), 5 × 7 (₹10)
     - **Stickers**: Small Sticker (₹10)
     - **Photo Frames**: 12 × 15 (₹550), 12 × 18 (₹700), 16 × 24 (₹1,100), 20 × 30 (₹1,800)
     - **Combo Offers**: Combo 1 (₹160), Combo 2 (₹120), Combo 3 (₹170)
   - Allows the administrator to:
     - Open any collection.
     - Upload design artwork from the computer (JPG, PNG, WEBP up to 15MB).
     - Enter design name and optional description.
     - Live image preview before uploading.
     - Add and publish design.
     - Edit design details & replace image.
     - Toggle design visibility (Hide / Publish).
     - Delete design with confirmation dialog.
   - Persistent image storage: Cloudinary cloud storage supported for deployment with automatic fallback to persistent local directory (`/uploads/designs`). Permanent HTTPS / public URLs saved in the database.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher recommended; tested on Node.js v24)
- **npm** (included with Node.js)
- **MongoDB Atlas** account (or local MongoDB). If MongoDB is offline, the app automatically runs on a built-in persistent storage engine for instant testing.

### 1. Installation
Clone or navigate to the project directory:
```bash
cd "c:\Users\OONESHWARAN.V\OneDrive\Desktop\MR POSTER"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your settings:
```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection URI:
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mrmoses?retryWrites=true&w=majority

# JWT Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here_change_for_production

# First-Admin Setup Token
ADMIN_SETUP_TOKEN=mrmoses_init_token_2026

# Store Contact Info
WHATSAPP_NUMBER=8754126367
STORE_NAME=Mr Moses Poster Store
STORE_TAGLINE=Your Moments, Our Frames
```

---

## 🔐 First Administrator Setup

Public registration is disabled for security. To create the first administrator account:

### Method A: Command-Line Interface (Recommended)
Run the administrative setup script:
```bash
npm run setup-admin [username] [password]
```

Example:
```bash
npm run setup-admin admin MySecurePassword123
```

Or run interactively (it will prompt for username and password):
```bash
npm run setup-admin
```

### Method B: First-Time Setup Endpoint
If no admin exists in the database yet, you can call the guarded initial setup endpoint with the `ADMIN_SETUP_TOKEN` defined in your `.env`:
```bash
POST /api/auth/init-admin
{
  "username": "admin",
  "password": "MySecurePassword123",
  "setupToken": "mrmoses_init_token_2026"
}
```
*Note: Once an admin account exists, this endpoint is permanently locked.*

---

## 🏃 Running the Application

### Development / Production Server
```bash
npm start
```
The server will start at:
- **Customer Website**: [http://localhost:5000](http://localhost:5000)
- **Admin Portal**: [http://localhost:5000/admin](http://localhost:5000/admin)

### Running Automated Workflow Verification Tests
To run the automated suite testing order creation, calculation, tracking security, and admin login:
```bash
node server/scripts/test_flow.js
```

---

## ☁️ MongoDB Atlas Setup Guide

1. Create a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster (Shared / Free M0).
3. Under **Database Access**, create a user with read/write privileges.
4. Under **Network Access**, add your server's IP address (or `0.0.0.0/0` for cloud deployment).
5. Click **Connect** &rarr; **Drivers** (Node.js) and copy the connection string.
6. Paste into your `.env` as `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://<dbuser>:<dbpassword>@cluster0.xxxxx.mongodb.net/mrmoses?retryWrites=true&w=majority
   ```
7. Restart the server. It will automatically detect MongoDB Atlas, establish the connection, and ensure initial product records are synchronized.

---

## 📁 Project Structure

```
MR POSTER/
├── .env.example             # Environment configuration template
├── .env                     # Local environment file
├── .gitignore               # Excludes node_modules, env, and uploads
├── package.json             # Scripts & dependencies
├── README.md                # Comprehensive documentation
├── server/
│   ├── app.js               # Express application configuration & security
│   ├── server.js            # Server entry point & listener
│   ├── config/
│   │   ├── db.js            # MongoDB Atlas connection manager & fallback
│   │   ├── initialProducts.js # Official real products catalog & prices
│   │   └── repository.js    # Data access repository layer
│   ├── models/
│   │   ├── Admin.js         # Admin Mongoose model
│   │   ├── Product.js       # Product Mongoose model
│   │   └── Order.js         # Customer Order Mongoose model
│   ├── middleware/
│   │   ├── auth.js          # Admin JWT authentication middleware
│   │   ├── upload.js        # Safe file upload with mimetype validation
│   │   └── rateLimiter.js   # Rate limiting for auth and orders
│   ├── routes/
│   │   ├── auth.routes.js   # Admin login, session check, logout
│   │   ├── product.routes.js# Product catalog & price editor routes
│   │   └── order.routes.js  # Order placement, tracking & status updates
│   └── scripts/
│       ├── createAdmin.js   # CLI utility to create the first admin
│       ├── seed.js          # Catalog synchronizer script
│       └── test_flow.js     # Automated workflow verification test
├── uploads/                 # Secure customer file upload storage
└── public/
    ├── index.html           # Main customer website
    ├── admin.html           # Administrator portal
    ├── css/
    │   ├── style.css        # Customer website design system
    │   └── admin.css        # Admin portal styling
    ├── js/
    │   ├── app.js           # Customer frontend application logic
    │   └── admin.js         # Admin dashboard frontend logic
    └── assets/
        ├── logo.svg         # Official Mr Moses Poster Store logo
        └── placeholders/    # Clean neutral vector diagrams
            ├── poster-neutral.svg
            ├── frame-neutral.svg
            ├── sticker-neutral.svg
            └── combo-neutral.svg
```

---

## 🔒 Security Best Practices Implemented

- **Password Hashing**: Bcrypt with 12 salt rounds.
- **Session Tokens**: JWT with HttpOnly cookies preventing XSS token theft.
- **File Upload Safety**: Strict whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`), size capped at 15MB, unique randomized filenames preventing path traversal.
- **Order Tracking Privacy**: Order details require matching both Order ID and customer WhatsApp number; full street address is never exposed publicly.
- **HTTP Security**: Helmet headers and Content Security Policy configured.
- **Rate Limiting**: Brute-force protection on administrator login and order submission.
