import { Router, Request, Response } from 'express';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  getNodeById,
  getAllNodes
} from '../db';
import { IncidentRecord } from '../types';

export const incidentsRouter = Router();

// Formats incident record with node details for frontend
async function formatIncident(inc: IncidentRecord, nodeNameMap?: Map<string, string>) {
  let nodeName = nodeNameMap ? nodeNameMap.get(inc.node_id) : undefined;
  if (!nodeName) {
    const node = await getNodeById(inc.node_id);
    nodeName = node ? node.name : inc.node_id;
  }

  return {
    ...inc,
    nodeId: inc.node_id,
    nodeName,
    alertRuleId: inc.alert_rule_id,
    resolvedAt: inc.resolved_at ? new Date(inc.resolved_at).toISOString() : null,
    isoTimestamp: new Date(inc.timestamp).toISOString()
  };
}

/**
 * GET /api/incidents
 * List incidents with filters: ?severity=&status=&search=&nodeId=
 */
incidentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { severity, status, search, nodeId } = req.query as {
      severity?: string;
      status?: string;
      search?: string;
      nodeId?: string;
    };

    const incidents = await getIncidents({ severity, status, search, nodeId });
    const nodes = await getAllNodes();
    const nodeNameMap = new Map(nodes.map((n) => [n.id, n.name]));

    const formatted = await Promise.all(
      incidents.map((inc) => formatIncident(inc, nodeNameMap))
    );

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch incidents', details: err.message });
  }
});

/**
 * GET /api/incidents/:id
 * Single incident details
 */
incidentsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const inc = await getIncidentById(req.params.id as string);
    if (!inc) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    res.json(await formatIncident(inc));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch incident', details: err.message });
  }
});

/**
 * POST /api/incidents
 * Create a manual or simulated incident
 */
incidentsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id = `inc-man-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      node_id,
      nodeId,
      alert_rule_id,
      alertRuleId,
      title,
      description,
      severity = 'warning',
      status = 'open'
    } = req.body;

    const finalNodeId = node_id || nodeId;
    if (!finalNodeId || !title || !description) {
      res.status(400).json({
        error: 'node_id, title, and description are required fields'
      });
      return;
    }

    const newIncident: IncidentRecord = {
      id,
      node_id: finalNodeId,
      alert_rule_id: alert_rule_id || alertRuleId || null,
      title,
      description,
      severity,
      status,
      timestamp: Date.now(),
      resolved_at: status === 'resolved' ? Date.now() : null
    };

    const created = await createIncident(newIncident);
    res.status(201).json(await formatIncident(created));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create incident', details: err.message });
  }
});

/**
 * PATCH /api/incidents/:id
 * Update status (e.g. 'resolved', 'investigating', 'open') or other fields
 */
incidentsRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, resolved_at, resolvedAt, title, description, severity } = req.body;

    const updates: Partial<IncidentRecord> = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (severity !== undefined) updates.severity = severity;
    if (resolved_at !== undefined) updates.resolved_at = resolved_at;
    else if (resolvedAt !== undefined) updates.resolved_at = typeof resolvedAt === 'string' ? new Date(resolvedAt).getTime() : resolvedAt;

    const updated = await updateIncident(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.json(await formatIncident(updated));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update incident', details: err.message });
  }
});
