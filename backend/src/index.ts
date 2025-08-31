import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import twilioRoutes from "./routes/twilio";
import elevenlabsRoutes from "./routes/elevenlabs";
import { createAuthRoutes } from "./routes/auth";
import { createLeadsRoutes } from "./routes/leads";
import { createStatisticsRoutes } from "./routes/statistics";
import { createCampaignsRoutes } from "./routes/campaigns";
import { createAnalyticsRoutes } from "./routes/analytics";
import { createAppointmentsRoutes } from "./routes/appointments";
import { Pool } from "pg";
import { loadConfig } from "./config";
import { BatchStatusPoller } from "./services/batchStatusPoller";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const main = async () => {
  const config = await loadConfig();

  if (config === undefined) {
    throw new Error("Failed to load configuration");
  }

  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.env === "production" ? { rejectUnauthorized: false } : false,
  });

  // Create and mount routes with dependencies
  const authRoutes = createAuthRoutes(pool, config);
  const leadsRoutes = createLeadsRoutes(pool, config);
  const statisticsRoutes = createStatisticsRoutes(pool, config);
  const campaignsRoutes = createCampaignsRoutes(pool, config);
  const analyticsRoutes = createAnalyticsRoutes(pool, config);
  const appointmentsRoutes = createAppointmentsRoutes(pool, config);
  
  app.use("/api/auth", authRoutes);
  app.use("/api/leads", leadsRoutes);
  app.use("/api/statistics", statisticsRoutes);
  app.use("/api/campaigns", campaignsRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/twilio", twilioRoutes);
  app.use("/api/elevenlabs", elevenlabsRoutes);

  app.get("/health", (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: config.env || "development",
    });
  });

  const PORT = config.port || 3000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${config.env || "development"}`);
    
    // Start batch status polling for campaigns
    const poller = new BatchStatusPoller(pool);
    poller.startPolling(45000);
    
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, stopping batch poller...');
      poller.stopPolling();
      process.exit(0);
    });
  });
};

// Start the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
