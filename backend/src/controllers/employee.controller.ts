import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

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

    const { error } = await supabase
      .from('employees')
      .update({
        face_embedding: embedding,
        face_registered_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;

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

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, face_embedding')
      .eq('user_id', userId)
      .single();

    if (empError || !employee || !employee.face_embedding) {
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
    const confidence = 1 - distance;

    // Check if attendance already exists for today
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single();

    if (existing) {
      // Update with check_out
      const { error: updateError } = await supabase
        .from('attendance')
        .update({
          check_out_at: new Date().toISOString(),
          face_confidence: confidence,
          location: location || null,
          device_fingerprint: deviceFingerprint || null,
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Insert new attendance
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          tenant_id: tenantId,
          employee_id: employee.id,
          date: today,
          check_in_at: new Date().toISOString(),
          face_confidence: confidence,
          location: location || null,
          device_fingerprint: deviceFingerprint || null,
        });

      if (insertError) throw insertError;
    }

    // Emit websocket event
    const io = req.app.get('io');
    if (io) {
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      const fullName = userData?.full_name || 'An employee';
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

    // Get employee id first
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!emp) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', emp.id)
      .order('date', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
