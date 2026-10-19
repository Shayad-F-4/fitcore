import { Router, Response } from 'express';
import { GymSettings } from '../models/GymSettings.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { sendWhatsAppCloudMessage, normalizeIndianPhone } from '../services/whatsappService.js';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();

// GET /api/settings - Fetch gym settings
router.get('/', async (_req, res: Response) => {
  try {
    const settings = await GymSettings.getSettings();
    const settingsObj = settings.toObject();

    // Check if WhatsApp is configured via env or db
    const hasEnvToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
    const hasEnvPhoneId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
    const hasDbToken = Boolean(settingsObj.whatsapp?.accessToken);
    const hasDbPhoneId = Boolean(settingsObj.whatsapp?.phoneNumberId);

    const isWhatsAppConfigured = (hasEnvToken || hasDbToken) && (hasEnvPhoneId || hasDbPhoneId);

    // Mask sensitive access token before sending to frontend
    if (settingsObj.whatsapp?.accessToken) {
      const token = settingsObj.whatsapp.accessToken;
      settingsObj.whatsapp.accessToken = token.length > 8
        ? `${token.slice(0, 4)}••••••••${token.slice(-4)}`
        : '••••••••';
    }

    sendSuccess(res, 'Settings fetched successfully', {
      ...settingsObj,
      whatsappStatus: {
        isConfigured: isWhatsAppConfigured,
        source: hasEnvToken ? 'ENVIRONMENT_VARIABLES' : hasDbToken ? 'DATABASE_SETTINGS' : 'NONE',
        autoReminder2DaysEnabled: settingsObj.whatsapp?.autoReminder2DaysEnabled ?? true,
      },
    });
  } catch (error: any) {
    console.error('[Get Settings Error]', error);
    sendError(res, error.message || 'Failed to fetch settings', 500);
  }
});

// PUT /api/settings - Update gym settings (Restricted to Admins)
router.put('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'GYM_ADMIN') {
      return sendError(res, 'Unauthorized: Only gym administrators can update business settings', 403);
    }

    const {
      gymName,
      tagline,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      logoUrl,
      gstin,
      isTaxEnabled,
      taxRatePercent,
      currency,
      currencySymbol,
      timezone,
      whatsapp,
    } = req.body;

    const settings = await GymSettings.getSettings();

    if (gymName !== undefined) settings.gymName = gymName.trim();
    if (tagline !== undefined) settings.tagline = tagline.trim();
    if (address !== undefined) settings.address = address.trim();
    if (city !== undefined) settings.city = city.trim();
    if (state !== undefined) settings.state = state.trim();
    if (pincode !== undefined) settings.pincode = pincode.trim();
    if (phone !== undefined) settings.phone = phone.trim();
    if (email !== undefined) settings.email = email.trim();
    if (logoUrl !== undefined) settings.logoUrl = logoUrl.trim();
    if (gstin !== undefined) settings.gstin = gstin.trim().toUpperCase();
    if (isTaxEnabled !== undefined) settings.isTaxEnabled = Boolean(isTaxEnabled);
    if (taxRatePercent !== undefined) settings.taxRatePercent = Number(taxRatePercent);
    if (currency !== undefined) settings.currency = currency;
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;
    if (timezone !== undefined) settings.timezone = timezone;

    if (whatsapp) {
      if (!settings.whatsapp) {
        settings.whatsapp = {
          enabled: false,
          autoReminder2DaysEnabled: true,
          templateName: 'membership_expiry_reminder',
          autoSendHour: 9,
        };
      }

      if (whatsapp.enabled !== undefined) settings.whatsapp.enabled = Boolean(whatsapp.enabled);
      if (whatsapp.autoReminder2DaysEnabled !== undefined) {
        settings.whatsapp.autoReminder2DaysEnabled = Boolean(whatsapp.autoReminder2DaysEnabled);
      }
      if (whatsapp.phoneNumberId !== undefined) settings.whatsapp.phoneNumberId = whatsapp.phoneNumberId.trim();
      // Only update token if it doesn't contain mask characters
      if (whatsapp.accessToken !== undefined && !whatsapp.accessToken.includes('••••')) {
        settings.whatsapp.accessToken = whatsapp.accessToken.trim();
      }
      if (whatsapp.templateName !== undefined) settings.whatsapp.templateName = whatsapp.templateName.trim();
      if (whatsapp.businessAccountId !== undefined) settings.whatsapp.businessAccountId = whatsapp.businessAccountId.trim();
      if (whatsapp.autoSendHour !== undefined) settings.whatsapp.autoSendHour = Number(whatsapp.autoSendHour);
    }

    await settings.save();

    // Audit log update
    await AuditLog.create({
      action: 'UPDATE',
      entity: 'SETTINGS',
      user: user.userId,
      details: {
        gymName: settings.gymName,
        phone: settings.phone,
        gstin: settings.gstin,
        isTaxEnabled: settings.isTaxEnabled,
        autoReminder2DaysEnabled: settings.whatsapp?.autoReminder2DaysEnabled,
      },
    });

    sendSuccess(res, 'Settings updated successfully', settings);
  } catch (error: any) {
    console.error('[Update Settings Error]', error);
    sendError(res, error.message || 'Failed to update settings', 500);
  }
});

// POST /api/settings/test-whatsapp - Validate WhatsApp Cloud API connection
router.post('/test-whatsapp', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testPhone } = req.body;
    if (!testPhone) {
      return sendError(res, 'Please provide a test mobile number', 400);
    }

    const phoneValidation = normalizeIndianPhone(testPhone);
    if (!phoneValidation.valid) {
      return sendError(res, phoneValidation.error || 'Invalid Indian phone number', 400);
    }

    const settings = await GymSettings.getSettings();
    const result = await sendWhatsAppCloudMessage({
      toPhone: phoneValidation.formatted,
      memberName: 'Test Member',
      gymName: settings.gymName || 'FitCore Fitness',
      expiryDateFormatted: '25/10/2026',
    });

    sendSuccess(res, 'WhatsApp test executed', result);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to test WhatsApp connection', 500);
  }
});

export default router;
