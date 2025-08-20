const fs = require("fs");
const path = require("path");

console.log("Personal Knowledge Console (PKC) - Setup Guide\n");

const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.log("Creating .env file from template...");
  const envExamplePath = path.join(__dirname, "env.example");
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log(".env file created");
  } else {
    console.log("env.example not found");
  }
} else {
  console.log(".env file already exists");
}

console.log("Checking environment variables...");
const requiredVars = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
];

let missingVars = [];
for (const varName of requiredVars) {
  if (
    !process.env[varName] ||
    process.env[varName] === "your_supabase_project_url"
  ) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.log("Missing or invalid environment variables:", missingVars);
} else {
  console.log("All required environment variables are set");
}

console.log("- API Documentation: API_DOCUMENTATION.md");
console.log("- README: README.md");

console.log("\n Your PKC backend will be ready for Milestone 1!");
