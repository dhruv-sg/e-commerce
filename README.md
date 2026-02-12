# E-Commerce API

A robust and scalable RESTful API for an e-commerce platform built with Node.js, Express, and MongoDB.

## Features

- **User Authentication**: Secure registration and login with JWT (JSON Web Tokens).
- **Product Management**: CRUD operations for products with image upload support.
- **Order Processing**: Complete order lifecycle management.
- **Admin Dashboard**: Role-based access control for administrative tasks.
- **Security**: Implemented with Helmet, rate limiting, and password hashing.
- **Scalability**: Built with a modular architecture for easy maintenance and scaling.

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/)
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, bcrypt, express-rate-limit
- **Utilities**: UUID for unique IDs

## Prerequisites

- Node.js (v14 or higher recommended)
- MongoDB (local or cloud-based like MongoDB Atlas)
- npm (usually comes with Node.js)

## Installation

1.  **Clone the repository** (or download the source code).

2.  **Navigate to the project directory**:
    ```bash
    cd e-commerce
    ```

3.  **Install dependencies**:
    ```bash
    npm install
    ```

## Configuration

1.  Create a `.env` file in the root directory.
2.  Add the following environment variables to the `.env` file:

    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_secret_key
    ```

    - **PORT**: The port on which the server will run.
    - **MONGO_URI**: Your MongoDB connection string.
    - **JWT_SECRET**: A secret key used for signing and verifying JWT tokens.

## Usage

### Development

To start the server in development mode with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

### Production

To start the server in production mode:

```bash
npm start
```

## API Documentation

Please refer to [API_GUIDE.md](API_GUIDE.md) for detailed information about the API endpoints, request/response formats, and usage examples.

## Project Structure

```
e-commerce/
├── config/         # Configuration files (e.g., database)
├── controllers/    # Request handlers
├── middleware/     # Custom middleware (e.g., auth, error handling)
├── models/         # Mongoose schemas
├── routes/         # API route definitions
├── server.js       # Entry point
└── .env            # Environment variables (not in git)
```

## License

ISC
# e-commerce
POST --> to signup new user --> http://localhost:4000/user/signup
         {
	"name":"boss",
	"email":"boss@gmail.com",
	"password":"1234",
	"role":"admin"
}

POST --> for login and get JWT --> http://localhost:4000/user/login
        {
  "email":"boss@gmail.com",
	"password":"1234"
}

POST --> to add new product require admin JWT token http://localhost:4000/product/
{
"title":"macbookpro",
	"description":"laptop",
	"price": "150000",
	"stock" : 10
	
}


GET --> to get the list of products http://localhost:4000/product/

POST --> to generate perchase token - which requires the JWT of user (only used once )--> http://localhost:4000/order/token/:productID

POST --> to order product need JWT of user--> http://localhost:4000/order/
{
  "token": "perchase token",
  "quantity": 5
}

GET --> to get the all orders --> http://localhost:4000/order/all

