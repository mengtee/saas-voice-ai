# Funnel AI Frontend

A comprehensive SAAS frontend for AI-powered customer service operations.

## Features

- **Lead Management**: Upload, manage, and track customer leads
- **Automated Calling**: AI-powered outbound calling with ElevenLabs integration
- **Real-time Dashboard**: Live call metrics and performance analytics
- **Appointment Scheduling**: Calendar integration for appointment management
- **WhatsApp Follow-ups**: Automated WhatsApp message campaigns

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **API Client**: Axios with interceptors
- **Real-time**: WebSocket integration

## Getting Started

### Prerequisites

- Node.js 18.18.0 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local` with your backend API URL

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
│   ├── Layout/            # Layout components (Sidebar, Header)
│   └── ui/                # shadcn/ui components
├── hooks/                  # Custom React hooks
├── lib/                   # Utility functions
├── services/              # API client and external services
├── store/                 # Zustand state management
└── types/                 # TypeScript type definitions
```

## Backend Integration

The frontend integrates with the existing backend API endpoints:

- `POST /elevenlabs/make-call` - Initiate outbound calls
- `GET /elevenlabs/conversation-status/:id` - Get call status
- `GET /elevenlabs/websocket-url/:id` - WebSocket for real-time updates
- Additional endpoints for leads, appointments, and WhatsApp

## Development

### Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality

- TypeScript strict mode enabled
- ESLint with Next.js recommended rules
- Prettier for code formatting (recommended)

## Deployment

This is a standard Next.js application and can be deployed to:

- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker containers

Make sure to set the environment variables in your deployment platform.