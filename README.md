# PKC - Personal Knowledge Console

A full-stack application with AI-powered chat, file management, and knowledge organization.

## Project Structure

```
pkc-superbase-openai/
├── client/          # Next.js 14 Frontend
├── server/          # Node.js/Express Backend
└── README.md        # This file
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Clerk account

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Update .env with your credentials
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
cp .env.example .env.local
# Update .env.local with your credentials
npm run dev
```

### 3. Access the Application
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

## Development

### Backend (Server)
- **Port**: 3000
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **AI**: OpenAI

### Frontend (Client)
- **Port**: 3002
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Auth**: Clerk

## Key Features

- **Authentication**: Clerk-based user management
- **AI Chat**: OpenAI-powered conversations
- **File Management**: Upload and organize documents
- **Threads**: Conversation history
- **Search**: Global content search
- **Dashboard**: User statistics and activity

## Available Scripts

### Backend
```bash
npm run dev          # Start development server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Environment Variables

### Backend (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLERK_SECRET_KEY=your_clerk_secret_key
OPENAI_API_KEY=your_openai_api_key
PORT=3000
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

## Documentation

- [API Documentation](http://localhost:3000/api-docs) - Swagger UI

## Deployment

### Backend (Vercel)
```bash
cd server
vercel deploy
```

### Frontend (Vercel)
```bash
cd client
vercel deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.
