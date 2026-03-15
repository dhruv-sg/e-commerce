# 🚀 E-Commerce Professional API Guide

This document provides a comprehensive guide to the E-Commerce Backend API. It includes detailed instructions on authentication, product management (with variants), and order processing.

---

## 📋 Table of Contents
1. [Authentication](#-authentication-user)
2. [Categories](#-categories-category)
3. [Products](#-products-product)
   - [Variant System Guide](#-variant-system-guide)
4. [Orders](#-orders-order)
5. [Common Responses & Security](#-common-responses--security)

## 🚀 How to Test in Postman

To test the complex parts of this API (like variants and photos), follow these specific Postman setups:

### 1. **Sign Up (New User)**
- **Tab**: `Body` -> `form-data`
- **Keys**:
  - `name`: `John Doe`
  - `email`: `john@example.com`
  - `password`: `john123`
  - `role`: `admin` (Use admin to test product creation)
  - `image`: [Select a file from your computer]

### 2. **Create Product with Variants (The Hard Part)**
This uses the prefix system to group data and photos.
- **Headers**: `Authorization: Bearer <your_token>`
- **Tab**: `Body` -> `form-data`
- **Setup**:
| Key | Value | Type |
| :--- | :--- | :--- |
| `hasVariant` | `Yes` | Text |
| `name` | `Nike Runner` | Text |
| `brand` | `Nike` | Text |
| `category` | `[Your_Category_ID]` | Text |
| **--- Variant 1 ---** | | |
| `V1_color` | `Blue` | Text |
| `V1_price` | `2500` | Text |
| `V1_stock` | `10` | Text |
| `V1_images` | `[Select Blue Shoe Photo]` | **File** |
| **--- Variant 2 ---** | | |
| `V2_color` | `Red` | Text |
| `V2_price` | `2600` | Text |
| `V2_stock` | `5` | Text |
| `V2_images` | `[Select Red Shoe Photo]` | **File** |

> [!NOTE]
> Postman allows multiple files for the same key. If you want 3 photos for the Blue variant, just add `V1_images` three times and select different files.

### 3. **Place an Order**
- **Headers**: `Authorization: Bearer <token>`
- **Tab**: `Body` -> `raw` (Select `JSON`)
- **Body**:
```json
{
  "paymentMethod": "COD",
  "shippingAddress": {
    "street": "123 Street",
    "city": "Mumbai",
    "state": "MH",
    "zip": "400001",
    "phone": "9999999999"
  },
  "orderItems": [
    {
      "product": "PARENT_PRODUCT_ID",
      "variant": "SPECIFIC_VARIANT_ID", // If no variant, use same as PARENT_PRODUCT_ID
      "quantity": 1
    }
  ]
}
```

> [!IMPORTANT]
> **How IDs work**:
> - If product has **NO variants**: Both `product` and `variant` should be the same ID.
> - If product **HAS variants**: `product` is the main ID, and `variant` is the `_id` found inside the `variants` array.

---

## 🔐 Authentication (`/user`)

### 1. **User Sign Up**
Create a new user account with an optional profile image.
- **Method**: `POST`
- **Path**: `/user/signup`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `name`: String (Required)
  - `email`: String (Required, Unique)
  - `password`: String (Required)
  - `role`: String (Optional: `user` or `admin`. Default: `user`)
  - `image`: File (Optional - Profile picture)

### 2. **User Login**
Authenticate and receive a JWT token.
- **Method**: `POST`
- **Path**: `/user/login`
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "yourPassword123"
  }
  ```
- **Response**: Returns a Bearer Token for protected routes.

---

## 📁 Categories (`/category`)

### 1. **Get All Categories**
- **Method**: `GET`
- **Path**: `/category`

### 2. **Create Category** (Admin Only)
- **Method**: `POST`
- **Path**: `/category`
- **Headers**: `Authorization: Bearer <token>`
- **Body** (form-data): `name`, `slug`, `image` (File)

---

## 🛍️ Products (`/product`)

### 1. **Get All Products**
- **Method**: `GET`
- **Path**: `/product`
- **Note**: Use this for full product data.

### 2. **Get Product Thumbnails** (Recommended for Listings)
Lightweight response containing only essential data for grid views.
- **Method**: `GET`
- **Path**: `/product/thumbnail`
- **Fields**: `_id`, `name`, `brand`, `images`, `price`, `discountPrice`

### 3. **Create Product** (Admin Only)
Supports a high-level **Variant System** using pure Form-Data.
- **Method**: `POST`
- **Path**: `/product`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`

#### **Standard Fields**:
| Key | Type | Description |
| :--- | :--- | :--- |
| `hasVariant` | String | `Yes` or `No`. If `No`, uses the following global fields. |
| `name` | String | Product name. |
| `description` | String | Detailed description. |
| `brand` | String | Brand name. |
| `category` | ObjectId | Category ID. |
| `price` | Number | Global price. |
| `discountPrice`| Number | Global discounted price. |
| `stock` | Number | Global stock. |
| `images` | Files | Global product photos. |

---

### 🎨 Variant System Guide

If `hasVariant` is set to **`Yes`**, you can define multiple variants (e.g., Color/Size) with their own prices and photos. Use prefixes `V1_`, `V2_`, etc.

> [!TIP]
> **Auto-Sync Feature**: When `hasVariant` is `Yes`, the server automatically copies **Variant 1 (V1)** data to the global fields. This ensures your "Thumbnail" view always shows a valid price and image without manual entry.

#### **Variant Fields Example (V1)**:
- `V1_color`: "Midnight Blue"
- `V1_size`: "Large"
- `V1_price`: 1500
- `V1_discountPrice`: 1200
- `V1_stock`: 50
- `V1_images`: [File1, File2] (Upload photos specific to this color)

---

## 🛒 Orders (`/order`)

### 1. **Place an Order**
Purchase one or more products. Supports specific variant selection.
- **Method**: `POST`
- **Path**: `/order`
- **Body** (application/json):
  ```json
  {
    "paymentMethod": "COD", // or "Online"
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "MH",
      "zip": "400001",
      "phone": "9876543210"
    },
    "orderItems": [
      {
        "product": "PARENT_PRODUCT_ID",
        "color": "Midnight Blue", // Optional: matches specific variant
        "size": "Large",          // Optional: matches specific variant
        "quantity": 1
      }
    ]
  }
  ```

### 2. **Payment Verification** (Online Orders)
Used after a successful Razorpay transaction.
- **Method**: `POST`
- **Path**: `/order/verify-payment`
- **Body**: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`

### 3. **My Orders**
- **Method**: `GET`
- **Path**: `/order/myorders`

---

## 🔒 Common Responses & Security

- **401 Unauthorized**: JWT token is missing or expired.
- **403 Forbidden**: You are trying to access an Admin route with a User account.
- **Stock Validation**: Orders will fail with a `400` error if stock for the selected variant is insufficient.
- **Secure ID Tracking**: Orders automatically track both the `product ID` and the specific `variant ID` bought, ensuring accurate inventory management.

---

**Happy Coding! 🚀**
