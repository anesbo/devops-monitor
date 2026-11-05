import { Router, Request, Response } from 'express';
import {
  getAllAlertRules,
  getAlertRuleById,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getIncidents,
  updateIncident,
  getAllNodes
} from '../db';
import { AlertRuleRecord } from '../types';

export const alertsRouter = Router();

/**
 * GET /api/alerts
 * List alert rules and active alert status
 * Supports ?filter=all|active|resolved
 */
alertsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as string) || 'all';
    const rules = await getAllAlertRules();
    const nodes = await getAllNodes();
    const nodeMap = new Map(nodes.map((n) => [n.id, n.name]));

    // Check if client expects alert items or rules
    // Generate unified response that includes both rich AlertItem format and rules
    const incidents = await getIncidents();

    const alertItems = incidents.map((inc) => {
      const nodeName = nodeMap.get(inc.node_id) || inc.node_id;
      return {
        id: inc.id,
        nodeId: inc.node_id,
        nodeName,
        alertRuleId: inc.alert_rule_id,
        severity: inc.severity,
        title: inc.title,
        description: inc.description,
        timestamp: new Date(inc.timestamp).toISOString(),
        acknowledged: inc.status === 'investigating' || inc.status === 'resolved',
        resolved: inc.status === 'resolved',
        status: inc.status,
        metricType: inc.title.toLowerCase().includes('cpu')
          ? 'cpu'
          : inc.title.toLowerCase().includes('ram') || inc.title.toLowerCase().includes('buffer')
          ? 'memory'
          : inc.title.toLowerCase().includes('container')
          ? 'container_health'
          : 'network',
        currentValue: 'Violated',
        threshold: 'SLA Limit'
      };
    });

    let filteredAlerts = alertItems;
    if (filter === 'active') {
      filteredAlerts = alertItems.filter((a) => !a.resolved);
    } else if (filter === 'resolved') {
      filteredAlerts = alertItems.filter((a) => a.resolved);
    }

    // Attach rules metadata in header or property
    if (req.query.format === 'rules') {
      res.json(rules);
      return;
    }

    // If client asked for array, return filtered alerts
    res.json(filteredAlerts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
  }
});

/**
 * GET /api/alerts/rules
 * List raw alert rules
 */
alertsRouter.get('/rules', async (_req: Request, res: Response) => {
  try {
    const rules = await getAllAlertRules();
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch alert rules', details: err.message });
  }
});

/**
 * POST /api/alerts
 * Create a new alert rule
 */
alertsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id = `rule-${Date.now().toString(36)}`,
      node_id = null,
      nodeId = null,
      metric_name,
      metricName,
      operator = '>=',
      threshold,
      severity = 'warning',
      is_active = 1,
      isActive = true
    } = req.body;

    const finalMetric = metric_name || metricName;
    const finalNodeId = node_id !== undefined ? node_id : nodeId;
    const finalActive = is_active !== undefined ? (is_active ? 1 : 0) : isActive ? 1 : 0;

    if (!finalMetric || threshold === undefined) {
      res.status(400).json({ error: 'metric_name and threshold are required' });
      return;
    }

    const newRule: AlertRuleRecord = {
      id,
      node_id: finalNodeId || null,
      metric_name: finalMetric,
      operator,
      threshold: Number(threshold),
      severity,
      is_active: finalActive,
      created_at: Date.now()
    };

    const created = await createAlertRule(newRule);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create alert rule', details: err.message });
  }
});

/**
 * PUT /api/alerts/:id
 * Update an existing alert rule
 */
alertsRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const updated = await updateAlertRule(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Alert rule not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update alert rule', details: err.message });
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete an alert rule
 */
alertsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const success = await deleteAlertRule(id);
    if (!success) {
      res.status(404).json({ error: 'Alert rule not found' });
      return;
    }
    res.json({ success: true, message: `Alert rule ${id} deleted` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete alert rule', details: err.message });
  }
});

/**
 * POST /api/alerts/:id/ack
 * Acknowledge an alert / incident
 */
alertsRouter.post('/:id/ack', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const updated = await updateIncident(id, { status: 'investigating' });
    if (!updated) {
      res.json({ success: true, message: `Alert ${id} acknowledged` });
      return;
    }
    res.json({ success: true, incident: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to acknowledge alert', details: err.message });
  }
});

/**
 * POST /api/alerts/:id/resolve
 * Resolve an alert / incident
 */
alertsRouter.post('/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const updated = await updateIncident(id, { status: 'resolved', resolved_at: Date.now() });
    if (!updated) {
      res.json({ success: true, message: `Alert ${id} resolved` });
      return;
    }
    res.json({ success: true, incident: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve alert', details: err.message });
  }
});
