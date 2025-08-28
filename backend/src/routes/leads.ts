import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { Pool } from "pg";
import { Config } from "../config";
import { LeadService } from "../services/leadService";
import { createAuthMiddleware } from "../middleware/auth";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV and Excel files
    const allowedExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV and Excel files are allowed."));
    }
  },
});

export const createLeadsRoutes = (pool: Pool, config: Config) => {
  const router = express.Router();
  const leadService = new LeadService({ pool });
  const authenticateToken = createAuthMiddleware(pool, config);

  /**
   * POST /api/leads/upload
   * Upload leads from CSV/Excel file
   */
  router.post(
    "/upload",
    authenticateToken,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: "No file uploaded",
          });
        }

        console.log(`Processing lead upload: ${req.file.originalname}`);

        // Get tenant_id from authenticated user
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
          return res.status(400).json({
            success: false,
            error: "Tenant context missing"
          });
        }

        // Process the uploaded file
        const result = await leadService.uploadLeads(
          req.file.path,
          req.file.originalname,
          tenantId
        );

        // Return results
        res.json({
          success: result.success,
          data: {
            imported: result.imported,
            errors: result.errors,
            duplicates: result.duplicates,
            total: result.total,
          },
          message: result.success
            ? `Successfully imported ${result.imported} leads`
            : "Upload completed with errors",
        });
      } catch (error: any) {
        console.error("Lead upload error:", error);

        // Clean up file if it exists
        if (req.file?.path) {
          try {
            const fs = require("fs");
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.warn("Failed to clean up file:", cleanupError);
          }
        }

        res.status(500).json({
          success: false,
          error: error.message || "Upload failed",
        });
      }
    }
  );

  /**
   * GET /api/leads
   * Get paginated leads
   */
  router.get("/", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Get tenant_id from authenticated user
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: "Tenant context missing"
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const search = req.query.search as string || '';
      const status = req.query.status as string || '';
      
      const result = await leadService.getLeads(tenantId, page, pageSize, search, status);

      res.json({
        success: true,
        data: {
          items: result.leads,
          totalCount: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error("Get leads error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch leads",
      });
    }
  });

  /**
   * GET /api/leads/template
   * Download CSV template for lead uploads
   */
  router.get("/template", authenticateToken, (req: Request, res: Response) => {
    const csvTemplate = `date,name,phone_number,email,purpose,call_status,notes
2025-08-26,John Doe,+1234567890,john@example.com,Sales inquiry,pending,Interested in premium package
2025-08-26,Jane Smith,+1234567891,jane@techstart.com,Product demo,pending,Follow up next week
2025-08-27,Bob Johnson,+1234567892,bob@consulting.com,Consultation,scheduled,Meeting scheduled for tomorrow
2025-08-25,Alice Wilson,+1234567893,alice@marketing.co,Marketing services,called,Initial contact made`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=leads_template.csv"
    );
    res.send(csvTemplate);
  });

  /**
   * DELETE /api/leads/:id
   * Delete a lead
   */
  router.delete(
    "/:id",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Note: You'd implement the delete method in LeadService
        // For now, we'll use a direct query
        const result = await pool.query(
          "DELETE FROM leads WHERE id = $1 RETURNING *",
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: "Lead not found",
          });
        }

        res.json({
          success: true,
          message: "Lead deleted successfully",
        });
      } catch (error: any) {
        console.error("Delete lead error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to delete lead",
        });
      }
    }
  );

  return router;
};
