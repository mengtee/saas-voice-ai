# Customer Service Backend - Twilio & ElevenLabs Integration

A TypeScript backend service that integrates Twilio Voice API with ElevenLabs Conversational AI for handling inbound and outbound voice calls.

## Features

### Inbound Call Handling
- Receive calls via Twilio webhooks
- Forward calls to ElevenLabs Conversational AI
- Support for personalized conversations with webhook data

### Outbound Call Functionality  
- Make calls through Twilio programmatically
- Initiate calls directly through ElevenLabs API
- Support for custom parameters and personalization

### Native ElevenLabs Integration
- Configure phone numbers directly in ElevenLabs dashboard
- Automatic webhook configuration
- Built-in call routing and management

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and configure:
   ```
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number

   # ElevenLabs Configuration
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id

   # Server Configuration
   PORT=3000
   BASE_URL=https://your-domain.com
   ```

3. **Build and Start**
   ```bash
   npm run build
   npm start
   
   # For development
   npm run dev
   ```

## API Endpoints

### Twilio Routes (`/api/twilio`)
- `POST /webhook/inbound` - Handle incoming calls
- `POST /connect-elevenlabs` - Connect calls to ElevenLabs
- `POST /make-call` - Initiate outbound calls
- `POST /webhook/outbound` - Handle outbound call webhooks
- `GET /call-status/:callSid` - Get call status

### ElevenLabs Routes (`/api/elevenlabs`)
- `POST /make-call` - Initiate calls via ElevenLabs
- `GET /conversation-status/:conversationId` - Get conversation status
- `POST /add-phone-number` - Add phone number to ElevenLabs
- `GET /phone-numbers` - List configured phone numbers
- `POST /webhook/personalization` - Handle personalization webhooks
- `GET /websocket-url/:conversationId` - Get WebSocket URL for conversation

## Integration Approaches

### Approach 1: Native ElevenLabs Integration (Recommended)
1. Configure phone numbers in ElevenLabs dashboard
2. ElevenLabs handles Twilio integration automatically
3. Minimal backend code required
4. Use `/api/elevenlabs/add-phone-number` to register numbers

### Approach 2: Custom WebSocket Integration
1. Handle Twilio webhooks in your backend
2. Establish WebSocket connections to both services
3. More control but increased complexity
4. Use Twilio webhook endpoints for call routing

## Usage Examples

### Make Outbound Call via ElevenLabs
```bash
curl -X POST http://localhost:3000/api/elevenlabs/make-call \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "customParameters": {
      "customerName": "John Doe",
      "accountType": "Premium"
    }
  }'
```

### Make Outbound Call via Twilio
```bash
curl -X POST http://localhost:3000/api/twilio/make-call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890"
  }'
```

### Add Phone Number to ElevenLabs
```bash
curl -X POST http://localhost:3000/api/elevenlabs/add-phone-number \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "label": "Customer Service Line"
  }'
```

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm test
```

## Architecture

The backend follows a modular architecture:
- **Services**: Business logic for Twilio and ElevenLabs integrations
- **Routes**: API endpoints and request handling
- **Types**: TypeScript interfaces and type definitions
- **Utils**: Shared utilities and helpers

## Error Handling

All endpoints include comprehensive error handling with:
- Detailed error messages
- Proper HTTP status codes
- Console logging for debugging
- Graceful fallbacks for failed operations