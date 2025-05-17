# Dominion Store API Documentation

## Authentication

### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  }
}
```

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "phone": "string"
}
```

## Products

### GET /api/products
Get list of products with pagination.

**Query Parameters:**
- page: number (default: 1)
- limit: number (default: 20)
- category: string
- search: string
- sort: string (price_asc, price_desc, newest)

### POST /api/products
Create a new product (Admin only).

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "price": number,
  "categoryId": "string",
  "images": "string[]",
  "specifications": "object"
}
```

### GET /api/products/{id}
Get product details.

### PUT /api/products/{id}
Update product details (Admin only).

### DELETE /api/products/{id}
Delete a product (Admin only).

## Orders

### GET /api/orders
Get user orders with pagination.

### POST /api/orders
Create a new order.

**Request Body:**
```json
{
  "items": [{
    "productId": "string",
    "quantity": number
  }],
  "shippingAddress": {
    "street": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string"
  },
  "paymentMethod": "string"
}
```

### GET /api/orders/{id}
Get order details.

## Categories

### GET /api/categories
Get list of categories.

### POST /api/categories
Create a new category (Admin only).

### PUT /api/categories/{id}
Update category details (Admin only).

### DELETE /api/categories/{id}
Delete a category (Admin only).

## Payment Webhooks

### POST /api/webhooks/payment
Handle payment provider webhooks.

**Headers:**
- x-payment-provider: string
- x-webhook-signature: string

## Image Upload

### POST /api/upload
Upload product images.

**Request Body:**
- FormData with file field

**Response:**
```json
{
  "url": "string"
}
```

## Rate Limits

- API requests: 100 requests per 15 minutes
- Authentication attempts: 5 attempts per 15 minutes
- Image uploads: 50 uploads per hour