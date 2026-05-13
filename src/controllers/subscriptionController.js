import SubscriptionService from "../services/subscriptionService.js";

/**
 * Controlador para las operaciones de suscripciones
 */
export class SubscriptionController {
  /**
   * GET /api/subscriptions
   */
  static async getSubscriptions(req, res, next) {
    try {
      const subscriptions = await SubscriptionService.getAllSubscriptions();
      return res.json({ subscriptions: subscriptions.map((row) => ({ ...row })) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/subscriptions
   */
  static async createSubscription(req, res, next) {
    try {
      await SubscriptionService.createSubscription(req.validatedBody);
      return res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/subscriptions/:id
   */
  static async updateSubscription(req, res, next) {
    try {
      const { id } = req.validatedParams;
      await SubscriptionService.updateSubscription(id, req.validatedBody);
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/subscriptions/:id/toggle
   */
  static async toggleSubscriptionStatus(req, res, next) {
    try {
      const { id } = req.validatedParams;
      const result = await SubscriptionService.toggleSubscriptionStatus(id);
      return res.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/subscriptions/:id
   */
  static async deleteSubscription(req, res, next) {
    try {
      const { id } = req.validatedParams;
      await SubscriptionService.deleteSubscription(id);
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
}

export default SubscriptionController;
