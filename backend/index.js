import dotenv from "dotenv";

import connectDB from "./config/db.js";
import createApp from "./app.js";

import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

const port = process.env.PORT || 5000;

connectDB();

const app = createApp({
  routes: {
    webhookRoutes,
    userRoutes,
    categoryRoutes,
    productRoutes,
    orderRoutes,
    favoriteRoutes,
  },
});

app.listen(port, "0.0.0.0", () =>
  console.log(`Server running on port: ${port}`),
);
