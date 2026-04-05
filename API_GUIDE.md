# Yogi Fashion E-Commerce API Documentation

## Base URL
`http://localhost:4000` (or your production URL like `https://yogi-fashion-backend.onrender.com`)

## Authentication & Authorization
Most protected routes require a JWT token in the Authorization header.
**Format:** `Authorization: Bearer <your_jwt_token>`

Admin-only routes require a user token where `role === "admin"`.

---

## 1. User Authentication & Accounts (`/user`)

### 1.1 Sign Up
- **Method:** `POST`
- **Path:** `/user/signup`
- **Format:** `multipart/form-data`
- **Body Data:**
  - `name`: String
  - `email`: String
  - `password`: String
  - `role`: String (user/admin)
  - `image`: File (optional)
- **Sample Response (200 OK):**
  ```json
  {
    "token": "eyJhbG...",
    "user": {
      "id": "60d5ec...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user",
      "image": "url_to_cloudinary_image"
    }
  }
  ```

### 1.2 Login
- **Method:** `POST`
- **Path:** `/user/login`
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
- **Sample Response (200 OK):** *(Same as Sign Up response)*

### 1.3 Update Profile (Logged-in User)
- **Method:** `PUT`
- **Path:** `/user/profile`
- **Auth:** Required 
- **Format:** `multipart/form-data`
- **Body Data:**
  - `name`: String (optional)
  - `image`: File (optional profile photo)
- **Sample Response (200 OK):**
  ```json
  {
    "message": "Profile updated successfully",
    "user": { "id": "...", "name": "Jane Updated", "email": "...", "image": "..." }
  }
  ```

### 1.4 Get User Addresses
- **Method:** `GET`
- **Path:** `/user/address`
- **Auth:** Required
- **Sample Response (200 OK):**
  ```json
  [
    {
      "_id": "abc...",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "MH",
      "zip": "400001",
      "phone": "9876543210"
    }
  ]
  ```

### 1.5 Add Address
- **Method:** `POST`
- **Path:** `/user/address`
- **Auth:** Required
- **Format:** `multipart/form-data`
- **Body Data:** `street`, `city`, `state`, `zip`, `phone`
- **Sample Response (201 Created):**
  ```json
  {
    "message": "Address added successfully",
    "addresses": [ /* updated array */ ]
  }
  ```

### 1.6 Update Address
- **Method:** `PUT`
- **Path:** `/user/address/:id`
- **Auth:** Required
- **Format:** `multipart/form-data`
- **Body Data:** Any subset of `street`, `city`, `state`, `zip`, `phone`
- **Sample Response (200 OK):**
  ```json
  {
    "message": "Address updated successfully",
    "addresses": [ /* updated array */ ]
  }
  ```

### 1.7 Delete Address
- **Method:** `DELETE`
- **Path:** `/user/address/:id`
- **Auth:** Required
- **Sample Response (200 OK):**
  ```json
  {
    "message": "Address deleted successfully",
    "addresses": [ /* updated array */ ]
  }
  ```

### 1.8 Forgot Password (Request OTP)
- **Method:** `POST`
- **Path:** `/user/forgot-password`
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  { "email": "jane@example.com" }
  ```
- **Sample Response (200 OK):**
  ```json
  { "message": "OTP sent to your email successfully" }
  ```

### 1.9 Verify Password Reset OTP
- **Method:** `POST`
- **Path:** `/user/verify-otp`
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "email": "jane@example.com",
    "otp": "123456"
  }
  ```
- **Sample Response (200 OK):**
  ```json
  { "message": "OTP verified successfully. You can now reset your password." }
  ```

### 1.10 Reset Password
- **Method:** `POST`
- **Path:** `/user/reset-password`
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "email": "jane@example.com",
    "otp": "123456",
    "newPassword": "newsecurepassword123"
  }
  ```
- **Sample Response (200 OK):**
  ```json
  { "message": "Password reset successful. You can now login with your new password." }
  ```


---

## 2. Products (`/product`)

### 2.1 Get Detailed Products
- **Method:** `GET`
- **Path:** `/product`
- **Sample Response (200 OK):** Full detailed array of all products including sub-arrays and object references.

### 2.2 Get Lightweight Product List 
- **Method:** `GET`
- **Path:** `/product/list`
- **Description:** Optimized for general catalog browsing.
- **Sample Response (200 OK):** Returns array of products containing only `hasVariant`, `name`, `price`, `discountPrice`, `images`, `category`, and `variants`.

### 2.3 Get Thumbnails (With Pagination & Sorting)
- **Method:** `GET`
- **Path:** `/product/thumbnail?page=1&limit=10&sort=newArrivals&category=categoryId`
- **Query Params:**
  - `page`: default 1
  - `limit`: default 10
  - `sort`: `lowToHigh`, `highToLow`, `newArrivals`
  - `category`: optional Category ObjectId
- **Sample Response (200 OK):**
  ```json
  {
    "products": [
      { "_id": "...", "name": "T-Shirt", "brand": "Puma", "price": 1000, "discountPrice": 800, "images": ["url"] }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
  ```

  }
  ```
 
+### 2.4 Get Thumbnails (Batch by IDs)
+- **Method:** `POST`
+- **Path:** `/product/thumbnail/batch`
+- **Description:** Useful for fetching cart items or recently viewed products in a single call.
+- **Body Data:**
+  ```json
+  { "ids": ["id1", "id2", "id3"] }
+  ```
+- **Sample Response (200 OK):** Returns an array of product thumbnails in the same order as provided in the `ids` array.
+
+
 ### 2.4 Get Trending Products
- **Method:** `GET`
- **Path:** `/product/thumbnail/trending`
- **Sample Response (200 OK):** Returns top 10 most sold products dynamically derived from order history.

### 2.5 My Wishlist
- **Method:** `GET`
- **Path:** `/product/thumbnail/wishlist`
- **Auth:** Required
- **Sample Response (200 OK):** Returns array of populated wishlist products for a user.

### 2.6 Add to Wishlist
- **Method:** `POST`
- **Path:** `/product/wishlist/:id`
- **Auth:** Required
- **Sample Response (200 OK):** `{ "success": true, "message": "Added to wishlist" }`

### 2.7 Remove from Wishlist
- **Method:** `GET` 
- **Path:** `/product/wishlist/remove/:id`
- **Auth:** Required
- **Sample Response (200 OK):** `{ "success": true, "message": "Removed from wishlist" }`

### 2.8 Get Single Product
- **Method:** `GET`
- **Path:** `/product/:id`
- **Sample Response (200 OK):** Returns a single fully-populated product object.

### 2.9 Get Similar Products
- **Method:** `GET`
- **Path:** `/product/similar/:id`
- **Sample Response (200 OK):** Returns up to 8 products sharing the same category as the input specific product ID.

### 2.10 Search Products
Get a paginated list of products matching a search query (checks name, brand, and category name).
- **Method:** `GET`
- **Path:** `/product/search?q=keyword&page=1&limit=10`
- **Query Params:**
  - `q`: Search keyword (Required)
  - `page`: default 1
  - `limit`: default 10
- **Sample Response (200 OK):**
  ```json
  {
    "products": [
      {
        "_id": "...",
        "name": "Nike Shoes",
        "brand": "Nike",
        "price": 5000,
        "discountPrice": 4500,
        "images": ["url"],
        "category": { "name": "Footwear", "slug": "footwear" }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
  ```

### 2.11 Admin: Create Product
- **Method:** `POST`
- **Path:** `/product`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:** Complex form-data supporting attributes (`name`, `description`, `price`), and global images via `images` key.
  - Supports variants formatted correctly like `V1_color="Red"`, `V1_price=200`, `V1_images=File`.
- **Sample Response (201 Created):** Returns freshly created product.


---

## 3. Categories (`/api/categories`)

### 3.1 Get All Categories
- **Method:** `GET`
- **Path:** `/api/categories`
- **Sample Response (200 OK):**
  ```json
  [
    { "_id": "...", "name": "Men's Clothing", "slug": "mens-clothing", "image": "url" }
  ]
  ```

### 3.2 Get Single Category
- **Method:** `GET`
- **Path:** `/api/categories/:slug` (Param can be slug string or Mongo ObjectId)
- **Sample Response (200 OK):** Single category object.

### 3.3 Admin: Create Category
- **Method:** `POST`
- **Path:** `/api/categories`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:** `name`, `slug`, `image` (file)
- **Sample Response (201 Created):** 
  ```json
  { "_id": "...", "name": "Jeans", "slug": "jeans", "image": "url" }
  ```

### 3.4 Admin: Update Category
- **Method:** `PUT`
- **Path:** `/api/categories/:id`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:**
  - `name` (Optional string)
  - `slug` (Optional string)
  - `image` (Optional file)
- **Sample Response (200 OK):**
  ```json
  { "message": "Category updated successfully", "category": { "_id": "...", "name": "...", "slug": "...", "image": "..." } }
  ```

### 3.5 Admin: Delete Category
- **Method:** `DELETE`
- **Path:** `/api/categories/:id`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):**
  ```json
  { "message": "Category deleted successfully" }
  ```


---

## 4. Promo Codes (`/promo`)

### 4.1 Get All Active Promos (for customers)
- **Method:** `GET`
- **Path:** `/promo`
- **Description:** Returns a list of all currently active promo codes valid within their start/expiry window.
- **Sample Response (200 OK):**
  ```json
  [
    {
      "code": "YOGI10",
      "description": "10% off sitewide",
      "expiryDate": "2026-12-31T23:59:59.000Z",
      "minOrderAmount": 500,
      "maxDiscount": 200,
      "perUserLimit": 1,
      "applicableProducts": [ { "_id": "...", "name": "..." } ],
      "applicableCategories": [ { "_id": "...", "name": "..." } ]
    }
  ]
  ```

### 4.2 Validate Promo Code (Customer Cart Check)
- **Method:** `POST`
- **Path:** `/promo/validate`
- **Auth:** Required
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "code": "YOGI10",
    "totalAmount": 3000,
    "cartItems": [
      {
        "product": "product_objectId_here",
        "category": "category_objectId_here",
        "price": 2000,
        "quantity": 1
      },
      {
        "product": "another_product_id",
        "category": "category_objectId_here",
        "price": 1000,
        "quantity": 1
      }
    ]
  }
  ```
- **Note:** `price` and `quantity` in `cartItems` are required when the promo is product/category-specific. The discount will only be applied to the eligible items' subtotal, not the entire cart value.
- **Sample Response (200 OK):**
  ```json
  {
    "valid": true,
    "discountAmount": 200,
    "finalAmount": 1800,
    "code": "YOGI10",
    "description": "10% Off Sitewide"
  }
  ```

### 4.2 Admin: Create Promo Code
- **Method:** `POST`
- **Path:** `/promo/admin`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "code": "YOGI10",
    "description": "10% off",
    "discountType": "percentage",    // percentage or fixed
    "discountValue": 10,             // if percentage then 10 means 10% off else 10 means 10rs off
    "maxDiscount": 200,           // Optional: Only used for percentage
    "minOrderAmount": 500,        // Optional: Default 0
    "usageLimit": 100,            // Optional: Total times code can be used
    "perUserLimit": 1,            // Optional: Default 1
    "applicableProducts": [       // Optional: Array of Product IDs
      "66f1b1a2c3d4e5f6g7h8i9j0"
    ],     
    "applicableCategories": [],   // Optional: Array of Category IDs
    "startDate": "2026-01-01",    // Format: YYYY-MM-DD 
    "expiryDate": "2026-12-31"    // Format: YYYY-MM-DD
  }
  ```
- **Sample Response (201 Created):** Newly created Promo Code document.

### 4.3 Admin: View All Promos
- **Method:** `GET`
- **Path:** `/promo/admin`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):** Array of all registered promo codes containing statistics like `usedCount`.

### 4.4 Admin: Update Promo
- **Method:** `PUT`
- **Path:** `/promo/admin/:id`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Sample Response (200 OK):** Modified Promo Code document.

### 4.5 Admin: Toggle Active Status
- **Method:** `PATCH`
- **Path:** `/promo/admin/:id/toggle`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):**
  ```json
  {
    "message": "Promo code deactivated",
    "promo": { /* updated object */ }
  }
  ```

### 4.6 Admin: Delete Promo
- **Method:** `DELETE`
- **Path:** `/promo/admin/:id`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):** `{ "message": "Promo code deleted successfully" }`


---

## 5. Orders & Checkout (`/order`)

### 5.1 Create Order
- **Method:** `POST`
- **Path:** `/order`
- **Auth:** Required
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "paymentMethod": "COD",
    "promoCode": "YOGI10",       // Optional
    "pendingOrderId": "order_id_here", // Optional: Pass the old Online order ID if user abandons payment and switches to COD
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "MH",
      "zip": "400001",
      "phone": "9876543210"
    },
    "orderItems": [
      {
        "product": "PRODUCT_ID_STR",
        "variant": "VARIANT_ID_STR", // Optional
        "quantity": 1
      }
    ]
  }
  ```
- **Note on Abandoned Payments:** If a user starts an Online payment, closes Razorpay, and retries with COD — pass the old `_id` from the failed online order as `pendingOrderId`. The server will automatically cancel it before creating the new one. Orders stuck in `PENDING_PAYMENT` for more than **30 minutes** are also auto-cancelled on every new order request.

### 5.2 Verify Online Payment (Webhook/Callback substitute)
- **Method:** `POST`
- **Path:** `/order/verify-payment`
- **Auth:** Required
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "sign_..."
  }
  ```
- **Sample Response (200 OK):** `{ "success": true, "message": "Payment verified successfully" }`

### 5.3 Get My Orders
- **Method:** `GET`
- **Path:** `/order/myorders`
- **Auth:** Required
- **Sample Response (200 OK):** Array of all orders owned by the logged-in user.

### 5.4 Get My Single Order Detail
- **Method:** `GET`
- **Path:** `/order/myorders/:id`
- **Auth:** Required
- **Sample Response (200 OK):** Returns single matching order object.

### 5.5 Get Order by ID (Privileged)
- **Method:** `GET`
- **Path:** `/order/:id`
- **Auth:** Required (Must be Admin or the owner of the order)
- **Sample Response (200 OK):** Returns order with populated `user.name` and `user.email`.

### 5.6 Admin: Get All Orders (Paginated & Filtered)
- **Method:** `GET`
- **Path:** `/order/admin/all?page=1&limit=10&status=Shipped&paymentMethod=COD`
- **Auth:** Required (Admin Only)
- **Query Params:**
- `page`: Default 1
- `limit`: Default 10
- `status`: Optional (e.g., `Processing`, `Shipped`, `Delivered`, `Cancelled`)
- `paymentMethod`: Optional (`COD` or `Online`)
- **Sample Response (200 OK):**
- ```json
- {
-   "orders": [ /* array of order objects matching filters */ ],
-   "totalOrders": 150,
-   "currentPage": 1,
-   "totalPages": 15,
-   "limit": 10
- }
- ```

### 5.7 Admin: Update Order Status
- **Method:** `PUT`
- **Path:** `/order/status`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "orderId": "id_here",
    "status": "Shipped",          // Optional (enum: 'PENDING_PAYMENT', 'Processing', 'Shipped', 'Delivered', 'Cancelled')
    "paymentStatus": "PAID"       // Optional (enum: 'UNPAID', 'PAID', 'FAILED', 'REFUNDED')
  }
  ```
- **Sample Response (200 OK):** Triggers user email update and returns updated order object.


---

## 6. Admin Dashboard & Metrics (`/admin`)

### 6.1 Dashboard Statistics Overview
- **Method:** `GET`
- **Path:** `/admin/dashboard`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):**
  ```json
  {
    "overview": {
      "totalProducts": 105,
      "totalOrders": 32,
      "totalUsers": 210,
      "totalRevenue": 450000
    },
    "orders": {
      "byStatus": [ { "status": "Delivered", "count": 20 }, ... ],
      "byPaymentStatus": [...],
      "byPaymentMethod": [...]
    },
    "recentOrders": [...],
    "lowStockProducts": [...],
    "topSellingProducts": [...]
  }
  ```

### 6.2 Get Customers List
- **Method:** `GET`
- **Path:** `/admin/customers`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):** Returns total users filtered by `role: user` and an aggregated `orderCount` field sorted descending.

### 6.3 Get Specific Customer's Orders
- **Method:** `GET`
- **Path:** `/admin/customer-orders/:userId`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):** Array of all orders for the target `userId`.

### 6.4 Get System Settings
- **Method:** `GET`
- **Path:** `/admin/settings`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):**
  ```json
  { "isEmailEnabled": true }
  ```

### 6.5 Update Global Email Setting
- **Method:** `PUT`
- **Path:** `/admin/settings/email`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  { "isEmailEnabled": false }
  ```
- **Sample Response (200 OK):** Returns updated settings config.

### 6.6 Update Business Details (for Emails/Invoices)
- **Method:** `PUT`
- **Path:** `/admin/settings/business`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:**
  ```json
  {
    "brandName": "Yogi Fashion",
    "address": "123, Luxury Tower, Mumbai",
    "gstin": "27AAAAA0000A1Z5",
    "mobileNumber": "919876543210"
  }
  ```
- **Sample Response (200 OK):** Returns updated settings.

### 6.7 Get Business Info (Public)
- **Method:** `GET`
- **Path:** `/admin/business-info`
- **Description:** Returns non-sensitive business data for frontend contact pages.
- **Sample Response (200 OK):**
  ```json
  {
    "brandName": "...",
    "address": "...",
    "gstin": "...",
    "mobileNumber": "..."
  }
  ```

---

## 7. Newsletter Subscriptions (`/subscribe`)

### 7.1 Join Newsletter
- **Method:** `POST`
- **Path:** `/subscribe`
- **Body Data:**
  ```json
  { "email": "john@example.com" }
  ```
- **Description:** Validates and saves the subscriber to the database and sends a warm welcome email to the user.
- **Sample Response (200 OK):**
  ```json
  { "success": true, "message": "Subscribed successfully! Check your email for a warm welcome." }
  ```

---

## 8. Hero Section (`/hero`)

### 8.1 Get Active Slides (for frontend)
- **Method:** `GET`
- **Path:** `/hero`
- **Description:** Returns an array of all active hero section slides sorted by newest first.
- **Sample Response (200 OK):**
  ```json
  [
    {
      "_id": "...",
      "title": "Luxury Streetwear",
      "subtitle": "Discover the new collection",
      "image": "url_to_cloudinary"
    }
  ]
  ```

### 8.2 Admin: Manage Slides (GET All)
- **Method:** `GET`
- **Path:** `/hero/admin`
- **Auth:** Required (Admin Only)
- **Description:** returns all slides including inactive ones.

### 8.3 Admin: Create Slide
- **Method:** `POST`
- **Path:** `/hero/admin`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:**
  - `title`: String
  - `subtitle`: String
  - `image`: File
- **Sample Response (201 Created):** Newly created hero object.

### 8.4 Admin: Update Slide
- **Method:** `PUT`
- **Path:** `/hero/admin/:id`
- **Auth:** Required (Admin Only)
- **Format:** `multipart/form-data`
- **Body Data:** `title`, `subtitle`, `isActive`, `image` (All Optional)

### 8.5 Admin: Delete Slide
- **Method:** `DELETE`
- **Path:** `/hero/admin/:id`
- **Auth:** Required (Admin Only)
- **Sample Response (200 OK):** `{ "message": "Hero slide deleted successfully" }`

---

## 🔒 Error Codes
- **400 Bad Request:** Missing fields, stock running low, or invalid JSON.
- **401 Unauthorized:** Invalid, missing, or expired JWT Token.
- **403 Forbidden:** Valid user missing Administrator privileges.
- **404 Not Found:** Resource missing.
- **500 Internal Error:** Server crashes.

**Happy Coding! 🚀**
