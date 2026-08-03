-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_escrowId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_offerId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_productId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "DealEvent" DROP CONSTRAINT "DealEvent_dealId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_escrowId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_openedById_fkey";

-- DropForeignKey
ALTER TABLE "DisputeEvent" DROP CONSTRAINT "DisputeEvent_disputeId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeEvidence" DROP CONSTRAINT "DisputeEvidence_disputeId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeMessage" DROP CONSTRAINT "DisputeMessage_disputeId_fkey";

-- DropForeignKey
ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "EscrowEvent" DROP CONSTRAINT "EscrowEvent_escrowId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_escrowId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_fromWalletId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_paymentRequestId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_toWalletId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_walletId_fkey";

-- DropForeignKey
ALTER TABLE "MarketOrder" DROP CONSTRAINT "MarketOrder_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "MarketOrder" DROP CONSTRAINT "MarketOrder_escrowId_fkey";

-- DropForeignKey
ALTER TABLE "MarketOrder" DROP CONSTRAINT "MarketOrder_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketOrder" DROP CONSTRAINT "MarketOrder_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "MarketOrder" DROP CONSTRAINT "MarketOrder_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "MarketRequest" DROP CONSTRAINT "MarketRequest_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "MarketRequest" DROP CONSTRAINT "MarketRequest_groupId_fkey";

-- DropForeignKey
ALTER TABLE "MarketRequest" DROP CONSTRAINT "MarketRequest_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_productId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "OrderEvent" DROP CONSTRAINT "OrderEvent_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRequest" DROP CONSTRAINT "PaymentRequest_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRequest" DROP CONSTRAINT "PaymentRequest_toUserId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- DropIndex
DROP INDEX "AuditLog_transactionId_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "transactionId";

-- AlterTable
ALTER TABLE "PlatformSettings" DROP COLUMN "escrowRulesJson",
DROP COLUMN "platformWalletUserId",
DROP COLUMN "walletRulesJson";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "requestId";

-- DropTable
DROP TABLE "BankingCapability";

-- DropTable
DROP TABLE "Deal";

-- DropTable
DROP TABLE "DealEvent";

-- DropTable
DROP TABLE "Dispute";

-- DropTable
DROP TABLE "DisputeEvent";

-- DropTable
DROP TABLE "DisputeEvidence";

-- DropTable
DROP TABLE "DisputeMessage";

-- DropTable
DROP TABLE "Escrow";

-- DropTable
DROP TABLE "EscrowEvent";

-- DropTable
DROP TABLE "FinancialTransaction";

-- DropTable
DROP TABLE "IdempotencyRecord";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "LedgerEntry";

-- DropTable
DROP TABLE "MarketOrder";

-- DropTable
DROP TABLE "MarketRequest";

-- DropTable
DROP TABLE "Offer";

-- DropTable
DROP TABLE "OrderEvent";

-- DropTable
DROP TABLE "PaymentProviderEvent";

-- DropTable
DROP TABLE "PaymentRequest";

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "Wallet";

