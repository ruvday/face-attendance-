import { Request, Response } from 'express';
import { pool } from '../db';

// Simple euclidean distance between two embedding vectors
function euclideanDistance(v1: number[], v2: number[]) {
  if (!v1 || !v2 || v1.length !== v2.length) {
    return 1.0; // Return maximum distance if mismatch
  }
  return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0));
}

export const registerFace = async (req: Request, res: Response) => {
  try {
    const { embedding } = req.body;
    const userId = req.user!.id;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'Invalid face embedding' });
    }

    await pool.query(`
      UPDATE employees 
      SET face_embedding = $1::jsonb, face_registered_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [JSON.stringify(embedding), userId]);

    res.json({ message: 'Face registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register face' });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { embedding, location, deviceFingerprint } = req.body;
    const userId = req.user!.id;
    const tenantId = req.user!.tenant_id;

    const empResult = await pool.query('SELECT id, face_embedding FROM employees WHERE user_id = $1', [userId]);
    const employee = empResult.rows[0];

    if (!employee || !employee.face_embedding) {
      return res.status(400).json({ error: 'Face not registered' });
    }

    const storedEmbedding = employee.face_embedding as number[];
    const currentEmbedding = embedding as number[];

    const distance = euclideanDistance(storedEmbedding, currentEmbedding);
    // 0.6 is a common threshold for face-api.js euclidean distance
    if (distance > 0.6) {
      return res.status(400).json({ error: 'Face matching failed', distance });
    }

    // Record attendance
    const today = new Date().toISOString().split('T')[0];
    
    // UPSERT basically
    await pool.query(`
      INSERT INTO attendance (tenant_id, employee_id, date, check_in_at, face_confidence, location, device_fingerprint)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET 
        check_out_at = CURRENT_TIMESTAMP, 
        face_confidence = $4,
        location = $5,
        device_fingerprint = $6
    `, [tenantId, employee.id, today, 1 - distance, location ? JSON.stringify(location) : null, deviceFingerprint]);

    // Emit websocket event
    const io = req.app.get('io');
    if (io) {
      // Get user full name for notification
      const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
      const fullName = userRes.rows[0]?.full_name || 'An employee';
      io.to(`tenant_${tenantId}`).emit('attendance_marked', {
        employeeId: employee.id,
        fullName,
        date: today,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ message: 'Attendance recorded successfully', distance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const result = await pool.query(`
      SELECT a.* 
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE e.user_id = $1
      ORDER BY a.date DESC
      LIMIT 30
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
