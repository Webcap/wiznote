# Plan Price Update Feature - Implementation Plan

## Overview

This document outlines the implementation plan for a feature that allows updating existing subscriber pricing when plan prices are changed in the admin interface. Currently, when a plan price is updated and synced to Stripe, existing subscribers continue to pay the old price while new subscribers pay the new price.

## Current Behavior

### What Happens Now
1. Admin changes plan price in the interface
2. Price is synced to Stripe via `sync-plan.js`
3. New Stripe price object is created with updated amount
4. Old price object is deactivated (`active: false`)
5. Database is updated to reference new price ID
6. **Existing subscribers continue paying old price**
7. **New subscribers pay new price**

### Why This Happens
- Stripe prices are immutable - you cannot change the amount of an existing price
- Existing subscriptions maintain their original pricing to prevent unexpected charges
- This is Stripe's intended behavior for customer protection

## Proposed Feature: Update Existing Subscribers

### Feature Description
Add functionality to optionally update existing subscribers to the new price when a plan price is changed, with proper customer notification and billing handling.

### User Stories

#### Admin User Stories
- **As an admin**, I want to see how many existing subscribers will be affected when I change a plan price
- **As an admin**, I want to choose whether to update existing subscribers to the new price
- **As an admin**, I want to set a future date for when the price change should take effect
- **As an admin**, I want to see a preview of the billing impact (proration amounts)
- **As an admin**, I want to send notification emails to affected customers before making changes

#### Customer User Stories
- **As a customer**, I want to be notified in advance when my subscription price will change
- **As a customer**, I want to understand how the price change affects my billing
- **As a customer**, I want the option to cancel my subscription if I don't agree with the price change

## Technical Implementation Plan

### Phase 1: Data Collection & Analysis

#### 1.1 Add Subscription Tracking
- **File**: `services/SubscriptionTrackingService.ts` (new)
- **Purpose**: Track which subscriptions are using which price IDs
- **Features**:
  - Query Stripe for all subscriptions using a specific price ID
  - Store subscription metadata in database for faster queries
  - Track subscription status and customer information

#### 1.2 Price Change Impact Analysis
- **File**: `services/PriceChangeAnalysisService.ts` (new)
- **Purpose**: Analyze the impact of price changes
- **Features**:
  - Calculate number of affected subscribers
  - Calculate proration amounts (credits/charges)
  - Estimate revenue impact
  - Identify high-value customers

### Phase 2: Admin Interface Updates

#### 2.1 Enhanced Plan Form
- **File**: `components/admin/PlanForm.tsx`
- **Updates**:
  - Add "Update Existing Subscribers" toggle
  - Add "Effective Date" picker for future price changes
  - Add "Proration Behavior" selector (create_prorations, none, always_invoice)
  - Add preview section showing impact analysis

#### 2.2 Price Change Preview Modal
- **File**: `components/admin/PriceChangePreviewModal.tsx` (new)
- **Features**:
  - Show affected subscriber count
  - Display proration calculations
  - Show revenue impact
  - List of affected customers (with pagination)
  - Confirmation step before execution

#### 2.3 Enhanced Plans List
- **File**: `app/admin/enhanced-plans.tsx`
- **Updates**:
  - Add "Update Subscribers" button for plans with existing subscribers
  - Show subscriber count for each plan
  - Add status indicators for pending price changes

### Phase 3: Backend Services

#### 3.1 Stripe Guardian Service Updates
- **File**: `C:\Users\cnieves\Desktop\Projects\stripe-guardian\api\stripe\update-subscriber-prices.js` (new)
- **Purpose**: Handle bulk subscription price updates
- **Features**:
  - Update multiple subscriptions to new price
  - Handle proration logic
  - Process updates in batches to avoid rate limits
  - Log all changes for audit trail

#### 3.2 Notification Service
- **File**: `services/PriceChangeNotificationService.ts` (new)
- **Purpose**: Send notifications to affected customers
- **Features**:
  - Email templates for price change notifications
  - SMS notifications (optional)
  - In-app notifications
  - Notification scheduling

#### 3.3 Audit Trail Service
- **File**: `services/PriceChangeAuditService.ts` (new)
- **Purpose**: Track all price change operations
- **Features**:
  - Log price change requests
  - Track execution status
  - Store customer responses
  - Generate compliance reports

### Phase 4: Database Schema Updates

#### 4.1 New Tables
```sql
-- Track price change operations
CREATE TABLE price_change_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT NOT NULL REFERENCES premium_plans(id),
    old_price_id TEXT NOT NULL,
    new_price_id TEXT NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE,
    proration_behavior TEXT NOT NULL DEFAULT 'create_prorations',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, executing, completed, failed, cancelled
    affected_subscriber_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Track individual subscription updates
CREATE TABLE subscription_price_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL REFERENCES price_change_operations(id),
    subscription_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    old_price_id TEXT NOT NULL,
    new_price_id TEXT NOT NULL,
    proration_amount INTEGER, -- in cents
    status TEXT NOT NULL DEFAULT 'pending', -- pending, updated, failed, cancelled
    error_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track customer notifications
CREATE TABLE price_change_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL REFERENCES price_change_operations(id),
    customer_id TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- email, sms, in_app
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);
```

#### 4.2 Indexes
```sql
CREATE INDEX idx_price_change_operations_plan_id ON price_change_operations(plan_id);
CREATE INDEX idx_price_change_operations_status ON price_change_operations(status);
CREATE INDEX idx_subscription_price_updates_operation_id ON subscription_price_updates(operation_id);
CREATE INDEX idx_subscription_price_updates_subscription_id ON subscription_price_updates(subscription_id);
CREATE INDEX idx_price_change_notifications_operation_id ON price_change_notifications(operation_id);
```

### Phase 5: API Endpoints

#### 5.1 Analysis Endpoints
- `GET /api/plans/:id/price-change-impact` - Get impact analysis for price change
- `GET /api/plans/:id/subscribers` - Get list of subscribers for a plan

#### 5.2 Execution Endpoints
- `POST /api/plans/:id/update-subscriber-prices` - Execute price change for existing subscribers
- `GET /api/price-change-operations/:id/status` - Get status of price change operation
- `POST /api/price-change-operations/:id/cancel` - Cancel pending price change operation

#### 5.3 Notification Endpoints
- `POST /api/price-change-operations/:id/send-notifications` - Send notifications to customers
- `GET /api/price-change-operations/:id/notifications` - Get notification status

### Phase 6: Compliance & Legal Considerations

#### 6.1 Customer Consent
- Implement opt-in/opt-out mechanisms
- Provide clear pricing change notices
- Allow customers to cancel before price change takes effect
- Comply with local subscription billing laws

#### 6.2 Data Protection
- Ensure GDPR compliance for EU customers
- Implement data retention policies
- Provide data export capabilities
- Maintain audit trails for compliance

#### 6.3 Billing Compliance
- Follow Stripe's best practices for subscription changes
- Implement proper proration handling
- Provide clear billing statements
- Handle failed payment scenarios

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Create database schema
- [ ] Implement SubscriptionTrackingService
- [ ] Create basic API endpoints

### Week 3-4: Analysis Features
- [ ] Implement PriceChangeAnalysisService
- [ ] Create price change preview modal
- [ ] Add impact analysis to plan form

### Week 5-6: Execution Engine
- [ ] Implement Stripe Guardian service updates
- [ ] Create bulk subscription update logic
- [ ] Add error handling and retry mechanisms

### Week 7-8: Notifications
- [ ] Implement notification service
- [ ] Create email templates
- [ ] Add notification scheduling

### Week 9-10: UI/UX Polish
- [ ] Enhance admin interface
- [ ] Add progress tracking
- [ ] Implement audit trail views

### Week 11-12: Testing & Compliance
- [ ] Comprehensive testing
- [ ] Legal review
- [ ] Documentation updates

## Risk Assessment

### High Risk
- **Customer Churn**: Price increases may cause subscription cancellations
- **Billing Errors**: Incorrect proration calculations could lead to customer disputes
- **Compliance Issues**: Failure to follow local laws could result in legal problems

### Medium Risk
- **Stripe Rate Limits**: Bulk operations may hit API rate limits
- **Data Consistency**: Complex operations could lead to inconsistent state
- **Performance**: Large subscriber bases could cause timeouts

### Low Risk
- **Technical Implementation**: Well-defined APIs and patterns
- **User Experience**: Clear UI/UX patterns already established

## Mitigation Strategies

### Customer Churn
- Implement gradual price increases
- Provide value-added features with price increases
- Offer grandfathering options for long-term customers

### Billing Errors
- Implement comprehensive testing
- Use Stripe's test mode extensively
- Provide manual override capabilities for edge cases

### Compliance Issues
- Legal review of all customer communications
- Implement region-specific compliance features
- Regular compliance audits

## Success Metrics

### Technical Metrics
- [ ] 99.9% success rate for subscription updates
- [ ] <5 second response time for impact analysis
- [ ] Zero data loss during price change operations

### Business Metrics
- [ ] <10% customer churn rate from price changes
- [ ] 95% customer notification delivery rate
- [ ] 100% compliance with local billing laws

### User Experience Metrics
- [ ] <2 clicks to initiate price change
- [ ] Clear preview of changes before execution
- [ ] Real-time status updates during execution

## Future Enhancements

### Phase 2 Features
- **A/B Testing**: Test different price points with subsets of customers
- **Dynamic Pricing**: Implement time-based or usage-based pricing changes
- **Customer Segmentation**: Different pricing strategies for different customer segments

### Phase 3 Features
- **Predictive Analytics**: Predict customer churn risk for price changes
- **Automated Optimization**: AI-driven price optimization
- **Multi-Currency Support**: Handle price changes across different currencies

## Conclusion

This feature will provide administrators with powerful tools to manage subscription pricing while maintaining customer trust and legal compliance. The phased approach ensures that each component is thoroughly tested before moving to the next phase, minimizing risk while delivering value incrementally.

The implementation should prioritize customer communication and consent, ensuring that price changes are transparent and fair. Technical implementation should focus on reliability and auditability, providing administrators with confidence in the system's operations.
