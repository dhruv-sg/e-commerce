# E-Commerce Backend API Guide

## 📋 Overview
This is a Node.js/Express backend for an e-commerce application with JWT authentication, role-based access control, and a secure token-based purchase system.

## 🛠️ Tech Stack
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Security**: helmet, express-rate-limit, cors

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Your `.env` file is already configured:
```
MONGO_URI=mongodb+srv://admin:hellodhruv@votingapp.fle2nxm.mongodb.net/shopping
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=7d
PORT=4000
```

### 3. Start the Server
```bash
node server.js
```
Server will run on: `http://localhost:4000`

---

## 📚 API Endpoints

### 🔐 **User Authentication** (`/user`)

#### 1. **Sign Up**
- **POST** `/user/signup`
- **Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "user"  // or "admin"
}
```
- **Response**:
```json
{
  "response": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. **Login**
- **POST** `/user/login`
- **Body**:
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```
- **Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 🛍️ **Products** (`/product`)

#### 1. **Get All Products**
- **GET** `/product`
- **Auth**: Not required
- **Response**:
```json
[
  {
    "_id": "...",
    "title": "Product Name",
    "description": "Product description",
    "price": 99.99,
    "stock": 50,
    "reviews": [],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 2. **Get Single Product**
- **GET** `/product/:id`
- **Auth**: Not required
- **Response**:
```json
{
  "_id": "...",
  "title": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "stock": 50,
  "reviews": [
    {
      "user": {
        "_id": "...",
        "name": "John Doe"
      },
      "rating": 5,
      "comment": "Great product!",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 3. **Create Product** (Admin Only)
- **POST** `/product`
- **Auth**: Required (Admin role)
- **Headers**:
```
Authorization: Bearer <your_jwt_token>
```
- **Body**:
```json
{
  "title": "New Product",
  "description": "Product description",
  "price": 99.99,
  "stock": 100
}
```
- **Response**:
```json
{
  "_id": "...",
  "title": "New Product",
  "description": "Product description",
  "price": 99.99,
  "stock": 100,
  "reviews": [],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 🛒 **Orders** (`/order`)

#### 1. **Generate Purchase Token**
- **POST** `/order/token/:productId`
- **Auth**: Required 
```
Authorization: Bearer <your_jwt_token>
```
- **Response**:
```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "expiresAt": "2024-01-01T00:05:00.000Z"
}
```
- **Note**: Token is valid for 5 minutes only

#### 2. **Create Order (Purchase)**
- **POST** `/order`
- **Auth**: Required
- **Headers**:
```
Authorization: Bearer <your_jwt_token>
```
- **Body**:
```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "quantity": 2
}
```
- **Response**:
```json
{
  "message": "Order created successfully",
  "order": {
    "_id": "...",
    "user": "...",
    "items": [
      {
        "product": "...",
        "quantity": 2
      }
    ],
    "total": 199.98,
    "status": "created",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 3. **Get All Orders** (Admin Only)
- **GET** `/order/all`
- **Auth**: Required (Admin role)
- **Headers**:
```
Authorization: Bearer <your_jwt_token>
```
- **Response**:
```json
[
  {
    "_id": "...",
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "items": [
      {
        "product": {
          "_id": "...",
          "title": "Product Name",
          "price": 99.99
        },
        "quantity": 2
      }
    ],
    "total": 199.98,
    "status": "created",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

## 🔑 Authentication Flow

### How to Use JWT Tokens

1. **Sign up or Login** to get a JWT token
2. **Include the token** in all protected routes:
   ```
   Authorization: Bearer <your_token_here>
   ```

### Example with cURL:
```bash
# Login
curl -X POST http://localhost:4000/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"securePassword123"}'

# Use token in protected route
curl -X POST http://localhost:4000/product \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"title":"New Product","price":99.99,"stock":100}'
```

### Example with Postman:
1. Go to **Authorization** tab
2. Select **Type**: Bearer Token
3. Paste your JWT token in the **Token** field

---

## 🔒 Security Features

### 1. **Two-Step Purchase Process**
This backend uses a secure two-step purchase flow to prevent race conditions and double-spending:

**Step 1**: Generate a one-time purchase token
```bash
POST /order/token/:productId
```

**Step 2**: Use the token to complete the purchase
```bash
POST /order
Body: { "token": "...", "quantity": 2 }
```

**Why?** This ensures:
- ✅ Stock is checked before purchase
- ✅ Tokens expire after 5 minutes
- ✅ Tokens can only be used once
- ✅ Prevents concurrent purchase conflicts

### 2. **Role-Based Access Control**
- **User role**: Can browse products, create orders
- **Admin role**: Can create products, view all orders

### 3. **Password Security**
- Passwords are hashed using bcrypt with salt rounds
- Plain text passwords are never stored

---

## 📊 Database Models

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  role: String (enum: ['user', 'admin'], default: 'user')
}
```

### Product Model
```javascript
{
  title: String (required),
  description: String,
  price: Number (required),
  stock: Number (default: 0),
  reviews: [{
    user: ObjectId (ref: User),
    rating: Number (1-5),
    comment: String,
    createdAt: Date
  }],
  createdAt: Date
}
```

### Order Model
```javascript
{
  user: ObjectId (ref: User),
  items: [{
    product: ObjectId (ref: Product),
    quantity: Number (min: 1)
  }],
  total: Number (required),
  status: String (enum: ['created', 'paid', 'shipped', 'cancelled']),
  createdAt: Date
}
```

### OneTimeAction Model
```javascript
{
  user: ObjectId (ref: User),
  actionType: String ('purchase'),
  product: ObjectId (ref: Product),
  token: String (UUID),
  used: Boolean (default: false),
  expiresAt: Date
}
```

---

## 🧪 Testing the API

### Complete Purchase Flow Example:

```bash
# 1. Create an admin user
curl -X POST http://localhost:4000/user/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'

# Save the token from response

# 2. Create a product (as admin)
curl -X POST http://localhost:4000/product \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "title": "iPhone 15",
    "description": "Latest iPhone",
    "price": 999.99,
    "stock": 50
  }'

# Save the product _id from response

# 3. Create a regular user
curl -X POST http://localhost:4000/user/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "user123",
    "role": "user"
  }'

# Save the user token

# 4. Generate purchase token
curl -X POST http://localhost:4000/order/token/<product_id> \
  -H "Authorization: Bearer <user_token>"

# Save the purchase token

# 5. Complete the purchase
curl -X POST http://localhost:4000/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{
    "token": "<purchase_token>",
    "quantity": 1
  }'

# 6. View all orders (as admin)
curl -X GET http://localhost:4000/order/all \
  -H "Authorization: Bearer <admin_token>"
```

---

## ⚠️ Common Errors

### 401 Unauthorized
- **Cause**: Missing or invalid JWT token
- **Solution**: Include valid token in Authorization header

### 403 Forbidden
- **Cause**: User doesn't have required role (e.g., trying to create product as non-admin)
- **Solution**: Use admin account for admin-only routes

### 400 Bad Request (Token errors)
- **Cause**: 
  - "Invalid or already used token" - Token was already used
  - "Token expired" - Token is older than 5 minutes
- **Solution**: Generate a new purchase token

### 400 Bad Request (Stock)
- **Cause**: "Not enough stock"
- **Solution**: Check product stock before purchase

---

## 🎯 Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Verify `.env` file exists with correct values
- [ ] Start server: `node server.js`
- [ ] Create an admin user via `/user/signup`
- [ ] Create products via `/product` (as admin)
- [ ] Create a regular user
- [ ] Test purchase flow with token generation

---

## 📝 Notes

- JWT tokens don't expire by default (you may want to add expiration)
- Purchase tokens expire after 5 minutes
- Stock is automatically decremented after successful purchase
- All passwords are automatically hashed before saving
- The database connection is to MongoDB Atlas

---

## 🔧 Recommended Improvements

1. Add JWT token expiration handling
2. Add input validation middleware
3. Add rate limiting to prevent abuse
4. Add order status update endpoints
5. Add product review endpoints
6. Add pagination for product listings
7. Add search and filter functionality
8. Add password reset functionality
9. Add email notifications for orders
10. Add proper error handling middleware

---

**Happy Coding! 🚀**
