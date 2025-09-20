# PKC Application Deployment Guide

This guide will walk you through deploying your PKC (Personal Knowledge Console) application to Vercel. The application consists of a Next.js frontend and an Express.js backend.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Project Structure

```
pkc-superbase-openai/
├── client/          # Next.js Frontend
├── server/          # Express.js Backend
├── package.json     # Root package.json
└── DEPLOYMENT.md    # This file
```

## Deployment Steps

### Option A: Automatic Deployment from GitHub (Recommended)

This method will automatically deploy both frontend and backend whenever you push changes to your main branch.

#### Step 1: Set Up Backend (Server) Automatic Deployment

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"

2. **Import from GitHub:**
   - Select your GitHub repository (`pkc-superbase-openai`)
   - **Important**: Set the **Root Directory** to `server`
   - Project name: `pkc-backend` (or similar)
   - Framework Preset: `Other` (since it's Express.js)

3. **Configure Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `./` (leave empty for Node.js)
   - Install Command: `npm install`

4. **Set Environment Variables:**
   - Add all your backend environment variables from your `.env` file
   - Make sure to set them for "Production" environment

5. **Deploy:**
   - Click "Deploy"
   - This will give you a URL like: `https://pkc-backend-xxx.vercel.app`
   - **Save this URL** - you'll need it for the frontend

#### Step 2: Set Up Frontend (Client) Automatic Deployment

1. **Create Another Project:**
   - Go back to Vercel Dashboard
   - Click "New Project" again
   - Select the same GitHub repository (`pkc-superbase-openai`)

2. **Configure for Frontend:**
   - **Important**: Set the **Root Directory** to `client`
   - Project name: `pkc-frontend` (or similar)
   - Framework Preset: `Next.js` (Vercel will auto-detect this)

3. **Set Environment Variables:**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `NEXT_PUBLIC_API_URL`: Your backend URL (from Step 1)

4. **Deploy:**
   - Click "Deploy"
   - This will give you a URL like: `https://pkc-frontend-xxx.vercel.app`

#### Step 3: Update CORS Configuration

After both deployments, update your backend CORS settings to include your frontend domain:

1. **Edit `server/src/index.js`**
2. **Update the `allowedOrigins` array** to include your frontend URL:
   ```javascript
   const allowedOrigins = [
     'http://localhost:3000',
     'http://127.0.0.1:3000',
     'http://localhost:3002',
     'http://127.0.0.1:3002',
     'https://pkc-frontend-xxx.vercel.app', // Add your frontend URL
     /^https:\/\/.*\.vercel\.app$/ // Allow all Vercel preview deployments
   ];
   ```
3. **Commit and push** the changes to trigger automatic deployment

### Option B: Manual Deployment (Alternative)

### Step 1: Prepare Your Environment Variables

#### Frontend Environment Variables (client/)
Create a `.env.local` file in the `client/` directory with:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_API_URL=https://your-backend-app.vercel.app
```

#### Backend Environment Variables (server/)
Create a `.env` file in the `server/` directory with:

```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,txt,md,doc,docx,xls,xlsx,csv
UPLOAD_BUCKET_NAME=pkc-uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
APP_VERSION=1.0.0
```

### Step 2: Deploy the Backend (Server)

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy the backend:**
   ```bash
   vercel
   ```
   
   - Choose your team/account
   - Set project name (e.g., `pkc-backend`)
   - Confirm the directory is `./server`
   - Confirm the build command is `npm run build`
   - Confirm the output directory is `./`

4. **Set environment variables in Vercel dashboard:**
   - Go to your project in Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Add all the environment variables from your `.env` file
   - Make sure to set them for "Production" environment

5. **Note the deployment URL:**
   - After deployment, Vercel will provide a URL like `https://pkc-backend-xxx.vercel.app`
   - **Save this URL** - you'll need it for the frontend configuration

### Step 3: Deploy the Frontend (Client)

1. **Navigate to the client directory:**
   ```bash
   cd ../client
   ```

2. **Update the API URL in your environment:**
   - Edit your `.env.local` file
   - Set `NEXT_PUBLIC_API_URL` to your backend URL from Step 2

3. **Deploy the frontend:**
   ```bash
   vercel
   ```
   
   - Choose your team/account
   - Set project name (e.g., `pkc-frontend`)
   - Confirm the directory is `./client`
   - Confirm the build command is `npm run build`
   - Confirm the output directory is `./`

4. **Set environment variables in Vercel dashboard:**
   - Go to your frontend project in Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Add all the environment variables from your `.env.local` file
   - Make sure to set them for "Production" environment

### Step 4: Configure CORS (Important!)

After both deployments, you need to update the CORS configuration in your backend:

1. **Go to your backend Vercel project**
2. **Navigate to Functions → View Function Logs**
3. **Update the CORS configuration in your server code** to include your frontend domain

The CORS configuration should include your frontend URL:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://your-frontend-app.vercel.app', // Add your frontend URL here
  // ... other origins
];
```

### Step 5: Test Your Deployment

1. **Test the backend:**
   - Visit `https://your-backend-app.vercel.app/api/health`
   - You should see a health check response
   - Visit `https://your-backend-app.vercel.app/api-docs` for Swagger documentation

2. **Test the frontend:**
   - Visit your frontend URL
   - Try logging in and using the application
   - Check browser console for any CORS errors

### Step 6: Set Up Custom Domains (Optional)

1. **In Vercel dashboard:**
   - Go to your project settings
   - Navigate to "Domains"
   - Add your custom domain
   - Follow the DNS configuration instructions

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Make sure your backend CORS configuration includes your frontend URL
   - Check that environment variables are set correctly

2. **Environment Variables Not Working:**
   - Ensure variables are set in Vercel dashboard
   - Check that variable names match exactly
   - Redeploy after adding new environment variables

3. **Build Failures:**
   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

4. **API Routes Not Working:**
   - Check that the API URL in frontend matches your backend URL
   - Verify that the backend is deployed and accessible

### Useful Commands:

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Redeploy with environment variables
vercel --prod

# Remove a deployment
vercel rm [project-name]
```

## Environment Variables Reference

### Frontend (NEXT_PUBLIC_* variables are exposed to the browser):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk authentication public key
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `NEXT_PUBLIC_API_URL`: Backend API URL

### Backend (Server-side only):
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `OPENAI_API_KEY`: OpenAI API key
- `CLERK_SECRET_KEY`: Clerk secret key
- `CLERK_WEBHOOK_SECRET`: Clerk webhook secret
- Other configuration variables as needed

## Security Notes

1. **Never commit `.env` files** to your repository
2. **Use environment variables** in Vercel dashboard for sensitive data
3. **Enable HTTPS** (Vercel provides this by default)
4. **Review CORS settings** to ensure only authorized origins can access your API
5. **Use Clerk's production keys** for production deployment

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console for errors
3. Verify all environment variables are set correctly
4. Ensure CORS configuration includes your frontend domain

Your PKC application should now be successfully deployed to Vercel! 🚀
