import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

// ─── Math helpers ─────────────────────────────────────────────────────────────

function euclideanDistance(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) sum += (v1[i] - v2[i]) ** 2;
  return Math.sqrt(sum);
}

function averageEmbeddings(samples: number[][]): number[] {
  if (!samples?.length) return [];
  const len = samples[0].length;
  const avg = new Array(len).fill(0);
  for (const s of samples) for (let i = 0; i < len; i++) avg[i] += s[i];
  return avg.map(v => v / samples.length);
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Core verification — all four conditions must pass ────────────────────────
//
//  1. Averaged scan embedding  vs stored  <  0.45  (primary check)
//  2. Median of sample distances          <  0.50  (consistency across frames)
//  3. At least 80 % of samples            <  0.50  (no lucky-frame attack)
//  4. Internal scan consistency (pairwise) < 0.55  (proves stable capture)
//
// Taking the MEDIAN (not minimum) prevents a single outlier frame from
// faking a match, while the internal-consistency gate blocks photo splicing.

interface VerifyResult {
  pass:       boolean;
  confidence: number;     // 0–1
  reason?:    string;     // human-readable rejection reason
  metrics?:   object;     // debug info for white-box testers
}

function verifyFaceMatch(
  scanEmbedding: number[],
  scanSamples:   number[][],
  stored:        number[],
): VerifyResult {

  const THRESHOLD_AVG      = 0.45;   // averaged embedding must be closer than this
  const THRESHOLD_MEDIAN   = 0.50;   // median of all sample distances
  const THRESHOLD_SAMPLE   = 0.50;   // per-sample pass/fail line
  const MIN_PASS_RATIO     = 0.80;   // ≥80 % of samples must pass
  const MAX_INTERNAL_DIST  = 0.55;   // max pairwise distance within scan samples

  // 1 — Average embedding distance
  const avgDist = euclideanDistance(stored, scanEmbedding);

  // 2 — Per-sample distances
  const allSamples = scanSamples?.length > 0 ? scanSamples : [scanEmbedding];
  const sampleDists = allSamples.map(s => euclideanDistance(stored, s));
  const medDist = median(sampleDists);

  // 3 — Pass ratio
  const passingCount = sampleDists.filter(d => d < THRESHOLD_SAMPLE).length;
  const passRatio = passingCount / sampleDists.length;

  // 4 — Internal consistency (pairwise max)
  let maxInternalDist = 0;
  for (let i = 0; i < allSamples.length; i++) {
    for (let j = i + 1; j < allSamples.length; j++) {
      const d = euclideanDistance(allSamples[i], allSamples[j]);
      if (d > maxInternalDist) maxInternalDist = d;
    }
  }

  const metrics = {
    avgDist:         +avgDist.toFixed(4),
    medianDist:      +medDist.toFixed(4),
    passRatio:       +passRatio.toFixed(2),
    maxInternalDist: +maxInternalDist.toFixed(4),
    sampleCount:     allSamples.length,
  };

  // Evaluate each gate
  if (avgDist >= THRESHOLD_AVG) {
    return { pass: false, confidence: +(1 - avgDist).toFixed(4), reason: 'Face does not match registered profile.', metrics };
  }
  if (medDist >= THRESHOLD_MEDIAN) {
    return { pass: false, confidence: +(1 - medDist).toFixed(4), reason: 'Face scan inconsistency — median distance too high.', metrics };
  }
  if (passRatio < MIN_PASS_RATIO) {
    return {
      pass: false,
      confidence: +(1 - medDist).toFixed(4),
      reason: `Too many frames rejected (${Math.round(passRatio * 100)}% passed, need ≥80%).`,
      metrics,
    };
  }
  if (maxInternalDist > MAX_INTERNAL_DIST) {
    return {
      pass: false,
      confidence: 0,
      reason: 'Unstable scan — frames were inconsistent. Please hold still and try again.',
      metrics,
    };
  }

  return {
    pass:       true,
    confidence: +(1 - medDist).toFixed(4),
    metrics,
  };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const registerFace = async (req: Request, res: Response) => {
  try {
    const { embedding, allSamples } = req.body;
    const userId = req.user!.id;

    // Validate: must be a 128-float array
    if (!Array.isArray(embedding) || embedding.length !== 128 ||
        !embedding.every(n => typeof n === 'number' && isFinite(n))) {
      return res.status(400).json({ error: 'Invalid embedding — expected 128 finite floats.' });
    }

    // Compute final stored embedding from samples if available (more stable)
    let finalEmbedding: number[] = embedding;
    if (Array.isArray(allSamples) && allSamples.length >= 3) {
      // Validate samples
      const validSamples = allSamples.filter(
        s => Array.isArray(s) && s.length === 128 && s.every(n => typeof n === 'number' && isFinite(n))
      );
      if (validSamples.length >= 3) {
        finalEmbedding = averageEmbeddings(validSamples);
      }
    }

    const { error } = await supabase
      .from('employees')
      .update({ face_embedding: finalEmbedding, face_registered_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    res.json({
      message: 'Face registered successfully.',
      samplesUsed: allSamples?.length ?? 1,
    });
  } catch (err) {
    console.error('[registerFace]', err);
    res.status(500).json({ error: 'Failed to register face. Please try again.' });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { embedding, allSamples, location, deviceFingerprint } = req.body;
    const userId   = req.user!.id;
    const tenantId = req.user!.tenant_id;

    // ── Input validation ────────────────────────────────────────────────────
    if (!Array.isArray(embedding) || embedding.length !== 128 ||
        !embedding.every(n => typeof n === 'number' && isFinite(n))) {
      return res.status(400).json({ error: 'Invalid scan data submitted.' });
    }

    // ── Load employee + stored face ─────────────────────────────────────────
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('id, face_embedding, is_active')
      .eq('user_id', userId)
      .single();

    if (empErr || !employee) {
      return res.status(404).json({ error: 'Employee record not found.' });
    }
    if (!employee.is_active) {
      return res.status(403).json({ error: 'Your account is deactivated. Contact your administrator.' });
    }
    if (!employee.face_embedding) {
      return res.status(400).json({ error: 'Face not registered yet. Please register your face first.' });
    }

    const stored: number[] = employee.face_embedding as number[];

    // ── Verify — all four gates must pass ───────────────────────────────────
    const validSamples = Array.isArray(allSamples)
      ? allSamples.filter(s => Array.isArray(s) && s.length === 128)
      : [];

    const result = verifyFaceMatch(embedding, validSamples, stored);

    if (!result.pass) {
      console.warn(`[checkIn] REJECTED user=${userId} metrics=${JSON.stringify(result.metrics)}`);
      return res.status(401).json({
        error: result.reason || 'Face verification failed.',
        hint: 'Ensure good lighting, look straight at the camera, and try again.',
        metrics: result.metrics,   // exposed so testers can inspect thresholds
      });
    }

    // ── Record attendance ───────────────────────────────────────────────────
    const now   = new Date();
    const today = now.toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('attendance')
      .select('id, check_in_at')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .maybeSingle();

    const isCheckOut = !!existing;

    if (isCheckOut) {
      const { error: upErr } = await supabase
        .from('attendance')
        .update({
          check_out_at:       now.toISOString(),
          face_confidence:    result.confidence,
          location:           location ?? null,
          device_fingerprint: deviceFingerprint ?? null,
        })
        .eq('id', existing!.id);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabase
        .from('attendance')
        .insert({
          tenant_id:          tenantId,
          employee_id:        employee.id,
          date:               today,
          check_in_at:        now.toISOString(),
          face_confidence:    result.confidence,
          location:           location ?? null,
          device_fingerprint: deviceFingerprint ?? null,
        });
      if (insErr) throw insErr;
    }

    // ── Broadcast to admin live feed ────────────────────────────────────────
    const io = req.app.get('io');
    if (io) {
      const { data: usr } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      io.to(`tenant_${tenantId}`).emit('attendance_marked', {
        employeeId:        employee.id,
        fullName:          usr?.full_name ?? 'Unknown Employee',
        isCheckOut,
        date:              today,
        timestamp:         now.toISOString(),
        confidence:        result.confidence,
        location:          location ?? null,
        deviceFingerprint: deviceFingerprint ?? null,
      });
    }

    console.log(`[checkIn] OK user=${userId} isCheckOut=${isCheckOut} confidence=${result.confidence} metrics=${JSON.stringify(result.metrics)}`);

    res.json({
      message:    isCheckOut ? 'Check-out recorded successfully.' : 'Check-in recorded successfully.',
      isCheckOut,
      confidence: result.confidence,
      metrics:    result.metrics,   // available for testers
    });

  } catch (err) {
    console.error('[checkIn]', err);
    res.status(500).json({ error: 'Failed to record attendance. Please try again.' });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!emp) return res.json([]);

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', emp.id)
      .order('date', { ascending: false })
      .limit(60);

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error('[getHistory]', err);
    res.status(500).json({ error: 'Failed to fetch attendance history.' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: emp, error } = await supabase
      .from('employees')
      .select('*, users(full_name, email)')
      .eq('user_id', userId)
      .single();

    if (error || !emp) return res.status(404).json({ error: 'Profile not found.' });

    res.json({
      id:                  emp.id,
      full_name:           (emp as any).users?.full_name ?? '',
      email:               (emp as any).users?.email ?? '',
      employee_code:       emp.employee_code ?? '',
      login_code:          emp.login_code ?? '',
      department:          emp.department ?? '',
      position:            emp.position ?? '',
      face_registered_at:  emp.face_registered_at ?? null,
      avatar_url:          emp.avatar_url ?? null,
      is_active:           emp.is_active ?? true,
    });
  } catch (err) {
    console.error('[getProfile]', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};
