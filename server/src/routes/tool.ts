import { Router, Request, Response } from "express";

export const toolRouter = Router();

// Proxy image conversion to Python processor service
toolRouter.post("/convert", async (req: Request, res: Response) => {
  try {
    const processorUrl = process.env.PROCESSOR_URL || "http://localhost:5000";
    const response = await fetch(`${processorUrl}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(response.status).json({ error: err });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("[tool] convert error:", err);
    // Fallback: return a friendly error when processor is not running
    res.status(503).json({ error: "Image processor service is unavailable. Please try again later." });
  }
});
