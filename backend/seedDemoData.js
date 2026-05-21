import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import connectDB from "./config/db.js";
import User from "./models/userModel.js";
import Category from "./models/categoryModel.js";
import Product from "./models/productModel.js";

dotenv.config();

const demoPassword = "Demo123456";

const image = (id, alt) => ({
  imageId: `demo-${id}`,
  original: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`,
  medium: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`,
  thumbnail: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=320&q=80`,
  blurDataURL: "",
  alt,
});

const categories = [
  "Web Development",
  "Design",
  "Marketing",
  "Cloud & DevOps",
  "Business",
];

const products = [
  {
    name: "React Landing Page Development",
    brand: "Frontend Studio",
    category: "Web Development",
    price: 249,
    countInStock: 8,
    description:
      "A responsive React landing page for startups, portfolios, and product launches.",
    imageId: "photo-1498050108023-c5249f4df085",
  },
  {
    name: "MERN API Development",
    brand: "NodeCraft",
    category: "Web Development",
    price: 399,
    countInStock: 5,
    description:
      "REST API development with Node.js, Express, MongoDB, authentication, and clean architecture.",
    imageId: "photo-1555066931-4365d14bab8c",
  },
  {
    name: "Marketplace UI Design Kit",
    brand: "PixelForge",
    category: "Design",
    price: 149,
    countInStock: 12,
    description:
      "Modern UI screens and components for marketplace, SaaS, and dashboard products.",
    imageId: "photo-1561070791-2526d30994b5",
  },
  {
    name: "Logo Design Package",
    brand: "Brandly",
    category: "Design",
    price: 99,
    countInStock: 15,
    description:
      "Clean logo concept with color palette and basic brand usage guidelines.",
    imageId: "photo-1618005198919-d3d4b5a92ead",
  },
  {
    name: "SEO Audit Report",
    brand: "GrowthLab",
    category: "Marketing",
    price: 129,
    countInStock: 10,
    description:
      "Technical SEO audit with actionable recommendations for better search visibility.",
    imageId: "photo-1460925895917-afdab827c52f",
  },
  {
    name: "Social Media Content Pack",
    brand: "ContentFlow",
    category: "Marketing",
    price: 89,
    countInStock: 20,
    description:
      "Ready-to-use content ideas, captions, and post templates for small businesses.",
    imageId: "photo-1611162617474-5b21e879e113",
  },
  {
    name: "Cloud Deployment Setup",
    brand: "DeployMate",
    category: "Cloud & DevOps",
    price: 299,
    countInStock: 6,
    description:
      "Deployment setup for frontend, backend, environment variables, and production checklist.",
    imageId: "photo-1451187580459-43490279c0fa",
  },
  {
    name: "Docker Configuration Service",
    brand: "ContainerOps",
    category: "Cloud & DevOps",
    price: 199,
    countInStock: 7,
    description:
      "Dockerfile and docker-compose setup for local development and deployment workflows.",
    imageId: "photo-1558494949-ef010cbdcc31",
  },
  {
    name: "Startup Business Plan Template",
    brand: "BizKit",
    category: "Business",
    price: 59,
    countInStock: 25,
    description:
      "Editable business plan template for early-stage projects and portfolio startups.",
    imageId: "photo-1454165804606-c3d57bc86b40",
  },
  {
    name: "Pitch Deck Review",
    brand: "FounderDesk",
    category: "Business",
    price: 119,
    countInStock: 9,
    description:
      "Detailed review of your pitch deck structure, clarity, and investor-readiness.",
    imageId: "photo-1551836022-d5d88e9218df",
  },
  {
    name: "Admin Dashboard Template",
    brand: "DashCore",
    category: "Web Development",
    price: 179,
    countInStock: 11,
    description:
      "Responsive admin dashboard layout with cards, tables, charts, and navigation.",
    imageId: "photo-1551288049-bebda4e38f71",
  },
  {
    name: "Product Page Copywriting",
    brand: "CopyPilot",
    category: "Marketing",
    price: 79,
    countInStock: 18,
    description:
      "Conversion-focused product description, benefits section, and call-to-action copy.",
    imageId: "photo-1516321318423-f06f85e504b3",
  },
  {
    name: "Mobile App UI Concept",
    brand: "AppVisual",
    category: "Design",
    price: 189,
    countInStock: 10,
    description:
      "High-fidelity mobile app UI concept for onboarding, home, profile, and checkout screens.",
    imageId: "photo-1512941937669-90a1b58e7e9c",
  },
  {
    name: "Performance Optimization Review",
    brand: "SpeedStack",
    category: "Cloud & DevOps",
    price: 159,
    countInStock: 8,
    description:
      "Frontend and backend performance review with practical optimization recommendations.",
    imageId: "photo-1518770660439-4636190af475",
  },
  {
    name: "Portfolio Website Setup",
    brand: "CareerWeb",
    category: "Web Development",
    price: 229,
    countInStock: 6,
    description:
      "Personal portfolio website setup with responsive sections, projects, and contact area.",
    imageId: "photo-1519389950473-47ba0277781c",
  },
];

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const seed = async () => {
  await connectDB();

  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  const seller = await User.findOneAndUpdate(
    { email: "seller@demo.com" },
    {
      username: "demo seller",
      email: "seller@demo.com",
      password: hashedPassword,
      isSeller: true,
      isAdmin: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await User.findOneAndUpdate(
    { email: "admin@demo.com" },
    {
      username: "demo admin",
      email: "admin@demo.com",
      password: hashedPassword,
      isSeller: true,
      isAdmin: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await User.findOneAndUpdate(
    { email: "customer@demo.com" },
    {
      username: "demo customer",
      email: "customer@demo.com",
      password: hashedPassword,
      isSeller: false,
      isAdmin: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const categoryDocs = {};

  for (const categoryName of categories) {
    const category = await Category.findOneAndUpdate(
      { name: categoryName },
      { name: categoryName },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    categoryDocs[categoryName] = category;
  }

  for (const product of products) {
    const slug = slugify(product.name);

    await Product.findOneAndUpdate(
      {
        seller: seller._id,
        slug,
      },
      {
        seller: seller._id,
        name: product.name,
        slug,
        images: [image(product.imageId, product.name)],
        tempUploads: [],
        status: "ready",
        processingError: "",
        brand: product.brand,
        category: categoryDocs[product.category]._id,
        price: product.price,
        quantity: product.countInStock,
        countInStock: product.countInStock,
        description: product.description,
        reviews: [],
        numReviews: 0,
        rating: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  console.log("Demo data seeded successfully");
  console.log("Demo accounts:");
  console.log("admin@demo.com / Demo123456");
  console.log("seller@demo.com / Demo123456");
  console.log("customer@demo.com / Demo123456");

  process.exit(0);
};

seed().catch((error) => {
  console.error("Demo seed failed:", error);
  process.exit(1);
});
