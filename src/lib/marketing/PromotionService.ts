import { prisma } from '@/lib/prisma';
import { CacheService } from '../cache/CacheService';
import { NotificationService } from '../notifications/NotificationService';
import { EmailService } from '../email/EmailService';

interface CouponData {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  startDate?: Date;
  endDate?: Date;
  usageLimit?: number;
  categoryIds?: string[];
  productIds?: string[];
}

interface ReferralConfig {
  referrerReward: number;
  refereeDiscount: number;
  maxReferrals?: number;
}

interface LoyaltyConfig {
  pointsPerPurchase: number;
  minimumPoints: number;
  pointValue: number;
  expirationMonths: number;
}

export class PromotionService {
  // Coupon Management
  static async createCoupon(data: CouponData) {
    try {
      const coupon = await prisma.coupon.create({
        data: {
          ...data,
          active: true,
          usageCount: 0
        }
      });

      // Clear cache
      await CacheService.delete(`coupon:${data.code}`, 'promotions');

      return coupon;
    } catch (error) {
      console.error('Create coupon error:', error);
      throw new Error('Failed to create coupon');
    }
  }

  static async validateCoupon(
    code: string,
    userId: string,
    cartTotal: number,
    items: Array<{ productId: string; categoryId: string }>
  ) {
    const coupon = await CacheService.getOrSet(
      `coupon:${code}`,
      async () => prisma.coupon.findUnique({
        where: { code }
      }),
      { namespace: 'promotions', ttl: 3600 }
    );

    if (!coupon || !coupon.active) {
      throw new Error('Invalid coupon code');
    }

    if (coupon.startDate && coupon.startDate > new Date()) {
      throw new Error('Coupon not yet active');
    }

    if (coupon.endDate && coupon.endDate < new Date()) {
      throw new Error('Coupon has expired');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit reached');
    }

    if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
      throw new Error(`Minimum purchase amount of ${coupon.minPurchase} required`);
    }

    // Check product/category restrictions
    if (coupon.productIds?.length || coupon.categoryIds?.length) {
      const validItems = items.some(item => 
        coupon.productIds?.includes(item.productId) ||
        coupon.categoryIds?.includes(item.categoryId)
      );

      if (!validItems) {
        throw new Error('Coupon not valid for these items');
      }
    }

    // Calculate discount
    let discount = coupon.type === 'PERCENTAGE'
      ? cartTotal * (coupon.value / 100)
      : coupon.value;

    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }

    return { discount, coupon };
  }

  // Loyalty Program
  static async processLoyaltyPoints(
    userId: string,
    orderTotal: number,
    config: LoyaltyConfig
  ) {
    const pointsEarned = Math.floor(orderTotal * config.pointsPerPurchase);

    await prisma.loyaltyPoints.create({
      data: {
        userId,
        points: pointsEarned,
        expiresAt: new Date(Date.now() + config.expirationMonths * 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Notify user
    await NotificationService.createNotification({
      userId,
      type: 'LOYALTY_POINTS',
      title: 'Points Earned!',
      message: `You earned ${pointsEarned} points from your purchase!`
    });

    return pointsEarned;
  }

  static async getLoyaltyBalance(userId: string) {
    const points = await prisma.loyaltyPoints.aggregate({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      _sum: { points: true }
    });

    return points._sum.points || 0;
  }

  static async redeemLoyaltyPoints(
    userId: string,
    pointsToRedeem: number,
    config: LoyaltyConfig
  ) {
    if (pointsToRedeem < config.minimumPoints) {
      throw new Error(`Minimum ${config.minimumPoints} points required for redemption`);
    }

    const balance = await this.getLoyaltyBalance(userId);
    if (balance < pointsToRedeem) {
      throw new Error('Insufficient points balance');
    }

    const redemptionValue = (pointsToRedeem / config.pointsPerPurchase) * config.pointValue;

    await prisma.loyaltyRedemption.create({
      data: {
        userId,
        points: pointsToRedeem,
        value: redemptionValue
      }
    });

    // Deduct points (FIFO)
    const pointsToDeduct = pointsToRedeem;
    const pointsRecords = await prisma.loyaltyPoints.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { expiresAt: 'asc' }
    });

    let remainingPoints = pointsToDeduct;
    for (const record of pointsRecords) {
      if (remainingPoints <= 0) break;

      const deduction = Math.min(remainingPoints, record.points);
      await prisma.loyaltyPoints.update({
        where: { id: record.id },
        data: { points: record.points - deduction }
      });
      remainingPoints -= deduction;
    }

    return redemptionValue;
  }

  // Referral Program
  static async createReferralCode(userId: string) {
    const code = `REF${userId.substring(0, 6)}${Math.random().toString(36).substring(2, 8)}`;
    
    await prisma.referralCode.create({
      data: {
        userId,
        code,
        active: true
      }
    });

    return code;
  }

  static async processReferral(
    referralCode: string,
    newUserId: string,
    config: ReferralConfig
  ) {
    const referral = await prisma.referralCode.findUnique({
      where: { code: referralCode },
      include: { user: true }
    });

    if (!referral || !referral.active) {
      throw new Error('Invalid referral code');
    }

    // Check referral limit
    if (config.maxReferrals) {
      const referralCount = await prisma.referral.count({
        where: { referrerId: referral.userId }
      });

      if (referralCount >= config.maxReferrals) {
        throw new Error('Referral limit reached');
      }
    }

    // Create referral record
    await prisma.referral.create({
      data: {
        referrerId: referral.userId,
        refereeId: newUserId,
        status: 'PENDING'
      }
    });

    // Notify referrer
    await NotificationService.createNotification({
      userId: referral.userId,
      type: 'REFERRAL',
      title: 'New Referral!',
      message: 'Someone joined using your referral code!'
    });

    return {
      referrerReward: config.referrerReward,
      refereeDiscount: config.refereeDiscount
    };
  }

  // Campaign Management
  static async createEmailCampaign(data: {
    name: string;
    subject: string;
    template: string;
    targetAudience: object;
    scheduledDate?: Date;
  }) {
    const campaign = await prisma.emailCampaign.create({
      data: {
        ...data,
        status: 'SCHEDULED'
      }
    });

    if (!data.scheduledDate || data.scheduledDate <= new Date()) {
      await this.sendEmailCampaign(campaign.id);
    }

    return campaign;
  }

  static async sendEmailCampaign(campaignId: string) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get target audience
    const users = await prisma.user.findMany({
      where: campaign.targetAudience as any
    });

    // Send emails in batches
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(
        batch.map(user =>
          EmailService.sendEmail({
            to: user.email,
            subject: campaign.subject,
            template: campaign.template,
            data: { user }
          })
        )
      );
    }

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    });
  }

  // Analytics
  static async getPromotionStats(startDate: Date, endDate: Date) {
    const [coupons, loyalty, referrals] = await Promise.all([
      // Coupon usage stats
      prisma.coupon.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        include: {
          _count: {
            select: { usages: true }
          }
        }
      }),

      // Loyalty program stats
      prisma.loyaltyPoints.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: {
          points: true
        },
        _count: true
      }),

      // Referral stats
      prisma.referral.groupBy({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        by: ['status'],
        _count: true
      })
    ]);

    return {
      coupons: {
        total: coupons.length,
        usage: coupons.reduce((sum, coupon) => sum + coupon._count.usages, 0)
      },
      loyalty: {
        pointsIssued: loyalty._sum.points || 0,
        transactions: loyalty._count
      },
      referrals: {
        total: referrals.reduce((sum, group) => sum + group._count, 0),
        byStatus: Object.fromEntries(
          referrals.map(group => [group.status, group._count])
        )
      }
    };
  }
}