const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const client = new MongoClient(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 20000,
  connectTimeoutMS: 20000,
  family: 4
});

let db;
let usersCollection;
let productsCollection;
let ordersCollection;

// Connect MongoDB
async function connectDB() {
  try {
    await client.connect();

    db = client.db("customglow");

    usersCollection = db.collection("users");
    productsCollection = db.collection("products");
    ordersCollection = db.collection("orders");

    await usersCollection.createIndex({ email: 1 }, { unique: true });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log("MongoDB connection error:", error.message);
  }
}

// Image upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Middleware: check login token
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// Middleware: admin only
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
}

// Home test route
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CustomGlow Backend</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            height: 100vh;
            justify-content: center;
            align-items: center;
            background: #faf7f2;
          }

          .box {
            text-align: center;
            padding: 30px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }

          button {
            padding: 12px 25px;
            border: none;
            background: #2C1810;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
          }

          button:hover {
            background: #D4A373;
          }
        </style>
      </head>

      <body>
        <div class="box">
          <h1>CustomGlow Backend is Running</h1>
          <p>Server is connected and ready.</p>
          <button onclick="alert('Backend working!')">Test Button</button>
        </div>
      </body>
    </html>
  `);
});

// Register user
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(user);

    res.json({
      message: "User registered successfully",
      user: {
        id: result.insertedId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message
    });
  }
});

// Login user
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await productsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load products",
      error: error.message
    });
  }
});

// Add product - admin only
app.post(
  "/api/products",
  protect,
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, category, price, description, stock } = req.body;

      if (!name || !category || !price || !description) {
        return res.status(400).json({
          message: "Name, category, price and description are required"
        });
      }

      const product = {
        name,
        category,
        price: Number(price),
        description,
        stock: Number(stock) || 10,
        image: req.file ? `/uploads/${req.file.filename}` : "",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await productsCollection.insertOne(product);

      res.json({
        message: "Product added successfully",
        product: {
          _id: result.insertedId,
          ...product
        }
      });
    } catch (error) {
      res.status(500).json({
        message: "Product upload failed",
        error: error.message
      });
    }
  }
);

// Delete product - admin only
app.delete("/api/products/:id", protect, adminOnly, async (req, res) => {
  try {
    const productId = req.params.id;

    const result = await productsCollection.deleteOne({
      _id: new ObjectId(productId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Delete failed",
      error: error.message
    });
  }
});

// Place order
// This supports both normal checkout orders and custom candle requests
app.post("/api/orders", async (req, res) => {
  try {
    const {
      orderType,
      customerName,
      name,
      email,
      phone,
      address,
      city,
      postalCode,
      items,
      total,
      customDetails
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const finalOrderType = orderType || "Normal Order";

    const order = {
      orderType: finalOrderType,
      customerName: customerName || name || "Unknown Customer",
      email,
      phone: phone || "N/A",
      address: address || "N/A",
      city: city || "N/A",
      postalCode: postalCode || "N/A",
      items: Array.isArray(items) ? items : [],
      total: Number(total) || 0,
      customDetails: customDetails || null,
      status: "Pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await ordersCollection.insertOne(order);

    res.json({
      message:
        finalOrderType === "Custom Order"
          ? "Custom order request submitted successfully"
          : "Order placed successfully",
      order: {
        _id: result.insertedId,
        ...order
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Order failed",
      error: error.message
    });
  }
});

// Get all orders - admin only
// Supports optional status filter: /api/orders?status=Pending
app.get("/api/orders", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const orders = await ordersCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load orders",
      error: error.message
    });
  }
});

// Mark order as completed / update order status - admin only
app.patch("/api/orders/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});